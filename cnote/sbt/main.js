if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker
      .register("/sbt/serviceWorker.js")
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
    ui.panel.classList.remove('hidden');
    ui.updateOpenerVisibility();
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
  tag: "secpw",
  mobile: window.PublicKeyCredential !== undefined,

  // Helpers
  bufToB64: function(b){ return btoa(String.fromCharCode(...new Uint8Array(b))); },
  b64ToBuf: function(s){ return Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer; },
  str2ab: function(str){ return new TextEncoder().encode(str); },
  ab2str: function(ab){ return new TextDecoder().decode(ab); },
  async deriveKeyFromSignature(sig){
    const sigbuf = sig instanceof ArrayBuffer ? sig : sig.buffer || sig;
    const hash = await crypto.subtle.digest('SHA-256', sigbuf);
    return crypto.subtle.importKey('raw', hash, {name:'AES-GCM'}, false, ['encrypt','decrypt']);
  },

  // Create a platform credential and store the provided password encrypted to localStorage
  async createAndStorePassword(pwd){
    try{
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));
      const publicKey = {
        challenge: challenge,
        rp: { name: window.location.hostname },
        user: { id: userId, name: 'user', displayName: 'user' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { userVerification: 'required', authenticatorAttachment: 'platform' },
        timeout: 60000,
      };
      const cred = await navigator.credentials.create({ publicKey });
      if (!cred) return false;
      const id = auth.bufToB64(new Uint8Array(cred.rawId));

      // get assertion to derive a key (challenge must be provided again)
      const assert = await navigator.credentials.get({ publicKey: { challenge: challenge, allowCredentials: [{ id: cred.rawId, type: 'public-key', transports: ['internal'] }], userVerification: 'required', timeout:60000 } });
      const sig = assert.response.signature;
      const key = await auth.deriveKeyFromSignature(sig);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, auth.str2ab(pwd));
      const payload = { id, iv: auth.bufToB64(iv), data: auth.bufToB64(enc) };
      localStorage.setItem(auth.tag, JSON.stringify(payload));
      return true;
    }catch(e){ console.warn('createAndStorePassword failed', e); return false; }
  },

  // Retrieve stored password by asking for platform assertion and deriving same key
  async getStoredPassword(){
    try{
      const raw = localStorage.getItem(auth.tag);
      if (!raw){
        alert('localStorage failed');
        return null;
      }
      const payload = JSON.parse(raw);
      const credId = auth.b64ToBuf(payload.id);
      const challenge = auth.str2ab('auth-challenge');
      const publicKey = { challenge, allowCredentials: [{ id: credId, type: 'public-key', transports: ['internal'] }], userVerification: 'required', timeout:60000 };
      const assert = await navigator.credentials.get({ publicKey });
      if (!assert) {
        alert('Assertion failed');
        return null;
      }
      const sig = assert.response.signature;
      const key = await auth.deriveKeyFromSignature(sig);
      const iv = auth.b64ToBuf(payload.iv);
      const data = auth.b64ToBuf(payload.data);
      const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, data);
      return auth.ab2str(dec);
    }catch(e){
      alert("getStoredPassword" + e);
      return null;
    }
  },

  // Initialize availability
  init: function(){
    if (auth.mobile){
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(b => auth.mobile = b).catch(_=>auth.mobile=false);
    }
  },


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
    ui.sid.addEventListener('change', () => {
      let url = `https://${ui.ssrc.value}${data.jdata.src[ui.ssrc.value]}${ui.sid.value}`;
      console.log(url);
      ui.iframe.src = url;
    });

    ui.updateOpenerVisibility();

    // Toggle modal overlay when bottom dot or close button clicked
    ui.bload.addEventListener('click', () => {
      const isHidden = ui.panel.classList.contains('hidden') || getComputedStyle(ui.panel).display === 'none';
      if (isHidden){
        ui.panel.classList.remove('hidden');
        ui.panel.style.display = 'block';
        try{ ui.ssrc.focus(); }catch(e){}
      } else {
        ui.panel.classList.add('hidden');
        ui.panel.style.display = 'none';
      }
      ui.updateOpenerVisibility();
    });

    // Close button inside modal also toggles
    const closeBtn = document.getElementById('s-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      ui.panel.classList.add('hidden');
      ui.panel.style.display = 'none';
      ui.updateOpenerVisibility();
    });

    // Internal load file button
    const fileBtn = document.getElementById('s-file-load');
    if (fileBtn) fileBtn.addEventListener('click', () => { ui.loadCat(); });
  },
  loadCat: function(){
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async function(event) {
        const n = file.name.toLowerCase();
        let pw = localStorage.getItem(n);
        if (!pw){
          pw = ui.requestPassword();
          if (confirm('Store this password for biometric unlock next time?'))
            localStorage.setItem(n, pw);
        }
        try {
          const encrypted = event.target.result;
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
    ui.inactivityTimer = setTimeout(() => {}, ui.panelTimeout);
  }

  ,updateOpenerVisibility: function(){
    try{
      const isHidden = ui.panel.classList.contains('hidden') || getComputedStyle(ui.panel).display === 'none';
      ui.bload.style.display = isHidden ? 'block' : 'none';
    }catch(e){ /* ignore */ }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ui.init();
});
