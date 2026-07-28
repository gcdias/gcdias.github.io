const urlParams = new URLSearchParams(window.location.search);

const opts = {
  vndList: ["acer", "apple", "asus", "beelink", "corsair", "dell", "fujitsu", "geekom", "gigabyte", "google", "hp", "intel", "lenovo", "lg", "microsoft", "minisforum", "msi", "razer", "samsung", "surface", "toshiba", "vaio", "xiaomi"],
  osList: ["4MLinux", "AlpineLinux", "SystemRescueCD", "android", "anonymous", "antergos", "archlinux", "arcolinux", "artix", "blissos", "cancel", "centos", "chakra", "debian", "deepin", "devuan", "driver", "edit", "efi", "elementary", "endeavouros", "fedora", "freebsd", "gameros", "gentoo", "gnu-linux", "gpart", "haiku", "help", "kali", "kaos", "kbd", "korora", "kubuntu", "lang", "linuxmint", "lubuntu", "macosx", "mageia", "manjaro", "memtest", "mx-linux", "neon", "opensuse", "parrot", "peppermint", "pop-os", "puppy", "q4os", "recovery", "red", "regolith", "restart", "rocky", "shutdown", "siduction", "slackware", "solus", "sparky", "steamos", "submenu", "type", "tz", "ubuntu", "ubuntubudgie", "ubuntumate", "ubuntustudio", "uefi-firmware", "unset", "void", "windows", "windows10", "xubuntu", "zorin"],
  grubPrev: []
}

const ui = {
  ids: [ "vnd", "res", "os", "osv", "gnome", "usr"],
  nav: [ "wp", "grub", "refind", "sw" ],
  init: function(){
    this.ids.forEach( (i) => {
      ui[i] = document.getElementById(i);
      opts[i] = urlParams.get(i)?.toLowerCase();
      if (opts[i]) ui[i].value = opts[i];
    });
    this.vnd.replaceChildren();
    opts.vndList.forEach((vnd) => ui.addOption(ui.vnd,vnd,vnd, vnd === opts.vnd));
    this.os.replaceChildren();
    opts.osList.forEach((os) => ui.addOption(ui.os,os,os, os.toLowerCase() === opts.os));
    let modes = urlParams.get("m");
    if (modes){
      this.res.replaceChildren();
      const defRes = `${window.screen.width}x${window.screen.height}`;
      ui.addOption(ui.res,defRes,defRes,true);
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

function navSw(){
  const url = `https://gcdias.github.io/ubuntu-setup/sw/index.html?usr=${opts.usr}&vnd=${opts.vnd}`;
  window.location.href = url;
}

function navWp(){
  const url = `https://gcdias.github.io/ubuntu-setup/res/index.html?usr=${opts.usr}&vnd=${opts.vnd}&t=wallpaper`;
  window.location.href = url;
}

function navGr(){
  const url = `https://gcdias.github.io/ubuntu-setup/res/index.html?usr=${opts.usr}&vnd=${opts.vnd}&t=grub`;
  window.location.href = url;
}

function navRf(){
  const url = `https://gcdias.github.io/ubuntu-setup/res/index.html?usr=${opts.usr}&vnd=${opts.vnd}&t=refind`;
  window.location.href = url;
}

function openUrl(url){
  window.location.href = url;
}

ui.init();