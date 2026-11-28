// These manifests mirror the files included by each extension's Makefile zip target.
const packages = {
  'gnome-menu': {
    uuid: 'gnome-menu@gcdias',
    filename: 'gnome-menu.zip',
    files: [
      'builtInActions.js',
      'extension.js',
      'metadata.json',
      'menu.json',
      'menuConfig.js',
      'prefs.js',
      'wpaConfig.js',
      'schemas/org.gnome.shell.extensions.gnome-menu.gschema.xml',
    ],
  },
  'gnome-tint': {
    uuid: 'gnome-tint@gcdias',
    filename: 'gnome-tint.zip',
    files: [
      'extension.js',
      'metadata.json',
      'prefs.js',
      'res/gnome-tint-color-symbolic.svg',
      'res/stylesheet.src',
      'res/gtk.css',
      'res/ptyxis.palette',
      'res/user.src',
      'utils/logger.js',
      'utils/utils.js',
      'wp/wp-engine.js',
      'wp/bing.js',
      'wp/picsum.js',
      'wp/wiki.js',
      'wp/nasa.js',
      'wp/wall.js',
      'schemas/org.gnome.shell.extensions.gnome-tint.gschema.xml',
    ],
  },
};

const encoder = new TextEncoder();
const crcTable = new Uint32Array(256);

for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[index] = value >>> 0;
}

function encodeText(value) {
  return encoder.encode(value);
}

function concatBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function crc32(contents) {
  let crc = 0xffffffff;
  for (const byte of contents)
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);

  return (crc ^ 0xffffffff) >>> 0;
}

function zipTimestamp() {
  const now = new Date();
  const year = Math.max(1980, now.getFullYear());

  return {
    date: ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(),
    time: (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2),
  };
}

function createZip(files) {
  if (files.length > 0xffff)
    throw new Error('Too many files for a standard ZIP archive.');

  const localRecords = [];
  const centralRecords = [];
  const { date, time } = zipTimestamp();
  let localOffset = 0;
  let centralSize = 0;

  for (const file of files) {
    const name = encodeText(file.path);
    const contents = file.contents;
    if (name.length > 0xffff || contents.length > 0xffffffff)
      throw new Error(`File is too large for a standard ZIP archive: ${file.path}`);

    const checksum = crc32(contents);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, contents.length, true);
    localView.setUint32(22, contents.length, true);
    localView.setUint16(26, name.length, true);
    localHeader.set(name, 30);
    localRecords.push(localHeader, contents);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 0x0314, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, contents.length, true);
    centralView.setUint32(24, contents.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(38, 0o100644 * 0x10000, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(name, 46);
    centralRecords.push(centralHeader);

    localOffset += localHeader.length + contents.length;
    centralSize += centralHeader.length;
  }

  if (localOffset > 0xffffffff || centralSize > 0xffffffff)
    throw new Error('The package is too large for a standard ZIP archive.');

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);

  return concatBytes([...localRecords, ...centralRecords, endRecord]);
}

async function fetchPackageFiles(id, config) {
  const files = await Promise.all(config.files.map(async (path) => {
    const url = new URL(`${id}/${path}`, document.baseURI);
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok)
      throw new Error(`Could not fetch ${path} (HTTP ${response.status}).`);

    return { path, contents: new Uint8Array(await response.arrayBuffer()) };
  }));
  const metadataFile = files.find((file) => file.path === 'metadata.json');
  if (!metadataFile)
    throw new Error('The extension package does not include metadata.json.');

  const metadata = JSON.parse(new TextDecoder().decode(metadataFile.contents));
  if (metadata.uuid !== config.uuid)
    throw new Error(`Unexpected extension UUID in metadata: ${metadata.uuid}`);

  return files;
}

function downloadZip(filename, contents) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

document.querySelectorAll('[data-build]').forEach((button) => {
  button.addEventListener('click', async () => {
    const card = button.closest('.card');
    const packageStatus = card.querySelector('[data-build-status]');
    const installCommand = card.querySelector('[data-install-command]');
    const copyButton = card.querySelector('[data-copy]');
    const id = button.dataset.build;
    const config = packages[id];

    button.disabled = true;
    packageStatus.textContent = 'Fetching source files and building the ZIP…';

    try {
      if (!config)
        throw new Error('Unknown extension package.');

      const files = await fetchPackageFiles(id, config);
      downloadZip(config.filename, createZip(files));
      installCommand.textContent = `gnome-extensions install ~/Downloads/${config.filename}`;
      copyButton.disabled = false;
      packageStatus.textContent = `Downloaded ${config.filename}. Install it with the command shown above.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      packageStatus.textContent = `ZIP generation failed: ${message}`;
    } finally {
      button.disabled = false;
    }
  });
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const card = button.closest('.card');
    const command = card.querySelector('[data-install-command]').textContent.trim();
    const packageStatus = card.querySelector('[data-build-status]');

    try {
      await navigator.clipboard.writeText(command);
      packageStatus.textContent = 'Install command copied to clipboard.';
    } catch {
      const selection = window.getSelection();
      if (!selection) {
        packageStatus.textContent = 'Clipboard access is unavailable. Select and copy the install command manually.';
        return;
      }

      const range = document.createRange();
      range.selectNodeContents(card.querySelector('[data-install-command]'));
      selection.removeAllRanges();
      selection.addRange(range);
      packageStatus.textContent = 'Clipboard access is unavailable. The command is selected; copy it with Ctrl+C.';
    }
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/gnome-extensions/serviceWorker.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
