const menu = {
  id: document.getElementById('os-panel-grub'),
  sizeId: document.getElementById("os_size"),
  renderCap: document.getElementById('grub_rendercap'),
  grubMenuX: document.getElementById('grub_menu_x'),
  grubMenuY: document.getElementById('grub_menu_y'),
  grubMenuW: document.getElementById('grub_menu_w'),
  grubMenuH: document.getElementById('grub_menu_h'),
  iconData: {},
  init: function(){
    opts.iconList = urlParams.get('grub')?.split(',') || [ 'ubuntu', 'windows', 'macosx' ];
    menu.loadData();
    menu.sizeId.addEventListener("change", menu.update);
    menu.renderCap.addEventListener("change", menu.update);
    menu.update();
    //setGrubWp();
  },
  import: async function(path){
    let svg = await fetchText(path);
    return svg.replaceAll(/fill="#[0-9a-fA-F]+"/gi,"fill=\"${preset.os_color}\"");
  },
  loadData: async function(){
    opts.scaleX = window.devicePixelRatio;
    opts.osList.push("uefi-firmware","memtest","restart","shutdown");
    menu.id.replaceChildren();
    opts.iconList.forEach(async os => {
      let div = `<div class="os-square-grub"><img id="img_${os}" alt="${os} Logo"/><div class="os-square-grub-label" id="grub-label-${os}">${os}</div></div>\n`;
      menu.id.innerHTML += div;
      menu.iconData[os] = await menu.import(`icons/${opts.grubSet}/${os}.svg`);
    });
    /*opts.iconList = [];
    this.id.querySelectorAll('[id^="img_"]')
      .forEach(async img => {
        let name = img.id.replace("img_","");
        opts.iconList.push(name);
        menu.iconData[name] = await menu.import(`icons/${opts.grubSet}/${name}.svg`);
      });
    */
  },
  update: function(rect){
    data.main.os_iconsize = menu.sizeId.value;
    data.main.os_iconsize_w = menu.sizeId.value;
    document.documentElement.style.setProperty("--os-size", data.main.os_iconsize / opts.ui_resize + "px");
    if (rect){
      if (rect.width === 0) rect.width = opts.resX;
      if (rect.height === 0) rect.height = opts.resY;
      
      let [x,y,w,h] = [menu.grubMenuX.value,menu.grubMenuY.value,menu.grubMenuW.value,menu.grubMenuH.value];
      menu.id.style.left = (rect.left + x / 100 * rect.width)  + 'px';
      menu.id.style.top  = (rect.top  + y / 100 * rect.height) + 'px';
      menu.id.style.width = w / 100 * rect.width + 'px';
      menu.id.style.height = h / 100 * rect.height + 'px';
      data.main.grub_menu_h = h + "%";
      data.main.grub_menu_w = w + "%";
      data.main.grub_menu_x = x + "%";
      data.main.grub_menu_y = y + "%";
    }
  },
}

function renderSvg(){
  const img_preview = document.getElementById('img_preview');
  img_preview.src = encodeSvg(genSvg());
  opts.img_rect = img_preview.getBoundingClientRect();
  opts.ui_resize = opts.img_rect.width > 0 ? opts.resX / opts.img_rect.width : 1;
  menu.update(opts.img_rect);
  updateIcons();
}

function updateIcons(){
  data.main.os_color = data.read('os_color');
  let label;
  if (menu.renderCap.checked){
    opts.w_icon = 8;
    label = 'none';
  } else {
    opts.w_icon = 1;
    label = 'flex';
    document.querySelectorAll('.os-square-grub-label').forEach(e => {
      e.style.fontFamily = data.main.font_family.family;
      e.style.fontStyle = data.main.font_family.style;
      e.style.fontWeight = data.main.font_family.weight;
      e.style.fontStretch = data.main.font_family.stretch;
      e.style.fontSize = data.main.os_iconsize / opts.ui_resize / 2 + 'px';
    });
  }

  data.main.os_iconsize = menu.sizeId.value * window.devicePixelRatio;
  data.main.os_iconsize_w = data.main.os_iconsize * opts.w_icon;
  data.main.grub_iconspace = data.main.os_iconsize_w / 4;
  data.main.grub_padding = data.main.grub_iconspace / 2;
  data.main.grub_spacing = data.main.grub_iconspace / 2;
  opts.w_icon *= 32;
  document.documentElement.style.setProperty("--os-size-w", (data.main.os_iconsize_w / opts.ui_resize) + "px");
  document.documentElement.style.setProperty("--os-size", (data.main.os_iconsize / opts.ui_resize) + "px");
  
  opts.iconList.forEach(icon => {
    if (menu.iconData[icon]){
      const svg = genSvgIcon(icon);
      document.getElementById(`img_${icon}`).src = encodeSvg(svg);
      document.getElementById(`grub-label-${icon}`).style.display = label;
    }
  });
}


