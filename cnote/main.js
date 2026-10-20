if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/cnote/serviceWorker.js").catch(error => {
      console.error("Service worker registration failed:", error);
    });
  });
}

const elements = {
  newButton: document.getElementById("new-note"),
  openButton: document.getElementById("open-note"),
  saveButton: document.getElementById("save-note"),
  title: document.getElementById("note-title"),
  content: document.getElementById("note-content"),
  wordCount: document.getElementById("word-count"),
  saveStatus: document.getElementById("save-status"),
  stateDot: document.getElementById("state-dot"),
  filePicker: document.getElementById("file-picker"),
  passwordDialog: document.getElementById("password-dialog"),
  passwordForm: document.getElementById("password-form"),
  passwordInput: document.getElementById("note-password"),
  passwordError: document.getElementById("password-error"),
  dialogTitle: document.getElementById("dialog-title"),
  dialogDescription: document.getElementById("dialog-description"),
  confirmPassword: document.getElementById("confirm-password"),
  cancelPassword: document.getElementById("cancel-password")
};

const cryptoSettings = {
  format: "cnote",
  version: 1,
  iterations: 310000
};

const state = {
  password: null,
  filename: null,
  dirty: false,
  passwordResolver: null
};

function setStatus(message, isError = false) {
  elements.saveStatus.textContent = message;
  elements.stateDot.classList.toggle("is-error", isError);
}

function updateWordCount() {
  const content = elements.content.value.trim();
  const count = content ? content.split(/\s+/).length : 0;
  elements.wordCount.textContent = `${count} ${count === 1 ? "word" : "words"}`;
}

function markDirty() {
  state.dirty = true;
  elements.stateDot.classList.add("is-dirty");
  setStatus("Unsaved changes");
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function deriveKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptNote(password) {
  if (!window.crypto?.subtle) {
    throw new Error("Secure encryption is unavailable. Open CNote over HTTPS or on localhost.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, cryptoSettings.iterations);
  const note = JSON.stringify({
    title: elements.title.value,
    content: elements.content.value
  });
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(note)
  );

  return JSON.stringify({
    format: cryptoSettings.format,
    version: cryptoSettings.version,
    kdf: "PBKDF2-SHA-256",
    iterations: cryptoSettings.iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  }, null, 2);
}

async function decryptNote(serialized, password) {
  let envelope;
  try {
    envelope = JSON.parse(serialized);
  } catch {
    return decryptLegacyNote(serialized, password);
  }

  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new Error("This file is not a supported CNote note.");
  }
  if (envelope.format !== cryptoSettings.format) {
    return decryptLegacyNote(serialized, password);
  }
  if (envelope.version !== cryptoSettings.version || envelope.kdf !== "PBKDF2-SHA-256") {
    throw new Error("This CNote file version is not supported.");
  }
  if (!Number.isInteger(envelope.iterations) || envelope.iterations < 100000 || envelope.iterations > 1000000) {
    throw new Error("This CNote file has invalid encryption settings.");
  }
  if (!window.crypto?.subtle) {
    throw new Error("Secure decryption is unavailable. Open CNote over HTTPS or on localhost.");
  }

  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const ciphertext = base64ToBytes(envelope.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) {
      throw new Error("Invalid encrypted note data.");
    }
    const key = await deriveKey(password, salt, envelope.iterations);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    const note = JSON.parse(new TextDecoder().decode(plaintext));
    if (typeof note.title !== "string" || typeof note.content !== "string") {
      throw new Error("Invalid note contents.");
    }
    return note;
  } catch (error) {
    if (error instanceof Error && error.message === "This CNote file version is not supported.") {
      throw error;
    }
    throw new Error("Could not unlock this note. Check the password and try again.");
  }
}

function decryptLegacyNote(serialized, password) {
  if (!window.CryptoJS?.AES) {
    throw new Error("Legacy notes need the decryption library, which is unavailable offline.");
  }
  try {
    const plaintext = CryptoJS.AES.decrypt(serialized, password).toString(CryptoJS.enc.Utf8);
    if (!plaintext) {
      throw new Error("Could not unlock this note. Check the password and try again.");
    }
    return { title: "", content: plaintext };
  } catch {
    throw new Error("Could not unlock this note. Check the password and try again.");
  }
}

