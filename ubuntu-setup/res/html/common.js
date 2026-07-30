/** url parameters
 * 
 * 'vnd': vendor, default: '',
 * 'w': resX, default: window.screen.width * window.devicePixelRatio,
 * 'h': resY, default: window.screen.height * window.devicePixelRatio,
 * 'usr': user, default: '',
 * 't': type, default: 'wallpaper',
 * 'id': id, default: Date.now().valueOf().toString(16),
 * 'grub_set': grubSet, default: 'grub-os-symb',
 * 'fstr': fstr, default: '',
 * 
 * 'pre': preset, default: 'dark',
 * 'pc': pattern_color, default: '#804000',
 * 'pa': pattern_alpha, default: '0.05',
 * 'gt': gradient_top, default: '#0d0704',
 * 'gb': gradient_bottom, default: '#03070d',
 * 'ga': gradient_alpha, default: '1.0',
 * 'lc': logo_color, default: '#d82000',
 * 'la': logo_alpha, default: '0.1',
 * 'fc': font_color, default: '#d82000',
 * 'fst': font_size_title, default: '40',
 * 'fsf': font_size_footer, default: '18',
 * 'fa': font_alpha, default: '0.5',
 * 'tity': title_y, default: 13,
 * 'foty': footer_y, default: 72,
 * 
 */

const urlParams = new URLSearchParams(window.location.search);

async function loadContent(tag) {
  let html = await fetchText(`html/ctrl-${tag}.html`);
  document.getElementById('control-extra').innerHTML = html;
  if (tag !== 'wallpaper'){
    html = await fetchText(`html/prev-${tag}.html`);
    document.getElementById('preview-extra').innerHTML = html;
  }
  // load script
  const script = document.createElement('script');
  script.src = `html/${tag}.js`;
  script.type = 'text/javascript';
  script.onload = init; // Executes when the script is loaded
  document.head.appendChild(script);
}

function encodeSvg(svg){
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function genSvg(){

  function spanText(id, y, fontSize, lineHeight) {
    const e = data.main[id];
    return e ? e.split('\n')
      .map((a,i) => '<tspan x="50%" y="'+ (y + (fontSize * lineHeight) * (1 + i)) + '">' + a + '</tspan>')
      .join('\n') : '';
  }

  function pos(d,r,l){
    return (1 + parseInt(d) / 50) * r/2 - l / 2 * preset.logo_scale
  }

  const preset = data.main;
  const y_title = preset.title_y / 100 * opts.resY;
  const y_footer = preset.footer_y / 100 * opts.resY;
  const title = spanText('title', y_title, preset.font_size_title, 1.2);
  const footer = spanText('footer', y_footer, preset.font_size_footer, 1.2);
  const font_stretch = `font-stretch='${preset.font_family.stretch}'`
  const logo_y = pos(preset.logo_dy, opts.resY, wallpaper.logoH); // (1 + parseInt(preset.logo_dy)/50) * opts.resY/2 - wallpaper.logoH / 2 * preset.logo_scale;
  const logo_x = pos(preset.logo_dx, opts.resX, wallpaper.logoW); // (1 + parseInt(preset.logo_dx)/50) * opts.resX/2 - wallpaper.logoW / 2 * preset.logo_scale;
  return eval("`" + wallpaper.svg + "`");
}

async function getIconBlob(name, format, width, height){
  const svg = genSvgIcon(name);
  const blob = format === 'svg' ? svg : await svg2image(svg, format, width, height);
  return blob.split(',')[1];
}

async function fetchBlob(url){
  const res = await fetch(url);
  const blob = await res.blob();
  const buff = await blob.arrayBuffer();
  return buff;
}

async function fetchText(url){
  const res = await fetch(url);
  const text = await res.text();
  return text;
}

async function fetchEval(url, fn){
  let text = await fetchText(url);
  if (fn) text = fn(text)
  const ret = eval("`" + text + "`"); 
  return ret;
}

async function getWpBlob(format, width, height){
  const blob = format === 'svg' ? genSvg() : await svg2image(genSvg(), format, width, height);
  return blob.split(',')[1];
}

async function svg2image(svg, format='png', width = opts.resX, height = opts.resY, isSvgEncoded=false) {
  const img = new Image();
  img.src = isSvgEncoded ? svg : encodeSvg(svg);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = [width, height];
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/" + format, 1.0);
}

async function loadBlob(url){
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]); // Extract Base64 part
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function exportResult(){
  exportMedia();
}

