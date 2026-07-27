const urlParams = new URLSearchParams(window.location.search);

const opts = {
  vndList: ["acer", "apple", "asus", "beelink", "corsair", "dell", "fujitsu", "geekom", "gigabyte", "google", "hp", "intel", "lenovo", "lg", "microsoft", "minisforum", "msi", "razer", "samsung", "surface", "toshiba", "vaio", "xiaomi"],
  osList: ["4MLinux", "AlpineLinux", "SystemRescueCD", "android", "anonymous", "antergos", "archlinux", "arcolinux", "artix", "blissos", "cancel", "centos", "chakra", "debian", "deepin", "devuan", "driver", "edit", "efi", "elementary", "endeavouros", "fedora", "freebsd", "gameros", "gentoo", "gnu-linux", "gpart", "haiku", "help", "kali", "kaos", "kbd", "korora", "kubuntu", "lang", "linuxmint", "lubuntu", "macosx", "mageia", "manjaro", "memtest", "mx-linux", "neon", "opensuse", "parrot", "peppermint", "pop-os", "puppy", "q4os", "recovery", "red", "regolith", "restart", "rocky", "shutdown", "siduction", "slackware", "solus", "sparky", "steamos", "submenu", "type", "tz", "ubuntu", "ubuntubudgie", "ubuntumate", "ubuntustudio", "uefi-firmware", "unset", "void", "windows", "windows10", "xubuntu", "zorin"],
}

const ui = {
  vendor: document.getElementById('vendor'),
  res: document.getElementById('res'),
  os: document.getElementById('os'),
  osv: document.getElementById('osv'),
  init: function(){
    this.vendor.replaceChildren();
    this.os.replaceChildren();
    
    opts.osList.forEach((os) => ui.addOption(ui.os,os,os));
    opts.vndList.forEach((vnd) => ui.addOption(ui.vendor,vnd,vnd));
    let modes = urlParams.get("m");
    if (modes){
      this.res.replaceChildren();
      modes.split(",")?.forEach(m => ui.addOption(ui.res,m,m));
    }
  },
  addOption: function(parent, val, txt){
    parent.appendChild(this.createOption(val, txt));
  },
  createOption: function(val, txt){
    const o = document.createElement('option');
    o.value = val;
    o.textContent = txt;
    return o;
  },
}



const utils = {
  addOption: function(parent, val, txt){
    parent.appendChild(this.createOption(val, txt));
  },
  createOption: function(val, txt){
    const o = document.createElement('option');
    o.value = val;
    o.textContent = txt;
    return o;
  },
  downloadBlob: function(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}


ui.init();