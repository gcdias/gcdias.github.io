const urlParams = new URLSearchParams(window.location.search);

const opts = {
  vndList: ["acer", "apple", "asus", "beelink", "corsair", "dell", "fujitsu", "geekom", "gigabyte", "google", "hp", "intel", "lenovo", "lg", "microsoft", "minisforum", "msi", "razer", "samsung", "surface", "toshiba", "vaio", "xiaomi"],
  osList: ["4MLinux", "AlpineLinux", "SystemRescueCD", "android", "anonymous", "antergos", "archlinux", "arcolinux", "artix", "blissos", "cancel", "centos", "chakra", "debian", "deepin", "devuan", "driver", "edit", "efi", "elementary", "endeavouros", "fedora", "freebsd", "gameros", "gentoo", "gnu-linux", "gpart", "haiku", "help", "kali", "kaos", "kbd", "korora", "kubuntu", "lang", "linuxmint", "lubuntu", "macosx", "mageia", "manjaro", "memtest", "mx-linux", "neon", "opensuse", "parrot", "peppermint", "pop-os", "puppy", "q4os", "recovery", "red", "regolith", "restart", "rocky", "shutdown", "siduction", "slackware", "solus", "sparky", "steamos", "submenu", "type", "tz", "ubuntu", "ubuntubudgie", "ubuntumate", "ubuntustudio", "uefi-firmware", "unset", "void", "windows", "windows10", "xubuntu", "zorin"],
  grubPrev: []
}

const ui = {
  ids: [ "vnd", "res", "os", "osv", "gnome", "usr"],
  nav: [ "wp", "grub", "refind", "sw" ],
  init: async function(){
    if (urlParams.size === 0 && confirm('Download ubuntu-setup.sh and run it to collect hw info')){
      const t = await utils.fetchText("init.sh");
      utils.downloadText(t, "ubuntu-setup.sh");
    };
    this.ids.forEach( (i) => {
      ui[i] = document.getElementById(i);
      opts[i] = urlParams.get(i)?.toLowerCase();
      if (opts[i]) ui[i].value = opts[i];
      ui[i].addEventListener('change', () => {
        opts[i] = ui[i].value;
      });
    });
    this.grubEntries = urlParams.get('grub') || null;
    this.vnd.replaceChildren();
    opts.vndList.forEach((vnd) => ui.addOption(ui.vnd,vnd,vnd, vnd === opts.vnd));
    this.os.replaceChildren();
    opts.osList.forEach((os) => ui.addOption(ui.os,os,os, os.toLowerCase() === opts.os));

    this.res.replaceChildren();
    let modes = urlParams.get("m");
    let res = [ (window.screen.width * window.devicePixelRatio).toFixed(0),(window.screen.height * window.devicePixelRatio).toFixed(0) ];
    const defRes = `${res[0]}x${res[1]}`;
    ui.addOption(ui.res,defRes,defRes,true);
    if (modes){
      modes.split(",")?.forEach(m => ui.addOption(ui.res,m,m));
    }
    
    this.nav.forEach((nav) => {
      const id = document.getElementById(`web-${nav}`);
      id.addEventListener('click', () => {
        ui.navTo(nav === 'sw' ? 'sw' : 'res', nav === 'wp' ? 'wallpaper' : nav === 'sw' ? null : nav);
      })
    });
  },
  navTo: function(page,type){
    type = type ? `&t=${type}` : '';
    let res = ui.res.value.split('x');
    let url = `https://gcdias.github.io/ubuntu-setup/${page}/index.html?usr=${opts.usr}&vnd=${opts.vnd}&w=${res[0]}&h=${res[1]}${type}`
    if (type !== 'wp' && ui.grubEntries) url += `&grub=${ui.grubEntries}`;
    window.location.href = url;
  },
  addOption: function(parent, val, txt, sel){
    const o = this.createOption(val, txt, sel);
    parent.appendChild(o);
    if (sel)
      parent.value = val;
  },
  createOption: function(val, txt, sel){
    const o = document.createElement('option');
    o.value = val;
    o.textContent = txt;
    if (sel)
      o.selected = true;
    return o;
  },
}

const utils = {
  fetchText: async function(url){
    const res = await fetch(url);
    const text = await res.text();
    return text;
  },
  download: function(encodedUrl, filename){
    const a = document.createElement('a');
    a.href = encodedUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
  downloadBlob: function(blob, filename) {
    this.download(URL.createObjectURL(blob));
  },
  downloadText: function(text, filename){
    this.download(`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`, filename);
  }
}

ui.init();