function render(){
  renderSvg();
}

function init(){
  // Add event listener for the render button
  button_export.addEventListener('click', exportResult);
  // Add event listeners to all inputs
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', render);
  });
  initComponents();
  wallpaper.init();
  
}

function xmlElement(name, value){
  const xml = document.createElement(name);
  xml.textContent = value;
  return xml;
}

// triple-state checkbox
function checkTripleStateCheckbox(){
  document.querySelectorAll("input[type=checkbox][id^=conf_]")
    .forEach(el => {
      el.state = 0;
      el.indeterminate = true;
      el.checked = true;
      el.onclick = () => {
        el.state = ++el.state % 3   // cycle through 0,1,2
        if (el.state == 0) {
            el.indeterminate = true;
            el.checked = true;   // after 'indeterminate' the state 'false' follows 
        }    
      }
    }
  );
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
  },
  replaceFill: function(src, newColor, all=false){
    return all ? src.replaceAll(/fill="#[0-9a-fA-F]+"/gi,"fill=\""+newColor+"\"") : 
                 src.replace(/fill="#[0-9a-fA-F]+"/,"fill=\""+newColor+"\"");
  }
}

const intro = {
  panel: document.getElementById('intro'),
  input: document.getElementById('intro-ctrl'),
  msgId: document.getElementById('intro-text'),
  vndId: document.getElementById('intro-vendor'),
  arId: document.getElementById('intro-ar'),
  ok: document.getElementById('intro-ok'),
  msg: "This site needs to access all installed fonts. Click «ok» to proceed. After exporting the zip file, run «install.sh»", 
  init: function(callback){
    this.panel.style.display = 'block';
    if (opts.vendor){
      this.input.style.display = 'none';
    } else {
      this.input.style.display = 'block';
      this.loadIntroOpts();
    }
    this.msgId.textContent = this.msg;
    this.ok.addEventListener('click', callback);
  },
  loadIntroOpts: function(){
    this.vndId.options.length = 0;
    opts.vndList.forEach(vnd => utils.addOption(this.vndId, vnd, vnd));
    this.vndId.addEventListener('change', () => {
      opts.vendor = this.vndId.value;
      wallpaper.reload();
      //renderSvg();
    });
    this.arId.addEventListener('change', () => {
      let a = this.arId.value === 'auto' 
        ? [ window.screen.width, window.screen.height ]
        : this.arId.value.split(':');
      opts.ar = a[1]/a[2];
      opts.resX = 2256;
      opts.resY = 2256 / this.arId.value;
    })
  }
}