function requestPassword(mode, errorMessage = "") {
  elements.passwordInput.value = "";
  elements.passwordError.textContent = errorMessage;
  elements.dialogTitle.textContent = mode === "save" ? "Create a note password" : "Unlock your note";
  elements.dialogDescription.textContent = mode === "save"
    ? "Choose a password. You will need it to open this encrypted file."
    : "Enter the password used to encrypt this note.";
  elements.confirmPassword.textContent = mode === "save" ? "Encrypt note" : "Unlock note";
  elements.passwordInput.autocomplete = mode === "save" ? "new-password" : "current-password";
  elements.passwordDialog.showModal();
  elements.passwordInput.focus();
  return new Promise(resolve => {
    state.passwordResolver = resolve;
  });
}

function finishPasswordRequest(password) {
  if (!state.passwordResolver) {
    return;
  }
  const resolve = state.passwordResolver;
  state.passwordResolver = null;
  elements.passwordDialog.close();
  resolve(password);
}

elements.passwordForm.addEventListener("submit", event => {
  event.preventDefault();
  const password = elements.passwordInput.value;
  if (!password) {
    elements.passwordError.textContent = "Enter a password to continue.";
    return;
  }
  finishPasswordRequest(password);
});

elements.cancelPassword.addEventListener("click", () => finishPasswordRequest(null));
elements.passwordDialog.addEventListener("cancel", event => {
  event.preventDefault();
  finishPasswordRequest(null);
});

async function saveNote() {
  let password = state.password;
  if (!password) {
    password = await requestPassword("save");
    if (!password) {
      return;
    }
  }

  try {
    const encrypted = await encryptNote(password);
    const title = elements.title.value.trim() || "cnote";
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, "-").replace(/\.+$/g, "") || "cnote";
    const filename = state.filename || `${safeTitle}.cnote`;
    const blob = new Blob([encrypted], { type: "application/vnd.cnote+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.password = password;
    state.filename = filename;
    state.dirty = false;
    elements.stateDot.classList.remove("is-dirty", "is-error");
    setStatus("Encrypted file downloaded");
  } catch (error) {
    console.error("Could not save note:", error);
    setStatus(error.message || "Could not encrypt this note.", true);
  }
}

async function openSelectedFile(file) {
  if (!file) {
    return;
  }
  try {
    const serialized = await file.text();
    let note;
    while (true) {
      const password = await requestPassword("open");
      if (!password) {
        return;
      }
      try {
        note = await decryptNote(serialized, password);
        state.password = password;
        break;
      } catch (error) {
        if (error.message !== "Could not unlock this note. Check the password and try again.") {
          throw error;
        }
        elements.passwordError.textContent = error.message || "Could not unlock this note.";
      }
    }
    elements.title.value = note.title || file.name.replace(/\.[^.]+$/, "");
    elements.content.value = note.content;
    state.filename = file.name;
    state.dirty = false;
    elements.stateDot.classList.remove("is-dirty", "is-error");
    setStatus("Encrypted note opened");
    updateWordCount();
  } catch (error) {
    console.error("Could not open note:", error);
    setStatus(error.message || "Could not open this note.", true);
  } finally {
    elements.filePicker.value = "";
  }
}

function createNewNote() {
  if (state.dirty && !window.confirm("Discard unsaved changes?")) {
    return;
  }
  elements.title.value = "";
  elements.content.value = "";
  state.password = null;
  state.filename = null;
  state.dirty = false;
  elements.stateDot.classList.remove("is-dirty", "is-error");
  setStatus("New note");
  updateWordCount();
  elements.title.focus();
}

elements.newButton.addEventListener("click", createNewNote);
elements.openButton.addEventListener("click", () => {
  if (!state.dirty || window.confirm("Discard unsaved changes and open another note?")) {
    elements.filePicker.click();
  }
});
elements.saveButton.addEventListener("click", saveNote);
elements.filePicker.addEventListener("change", () => openSelectedFile(elements.filePicker.files[0]));
elements.title.addEventListener("input", markDirty);
elements.content.addEventListener("input", () => {
  markDirty();
  updateWordCount();
});

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveNote();
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
    event.preventDefault();
    createNewNote();
  }
});

window.addEventListener("beforeunload", event => {
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});

updateWordCount();
