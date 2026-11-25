// These manifests mirror the files included by each extension's Makefile zip target.
const packages = {
  'gnome-menu': {
    packageName: 'gnome-menu-gcdias',
    uuid: 'gnome-menu@gcdias',
    summary: 'Configurable top-panel menus for GNOME Shell',
    description: 'Adds user-configurable menus to the GNOME Shell top panel.',
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
    packageName: 'gnome-tint-gcdias',
    uuid: 'gnome-tint@gcdias',
    summary: 'Wallpaper rotation and shell tinting for GNOME Shell',
    description: 'Changes the wallpaper and tints GNOME Shell to match its colors.',
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

function writeTextField(target, offset, length, value) {
  const bytes = encodeText(value);
  if (bytes.length > length)
    throw new Error(`Value is too long for archive field: ${value}`);

  target.set(bytes, offset);
}

function writeOctalField(target, offset, length, value) {
  const digits = value.toString(8);
  if (digits.length > length - 1)
    throw new Error('Value is too large for tar archive.');

  writeTextField(target, offset, length, `${digits.padStart(length - 1, '0')}\0`);
}

function splitTarPath(path) {
  if (encodeText(path).length <= 100)
    return { name: path, prefix: '' };

  for (let slash = path.lastIndexOf('/'); slash > 0; slash = path.lastIndexOf('/', slash - 1)) {
    const prefix = path.slice(0, slash);
    const name = path.slice(slash + 1);
    if (encodeText(prefix).length <= 155 && encodeText(name).length <= 100)
      return { name, prefix };
  }

  throw new Error(`File path is too long for a Debian package: ${path}`);
}

function createTar(entries) {
  const parts = [];

  for (const entry of entries) {
    const header = new Uint8Array(512);
    const { name, prefix } = splitTarPath(entry.path);

    writeTextField(header, 0, 100, name);
    writeOctalField(header, 100, 8, entry.mode ?? 0o644);
    writeOctalField(header, 108, 8, 0);
    writeOctalField(header, 116, 8, 0);
    writeOctalField(header, 124, 12, entry.contents.length);
    writeOctalField(header, 136, 12, Math.floor(Date.now() / 1000));
    header.fill(0x20, 148, 156);
    header[156] = 0x30;
    writeTextField(header, 257, 6, 'ustar\0');
    writeTextField(header, 263, 2, '00');
    writeTextField(header, 265, 32, 'root');
    writeTextField(header, 297, 32, 'root');
    writeTextField(header, 345, 155, prefix);

    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    writeTextField(header, 148, 6, checksum.toString(8).padStart(6, '0'));
    header[154] = 0;
    header[155] = 0x20;

    parts.push(header, entry.contents);
    const paddingLength = (512 - (entry.contents.length % 512)) % 512;
    if (paddingLength)
      parts.push(new Uint8Array(paddingLength));
  }

  parts.push(new Uint8Array(1024));
  return concatBytes(parts);
}

async function gzip(contents) {
  if (typeof CompressionStream === 'undefined')
    throw new Error('This browser does not support in-browser Debian package generation.');

  const stream = new Blob([contents])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function createArMember(name, contents) {
  const header = [
    `${name}/`.padEnd(16),
    `${Math.floor(Date.now() / 1000)}`.padEnd(12),
    '0'.padEnd(6),
    '0'.padEnd(6),
    '100644'.padEnd(8),
    `${contents.length}`.padEnd(10),
    '`\n',
  ].join('');

  if (encodeText(header).length !== 60)
    throw new Error(`Invalid Debian archive member header: ${name}`);

  const padding = contents.length % 2 ? new Uint8Array([0x0a]) : new Uint8Array();
  return [encodeText(header), contents, padding];
}

function createArArchive(members) {
  return concatBytes([
    encodeText('!<arch>\n'),
    ...members.flatMap(([name, contents]) => createArMember(name, contents)),
  ]);
}

function getVersion(metadata) {
  const version = metadata.version === undefined ? '1.0.0' : String(metadata.version);
  if (!/^[0-9][A-Za-z0-9.+:~-]*$/.test(version))
    throw new Error(`Invalid Debian package version in metadata: ${version}`);

  return version;
}

function createControlFiles(config, metadata, version) {
  const extensionPath = `/usr/share/gnome-shell/extensions/${metadata.uuid}`;
  const schemaPath = `${extensionPath}/schemas`;
  const control = [
    `Package: ${config.packageName}`,
    `Version: ${version}`,
    'Section: gnome',
    'Priority: optional',
    'Architecture: all',
    'Maintainer: GCDias <gcdias@users.noreply.github.com>',
    'Depends: gnome-shell, libglib2.0-bin',
    `Description: ${config.summary}`,
    ` ${config.description}`,
    '',
  ].join('\n');
  const postinst = [
    '#!/bin/sh',
    'set -e',
    `glib-compile-schemas '${schemaPath}'`,
    '',
  ].join('\n');
  const postrm = [
    '#!/bin/sh',
    'set -e',
    'case "$1" in',
    '  remove|purge)',
    `    schema_dir='${schemaPath}'`,
    '    if [ -d "$schema_dir" ]; then',
    '      rm -f "$schema_dir/gschemas.compiled"',
    '      rmdir "$schema_dir" 2>/dev/null || true',
    '    fi',
    '    ;;',
    'esac',
    '',
  ].join('\n');

  return [
    { path: 'control', contents: encodeText(control) },
    { path: 'postinst', contents: encodeText(postinst), mode: 0o755 },
    { path: 'postrm', contents: encodeText(postrm), mode: 0o755 },
  ];
}

async function fetchPackageFiles(config) {
  const files = await Promise.all(config.files.map(async (path) => {
    const url = new URL(`${config.id}/${path}`, document.baseURI);
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

  return { files, metadata, version: getVersion(metadata) };
}

async function buildDeb(config) {
  const { files, metadata, version } = await fetchPackageFiles(config);
  const extensionPath = `usr/share/gnome-shell/extensions/${metadata.uuid}`;
  const dataFiles = files.map((file) => ({
    path: `${extensionPath}/${file.path}`,
    contents: file.contents,
  }));
  const controlArchive = await gzip(createTar(createControlFiles(config, metadata, version)));
  const dataArchive = await gzip(createTar(dataFiles));
  const contents = createArArchive([
    ['debian-binary', encodeText('2.0\n')],
    ['control.tar.gz', controlArchive],
    ['data.tar.gz', dataArchive],
  ]);

  return {
    contents,
    filename: `${config.packageName}_${version}_all.deb`,
  };
}

function downloadPackage(filename, contents) {
  const url = URL.createObjectURL(new Blob([contents], {
    type: 'application/vnd.debian.binary-package',
  }));
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
    const config = packages[button.dataset.build];

    button.disabled = true;
    packageStatus.textContent = 'Fetching source files and building the Debian package…';

    try {
      if (!config)
        throw new Error('Unknown extension package.');

      const { contents, filename } = await buildDeb({ ...config, id: button.dataset.build });
      downloadPackage(filename, contents);
      installCommand.textContent = `sudo apt install ~/Downloads/${filename}`;
      copyButton.disabled = false;
      packageStatus.textContent = `Downloaded ${filename}. Install it with the command shown above.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      packageStatus.textContent = `Package generation failed: ${message}`;
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
      packageStatus.textContent = 'APT install command copied to clipboard.';
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