const data = {
  main: {
    background_color: '#333',
    foreground_color: '#fff',
    pattern_color: '#888',
    pattern_alpha: '0.05',
    grad: ['#444', '#333','#FF0000','#00FF00','#0000FF','#FFFF00','#00FFFF','#FF00FF'],
    grad_alpha: '1.0',
    logo_color: '#fff',
    logo_alpha: '0.1',
    logo_scale: '1.0',
    logo_dx: '0',
    logo_dy: '0',
    font_color: '#fff',
    font_family: {},
    font_size_title: '40',
    font_size_footer: '22',
    font_alpha: '1.0',
    title: '',
    footer: '',
    title_y: 13,
    footer_y: 90,
    current: 'dark'
  },
  presets: {
    dark: {
      background_color: '#333',
      foreground_color: '#fff',
      grad: ['#0d0704', '#03070d','#FF0000','#00FF00','#0000FF','#FFFF00','#00FFFF','#FF00FF'],
      logo_alpha: '0.3',
      current: 'dark'
    },
    light: {
      background_color: '#ccc',
      foreground_color: '#333',
      grad: ['#d8d8d8', '#c0c6cc','#FF0000','#00FF00','#0000FF','#FFFF00','#00FFFF','#FF00FF'],
      logo_alpha: '0.1',
      current: 'light'
    },
  },  
  availableParameters: [ 
    {'pc':'pattern_color'}, {'patc':'pattern_color'},
    {'pa':'pattern_alpha'}, {'pata':'pattern_alpha'},
    {'ga':'grad_alpha'}, {'grada':'grad_alpha'},
    {'lc':'logo_color'}, {'logoc':'logo_color'},
    {'la':'logo_alpha'}, {'logoa':'logo_alpha'},
    {'fc':'font_color'}, {'fontc':'font_color'},
    {'fst':'font_size_title'}, {'titlesz':'font_size_title'},
    {'fsf':'font_size_footer'}, {'footersz':'font_size_footer'},
    {'fa':'font_alpha'}, {'fonta':'font_alpha'},
    {'tity':'title_y'}, {'titley':'title_y'},
    {'foty':'footer_y'}, {'footery':'footer_y'}
  ],
  readParams: function(urlParams){
    let pr = data.presets[urlParams.get('pre')] ?? data.main;
    if (urlParams.get('grad'))
      pr.grad = urlParams.get('grad').split(',');
    for (const param of this.availableParameters){
      const [key, pk] = Object.entries(param)[0];
      const val = urlParams.get(key);
      if (val){
        pr[pk] = val;
        document.getElementById(pk)?.setAttribute('value', val);
      }
    }
    let grad = urlParams.get('grad');
    if (grad){
      let array = grad.split(',');
      let out = [];
      array.forEach(a => {
        out.push(a.startsWith('#') ? a : `#${a}`);
      });
      data.main.grad = out;
    }
    let t = data.main.footer = urlParams.get('title');
    let f = data.main.footer = urlParams.get('footer');

    switch(opts.type){
      case 'grub':
        data.main.title  = t || "Choose an operating system to start";
        data.main.footer = f || "Use the up and down keys to select your choice. Press Enter to boot the selected OS, &#39;e&#39;; to edit the commands before booting or &#39;c&#39; for a command-line"
        break;
      case 'refind':
        data.main.title = t || "rEFInd boot menu";
        data.main.footer = f || "";
        break;
      default:
        data.main.title = t || "";
        data.main.footer = f || "";
        break;
    }
  },
  read: function(id){ //updatePreset(key)
    const val = document.getElementById(id).value;
    this.presets[this.main.current][id] = val;
    this.main[id] = val;
    return val;
  }
}

