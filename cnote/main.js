if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("/cnotes/serviceWorker.js")
      .then(res => console.log("service worker registered"))
      .catch(err => console.log("service worker not registered", err))
  })
}

const ui = {
  loadId: document.getElementById('load-note'),
  saveId: document.getElementById('save-note'),
  contentId: document.getElementById('t-content'),
  passwordInput: document.getElementById('input-password'),
  submitPassword: document.getElementById('submit-password'),
  init: function() {
    this.loadId.addEventListener('click', actions.loadNote);
    this.saveId.addEventListener('click', actions.saveNote);
    this.submitPassword.addEventListener('click', actions.setPassword);
  },
  requestPassword: function() {
    const pwd = prompt('Enter your password:');
    return pwd;
  }
}

const actions = {
  password: null,
  filename: null,
  setPassword: function() {
    actions.password = ui.passwordInput.value;
    alert('Password set!');
  },
  saveas: async function(content, fileName, contentType) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName, // Suggested default name
        types: [{
          description: 'CNote Files'
        }],
      });
      const writable = await fileHandle.createWritable(); // Create a writable stream
      await writable.write(content); // Write the new content
      await writable.close(); // Close the file and save changes
    } catch (err) {
      alert(`${err.name}: ${err.message}`);
    }
  },
  saveNote: function() {
    if (!actions.password) {
      actions.password = ui.requestPassword();
    }
    const content = ui.contentId.innerText;
    const encrypted = CryptoJS.AES.encrypt(content, actions.password).toString();
    if (!actions.filename) {
      actions.filename = prompt('Enter filename to save note:') || 'cnote.txt';
    }
    actions.saveas(encrypted,actions.filename, 'text/plain').then(() => {
        alert('Note saved securely!');
    }).catch(err => {
        console.error('Error saving note:', err);
    });
  },
  loadNote: function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
      const file = e.target.files[0];
      actions.filename = file.name;
      const reader = new FileReader();
      reader.onload = function(event) {
        const encrypted = event.target.result;
        let pw = localStorage.getItem(actions.filename.toLowerCase());
        if (!pw){
          pw = ui.requestPassword();
          if (confirm('Store this password for biometric unlock next time?'))
            localStorage.setItem(actions.filename.toLowerCase(), pw);
        }
        actions.password = pw;
        try {
          const decrypted = CryptoJS.AES.decrypt(encrypted, actions.password).toString(CryptoJS.enc.Utf8);
          ui.contentId.innerHTML = decrypted;
          alert('Note loaded successfully!');
        } catch (e) {
          alert('Failed to decrypt note. Check your password.');
        }
      }
      reader.readAsText(file);
    }
    input.click();
  }
}

function dowload(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], {type: contentType});
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

document.addEventListener('DOMContentLoaded', () => {
  ui.init();
});
