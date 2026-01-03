if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("/old_h/sb-test/serviceWorker.js")
      .then(res => console.log("service worker registered"))
      .catch(err => console.log("service worker not registered", err))
  })
}

const data = {
  password: null,
  filename: null,
  jdata: null,
  addOpt: function(s, v, t = v){
    const option = document.createElement('option');
    option.value = v;
    option.text = t;
    s.appendChild(option);
  },
  load: function(obj){
    data.jdata = obj;
    // Populate selects
    const ssrc = ui.ssrc;
    ssrc.innerHTML = '';
    Object.keys(obj.src).forEach(src => data.addOpt(ssrc, src));
    data.upd();
    ui.panel.style.display = 'block';
    ui.panel.classList.toggle('hidden');
  },
  includeAny: function(i, tags){
    for (let t of tags){
      if (data.jdata.data[i] && data.jdata.data[i].includes(t)){
        return true;
      }
    }
    return false;
  },
  includeAll: function(i, tags){
    for (let t of tags){
      if (data.jdata.data[i] && !data.jdata.data[i].includes(t)){
        return false;
      }
    }
    return true;
  },
  upd: function(){
    const sid = ui.sid;
    const tag = ui.stag;
    sid.innerHTML = '';
    if (tag.innerText.trim() === ''){
      Object.keys(data.jdata.data).forEach(i => data.addOpt(sid, i, `${i} [${data.jdata.data[i]}]`));
    } else {
      const tags = tag.innerText.toLowerCase().trim().split(' ');
      const fn = `include${ui.sflt.value}`;
      const filtered = Object.keys(data.jdata.data).filter(i => data[fn](i, tags));
      filtered.forEach(i => data.addOpt(sid, i, `${i} [${data.jdata.data[i]}]`));
    }
  }
}

const auth = {
  bio: null,
  tag: "securepw",
  ep: null,

  init: function(){
    auth.ep = localStorage.getItem(auth.tag);
    if (!auth.ep){
      const pw = ui.requestPassword();
      auth.savePw(pw);
      auth.ep = localStorage.getItem(auth.tag);
    }
    auth.loadPw();
  },

  arrayBufferToBase64: function(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  },

  base64ToArrayBuffer: function(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  },

  getBiometricCredential: async function() {
    try {
      const publicKey = {
        challenge: new Uint8Array(32), // Random challenge in production
        rp: { name: "Secure App" },
        user: {
          id: new Uint8Array(16),
          name: "user@example.com",
          displayName: "User"
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
        attestation: "none"
      };

      // Create credential (first time)
      const credential = await navigator.credentials.create({ publicKey });
      return credential;
    } catch (err) {
      console.error("Biometric credential error:", err);
      throw err;
    }
  },

  // --- Encrypt password with AES-GCM ---
  encryptPassword: async function(password, key) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM IV
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(password)
    );
    return { iv: auth.arrayBufferToBase64(iv), data: auth.arrayBufferToBase64(encrypted) };
  },

  // --- Decrypt password ---
  decryptPassword: async function(encryptedObj, key) {
    const dec = new TextDecoder();
    const iv = auth.base64ToArrayBuffer(encryptedObj.iv);
    const data = auth.base64ToArrayBuffer(encryptedObj.data);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      data
    );
    return dec.decode(decrypted);
  },

  // --- Generate AES key (in real use, derive from biometric credential) ---
  generateAESKey: async function() {
    return crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },
  // --- Save password securely ---
  savePw: async function(password){
    try {
      await getBiometricCredential(); // Trigger biometric auth
      const key = await auth.generateAESKey();
      const encrypted = await auth.encryptPassword(password, key);
      localStorage.setItem(auth.tag, JSON.stringify(encrypted));
      auth.ep = encrypted;
      alert("Password saved securely!");
    } catch (err) {
      alert("Authentication failed or error occurred.");
    }
  },
  // --- Load password securely ---
  loadPw: async function(){
    try {
      await auth.getBiometricCredential(); // Trigger biometric auth
      const key = await auth.generateAESKey(); // In real use, retrieve same key
      const encrypted = JSON.parse(auth.ep);
      if (!encrypted) return alert("No password stored.");
      const password = await auth.decryptPassword(encrypted, key);
      auth.pw = password;
    } catch (err) {
      alert("Authentication failed or error occurred.");
    }
  }
}

const ui = {
  iframe: document.getElementById('iframe'),
  panel:  document.getElementById('m-top'),
  bload:  document.getElementById('s-load'),
  ssrc:   document.getElementById('s-src'),
  sid:    document.getElementById('s-id'),
  stag:   document.getElementById('s-tag'),
  sflt:   document.getElementById('s-flt'),
  inactivityTimer: null,
  panelTimeout: 5000,
  init: function(){
    document.addEventListener('mousemove', ui.resetInactivityTimer);
    document.addEventListener('keydown', ui.resetInactivityTimer);
    document.addEventListener('click', ui.resetInactivityTimer);
    document.addEventListener('touchstart', ui.resetInactivityTimer);
    ui.sid.addEventListener('change', () => {
      let url = `https://${ui.ssrc.value}${data.jdata.src[ui.ssrc.value]}${ui.sid.value}`;
      console.log(url);
      ui.iframe.src = url;
    });
    ui.stag.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        data.upd();
      }
    });
    ui.resetInactivityTimer();
    ui.bload.addEventListener('click', () => {
      ui.loadCat();
    });
  },
  loadCat: function(){
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = function(event) {
        auth.init();
        const encrypted = event.target.result;
        const pw = auth.pw || ui.requestPassword();
        try {
          const decrypted = CryptoJS.AES.decrypt(encrypted, pw).toString(CryptoJS.enc.Utf8);
          try {
            const j = JSON.parse(decrypted);
            data.load(j);
            ui.bload.style.display = 'none';
          } catch (e0) {
            alert(`Invalid cfg file ${e0.message}`);  
          }
        } catch (e) {
          alert('Something went wrong. Try again.');
        }
      }
      reader.readAsText(file);
    }
    input.click();

  },
  requestPassword: function() {
    const pwd = prompt('Enter your password:');
    return pwd;
  },

  resetInactivityTimer: function(){
    clearTimeout(ui.inactivityTimer);
    ui.panel.classList.remove('hidden');
    ui.inactivityTimer = setTimeout(() => {
      ui.panel.classList.add('hidden');
    }, ui.panelTimeout);
}
}

function setUrl(){
  ui.iurl.innerText = ui.iframe.contentWindow.location.href;
}

document.addEventListener('DOMContentLoaded', () => {
  ui.init();
});