const wallpaper = {
  id: document.getElementById('img_preview'),
  vendor: document.getElementById('vendor'),
  vendor_colortype: document.getElementById('logo_colortype'),
  pattern_type: document.getElementById('pattern_type'),
  gradient_type: document.getElementById('gradient_type'),
  font_family: document.getElementById('font_family'),
 
  divlogo_color: document.getElementById('div-logo-color'),
  divGrad: document.getElementById('div-gradient'),
  gradColumns: 4,
  
  imgFormat: 'png',
  svg: '',
  logoW: 512,
  logoH: 512,
  logoCache: {},
  reloadKeys: ["pattern_type", "gradient_type", "vendor"],
  updateKeys: ["background_color", "pattern_color", "pattern_alpha", "grad_alpha", "logo_color", "logo_alpha", "logo_scale", "logo_dx", "logo_dy", "font_color", "font_size_title", "font_size_footer", "font_alpha", "title_y", "footer_y", "title", "footer"],

  init: async function() {
    wallpaper.vndInit();
    wallpaper.patInit();
    wallpaper.gradInit();
    wallpaper.fontInit();
    wallpaper.initReloadKeys();
    wallpaper.initUpdateKeys();

    wallpaper.reload();
  },
  fontInit: function(){
    data.main.font_family = fonts.defaultFont;
    wallpaper.font_family.addEventListener('input', () => {
      data.main.font_family = JSON.parse(wallpaper.font_family.value);
      renderSvg();
    });
    wallpaper.font_family.value = JSON.stringify(data.main.font_family);
  },
  patInit: function(){
    opts.patList.sort();
    const defPat = urlParams.get('pat');
    if (defPat)
      utils.addOption(wallpaper.pattern_type, defPat, 'auto');
    opts.patList.forEach(pat => utils.addOption(wallpaper.pattern_type, pat, pat));
    wallpaper.pattern_type.value = opts.pattern_type === '' ? 'none' : opts.pattern_type;
    wallpaper.pattern_type.addEventListener('change', (e) => {
      opts.pattern_type = wallpaper.pattern_type.value;
      wallpaper.reload();
    });
  },
  gradUpdateUI: function(){
    if (!wallpaper.divGrad || !wallpaper.gradCount) return;
    if (wallpaper.gradCount !== wallpaper.gradColumns){
      wallpaper.gradSetColumnsUI(Math.min(wallpaper.gradCount, wallpaper.gradColumns));
    }
    
    const grid = document.createElement('div')
    grid.classList.add('flex-grad-div');
    
    for (let i = 0; i < wallpaper.gradCount; i++) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('flex-grad');
      
      const label = document.createElement('label');
      label.htmlFor = `grad${i}`;
      label.textContent = `Color ${i + 1}`;

      const input = document.createElement('input');
      input.type = 'color';
      input.id = `grad${i}`;
      input.value = data.main.grad[i] || '#000000';
      input.classList.add('flex-grad-input');
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.id.replace('grad', ''));
        data.main.grad[idx] = e.target.value;
        wallpaper.update();
      });

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      grid.appendChild(wrapper);
    }
    wallpaper.divGrad.replaceChildren();
    grid.setAttribute('data-gradient-grid', 'true');
    wallpaper.divGrad.appendChild(grid);
  },
  gradSetColumnsUI: function(columns){
    wallpaper.gradColumns = columns;
    document.documentElement.style.setProperty("--grad-columns", columns);
  },
  gradInit: function(){
    opts.gradList.sort();
    const defGrad = urlParams.get('grad');
    if (defGrad)
      utils.addOption(wallpaper.gradient_type, defGrad, 'auto');
    opts.gradList.forEach(grad => utils.addOption(wallpaper.gradient_type, grad, grad));
    wallpaper.gradient_type.value = opts.gradient_type ? opts.gradient_type : 'none';
    wallpaper.gradient_type.addEventListener('change', (e) => {
      opts.gradient_type = wallpaper.gradient_type.value;
      wallpaper.reload();
    });
    wallpaper.gradUpdateUI();
  },
  vndInit: function(){
    opts.vndList.sort();
    const defVnd = urlParams.get('vnd');
    if (defVnd){
      utils.addOption(wallpaper.vendor, defVnd, 'auto');
      data.main.vendor = defVnd;
    }
    opts.vndList.forEach(vnd => utils.addOption(wallpaper.vendor, vnd, vnd));
    wallpaper.vendor_colortype.addEventListener('change', (e) => {
      opts.logo_colortype = wallpaper.vendor_colortype.value;
      wallpaper.reload();
    });

  },
  initReloadKeys:function(){
    wallpaper.reloadKeys.forEach(key => {
      const id = document.getElementById(key);
      if (id){
        id.value = data.main[key];
        id.addEventListener('input', wallpaper.reload);
      }
    });
  },
  initUpdateKeys:function(){
    wallpaper.updateKeys.forEach(key => {
      const id = document.getElementById(key);
      if (id){
        id.addEventListener('input', (e) => {
            data.main[key] = id.value;
            renderSvg();
        });
        id.value = data.main[key];
      }
    });
  },
  gradUpdate: async function(svg){
    let gradient = await fetchText(`gradients/grad_${opts.gradient_type}.svg`);
    let def = gradient.match(/<defs>([\s\S]*?)<\/defs>/i);
    let set = gradient.match(/<g id="grad">([\s\S]*?)<\/g>/i);
    def = def ? def[1].trim() : '';
    set = set ? set[1].trim() : '';
    if (def && set){
      wallpaper.gradCount = (def.match(/stop-color="/g) || []).length;
      for (let i = 0; i < wallpaper.gradCount; i++) {
        //const color = data.main.grad[i] || '#000000';
        let color = def.match(/stop-color="#([0-9a-fA-F]+)"/); 
        def = def.replace(/stop-color="#([0-9a-fA-F]+)"/, `stop-color='\${preset.grad[${i}]}'`);
        data.main.grad[i] = color && color[1] ? `#${color[1].trim()}` : data.main.grad[i];
      }
      wallpaper.gradUpdateUI();
      svg = svg.replace('<!--def-gradient-->', def);
      svg = svg.replace('<!--set-gradient-->', set);
    }
    return svg;
  },
  patUpdate: async function(svg){
    let pattern = await fetchText(`patterns/pat_${opts.pattern_type}.svg`);
    const def = pattern.match(/<defs>([\s\S]*?)<\/defs>/i);
    let svg_pat = def ? def[1].trim() : '';
    if (svg_pat){
      svg_pat = svg_pat.replaceAll(/fill="#[0-9a-fA-F]+"/gi,"fill='${preset.pattern_color}'")
      svg = svg.replace('<!--def-pattern-->', svg_pat);
      svg = svg.replaceAll('<!--set-pattern', '').replaceAll('set-pattern-->', '');
    }
    return svg;
  },
  reload: async function() {
    opts.vendor = wallpaper.vendor.value;
    let svg = await fetchText('html/wp-base.svg');
    if (opts.pattern_type && opts.pattern_type !== 'none'){
      svg = await wallpaper.patUpdate(svg);
    }
    if (opts.gradient_type && opts.gradient_type !== 'none'){
      svg = await wallpaper.gradUpdate(svg);
    }
    if (opts.vendor && opts.logo_colortype !== 'none'){
      let defDisplay = wallpaper.divlogo_color.style.display;
      wallpaper.divlogo_color.style.display = 'none';
      let logo = await fetchText(`icons/hw/${opts.vendor}.svg`);
      logo = await fetchText(`icons/hw/${opts.vendor}.svg`);
      [ , this.logoW, this.logoH ] = logo.match('viewBox="0 0 (.*?) (.*?)"');
      logo = logo.replace(/^<svg.*>/gi,'').replace(/<\/svg>/gi,'').trim();
      if (opts.logo_colortype === 'default'){
        logo = logo.replaceAll(/fill="#[0-9a-fA-F]+"/gi,"fill='${preset.font_color}'");
      } else if (opts.logo_colortype === 'custom'){
        wallpaper.divlogo_color.style.display = defDisplay;
        logo = logo.replaceAll(/fill="#[0-9a-fA-F]+"/gi,"fill='${preset.logo_color}'");
      }
      svg = svg.replace('<!--logo-data-->', logo);
    }
    wallpaper.svg = svg;
    render();
  },
  update: function(){
    renderSvg();
  },
  forEachKey: function(callback){
    this.keys = [];
    Object.keys(data.main).forEach(key => {
      let id = document.getElementById(key);
      if (id){
        this.keys.push(key);
        callback(key, id);
      }
    });
  },
  loadPreset: function(name){
    if (data.presets[name]){
      data.main = { ...data.main, ...data.presets[name] };
      // load ui values to preset
      wallpaper.forEachKey((key, id) => {
        id.value = data.main[key];
      });
      renderSvg();
    }
  },
}



const fonts = {
  select: document.getElementById('font_family'), 
  initCallback: null,
  weights: {
    "thin": 100,
    "extralight": 200,
    "ultralight": 200,
    "light": 300,
    "normal": 400,
    "medium": 500,
    "semibold": 600,
    "demibold": 600,
    "bold": 700,
    "extrabold": 800,
    "ultrabold": 800,
    "black": 900,
    "heavy": 900
  },
  sysFont:{
    family: 'sans',
    style: 'normal',
    name: 'default',
    weight: 400,
    stretch: 'normal'
  },
  defaultFont: {
    family: 'Ubuntu',
    style: 'normal',
    weight: 400,
    name: 'Ubuntu Regular',
    stretch: 'normal'
  },
  guess: function(font){
    const n = font.style.toLowerCase().replaceAll(' ','');
    let w = 400;
    Object.keys(this.weights).every(fw => {
      if (n.includes(fw)){
        w = this.weights[fw];
        return false
      }
      return true;
    });
    return {
      family: font.family,
      style: n.includes('italic') || n.includes('oblique') ? 'italic' : 'normal',
      name: font.fullName,
      weight: w,
      stretch: n.includes('condensed') ? 'condensed' : 'normal'
    };
  },
  setDefault: function(err=''){
    //intro.panel.style.background = '#f008';
    intro.panel.style.display = 'none';
    utils.addOption(fonts.select,JSON.stringify(this.defaultFont),"default");
    alert(err);
    data.presets.font_family = this.sysFont;
    //this.msgId.textContent.textContent = err;
  },
  init: function(){
    fonts.select.innerHTML = '';
    if ('queryLocalFonts' in window) {
      window.queryLocalFonts()
        .then((fnts) => {
          fnts.sort((a,b) => a.fullName.localeCompare(b.fullName));
          utils.addOption(fonts.select, JSON.stringify(fonts.defaultFont), fonts.defaultFont.name );
          fnts.forEach((font) => {
            const f = fonts.guess(font);
            utils.addOption(fonts.select, JSON.stringify(f), f.name );
          });
          fonts.select.options[0].select = 'selected';
          intro.panel.style.display = 'none';
          if (fonts.initCallback) fonts.initCallback();
      }).catch((err) => {
        fonts.setDefault("Error accessing local fonts:" + err);
      });
    } else {
      fonts.setDefault("Local Font Access API is not supported in this browser.");
    }
  }
}

/*  main  */

opts.readParams = function(){
  opts.id = urlParams.get('id') || Date.now().valueOf().toString(16);
  opts.type = urlParams.get('t') || urlParams.get('type') || 'wallpaper';
  opts.vendor = urlParams.get('vnd') || urlParams.get('vendor') || '';
  opts.user = urlParams.get('usr') || opts.user;
  opts.home = `/home/${opts.user}`;
  opts.resX = urlParams.get('w') || urlParams.get('width') || window.screen.width * window.devicePixelRatio;
  opts.resY = urlParams.get('h') || urlParams.get('height') || window.screen.height * window.devicePixelRatio;
  opts.grubSet = urlParams.get('grubset') || 'grub-os-symb';
  opts.ar = opts.resX / opts.resY;
  opts.ratio = 100 / window.screen.height / window.devicePixelRatio;
}

opts.readParams();
data.readParams(urlParams);

intro.init(fonts.init);

const button_export = document.getElementById('button_export');

const ui = {
  panelToggle: document.getElementById('panel-toggle'),
  controls: document.getElementById('controls'),
  preview: document.getElementById('preview'),
  adjustSize: document.getElementById('adjust-size'),
  init: function(){
    /* Panel Toggle Functionality for Mobile */
    ui.adjustSize?.addEventListener('change', (e) => {
        opts.ar = e.value ? window.devicePixelRatio : 1;
      });
    if (ui.panelToggle && ui.controls) {
      // Toggle panel on button click
      ui.panelToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        ui.controls.classList.toggle('collapsed');
      });

      // Close panel when clicking outside on mobile
      document.addEventListener('touch', (e) => {
        if (!ui.controls.contains(e.target) && !ui.panelToggle.contains(e.target)) {
          if (window.innerWidth <= 768) {
            ui.controls.classList.add('collapsed');
          }
        }
      });

      // Close panel on orientation change
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          if (window.innerWidth > 768) {
            ui.controls.classList.remove('collapsed');
          }
        }, 100);
      });

      // Handle window resize
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
          ui.controls.classList.remove('collapsed');
          ui.panelToggle.style.display = 'none';
        } else {
          ui.panelToggle.style.display = 'flex';
        }
      });

      // Initial state on load
      if (window.innerWidth > 768) {
        ui.panelToggle.style.display = 'none';
        ui.controls.classList.remove('collapsed');
      }
    }
  }
}

ui.init();
loadContent(opts.type);