const grub = {
  config: {
    grub_menu_x: 2,
    grub_menu_y: 32,
    grub_menu_w: 40,
    grub_menu_h: 40,
    item_color: '#ccc',
    icon_width: 64,
    icon_height: 64,
    item_height: 64,
    item_padding: 8,
    item_spacing: 8,
    item_icon_space: 16,
    selected_item_color: '#fff',
  },
  iconsz: 64,
  scale: 1,
  renderCap: false,
  defEntries: "ubuntu,windows,macosx,uefi-firmware,memtest,restart,shutdown",
  setGrubWp: async function () {
    let svg = '<g width="100%" height="100%">\n'
    let gos = (opts.grubEntries || grub.defEntries).split(',');
    grub.scale = (grub.config.icon_width / opts.resX * 5).toFixed(2);
    let n = 1;
    for(let n = 1; n < gos.length + 1; n++){
      svg += '<g transform="translate(${opts.resX * grub.config.grub_menu_x / 100} ${opts.resY * (grub.config.grub_menu_y * ' + n +' + grub.config.item_padding) / 100}) scale(${grub.scale})">\n';
      let icon = await fetchText(`icons/${opts.grubSet}/${gos[n-1]}.svg`);
      if (menu.renderCap.checked){
        let font = data.main.font_family;
        let font_size = data.main.os_iconsize / opts.ui_resize / 2;
        let cap_title = svg.match('<title>(.*?)</title>')[1];
        let t = '<text x="48" y="22.5" fill="${data.main.os_color}" font-family="${data.main.font_family}" font-style="${data.main.font.style}" font-stretch="${data.main.font.stretch}" font-size="${data.main.os_iconsize/opts.ui_resize/2}px" font-weight="${data.main.font_weight}">${cap_title}</text>';
        icon = icon.replaceAll("<!--text-here-->", t);
        //icon = icon.replaceAll("viewBox=\"0 0 32 32\"",`viewBox=\"0 0 ${opts.w_icon} 32\"`);
      }
      icon = icon.replaceAll(/fill="#[0-9a-fA-F]+"/gi,"fill=\"${preset.os_color}\"");
      svg += `${icon}\n</g>\n`;
    }
    svg +="</g>\n";
    wallpaper.svg = wallpaper.svg.replace('<!--extra-data-->',svg);    
  }
}


function genSvgIcon(name){
  //let svg = document.getElementById(`os_${name}`).textContent;
  let svg = menu.iconData[name];
  return svg = evalSvgIcon(svg);
}

function evalSvgIcon(svg){
  if (menu.renderCap.checked){
    let font = data.main.font_family;
    let font_size = data.main.os_iconsize / opts.ui_resize / 2;
    let cap_title = svg.match('<title>(.*?)</title>')[1];
    let t = `<text x="48" y="22.5" fill="${data.main.os_color}" font-family="'${font.family}'" font-style="'${font.style}'" font-stretch="'${font.stretch}'" font-size="${font_size}px" font-weight="'${font.weight}'">${cap_title}</text>`
    svg = svg.replaceAll("<!--text-here-->", t);
  }
  svg = svg.replaceAll("viewBox=\"0 0 32 32\"",`viewBox=\"0 0 ${opts.w_icon} 32\"`);
  const preset = data.main;
  return eval("`" + svg + "`");
}

async function exportMedia(){
  const zip = new JSZip();
  // add config grub
  zip.file("theme.txt", fetchEval("html/config-grub-theme.txt"));
  // add background
  zip.file('background.png', getWpBlob('png', opts.resX, opts.resY), { base64: true });
  // add os-icons
  for (os of opts.osList) {
    let svg = await fetchText(`icons/${opts.grubSet}/${os}.svg`);
    svg = svg.replaceAll(/fill="#[0-9a-fA-F]+"/gi,`fill="${data.main.os_color}"`);
    svg = evalSvgIcon(svg);
    const blob = await svg2image(svg, 'png', data.main.os_iconsize_w, data.main.os_iconsize);
    zip.file(`icons/${os}.png`, blob.split(',')[1], { base64: true });
  }
  // add grub-ui png
  opts.pngList.forEach(icon => {
    zip.file(`${icon}.png`, fetchBlob(`grub/${icon}.png`));
  });
  // generate zip
  const content = await zip.generateAsync({ type: "blob" });
  // download
  utils.downloadBlob(content, `theme-${opts.id}.zip`);

}

function initComponents(){
  opts.ui_resize = opts.ui_resize || 1;
  data.main.grub_padding = 8;
  data.main.grub_iconspace = 16;
  data.main.grub_spacing = 8;
  window.addEventListener('resize', renderSvg);
}

menu.init();