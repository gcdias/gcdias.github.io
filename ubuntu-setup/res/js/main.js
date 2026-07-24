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

const settings = {
  id:      Date.now().valueOf().toString(16),
  vendor:  null,
  user:    null,
  resw:    window.screen.width,
  resh:    window.screen.height,
  modes:   [], 
  type:    'wallpaper',
  theme: {
    pattern_color: #804000,
    pattern_alpha: 0.05,
    grad_top: #0d0704,
    grad_bot: #03070d,
    grad_alpha: 1.0,
    logo_color: #d82000,
    logo_alpha: 0.1,
    font_color: #d82000,
    font_alpha: 0.1,
    font_sz_title: 40,
    font_sz_footer: 18,
    title: '',
    footer: 'powered by user',
    title_xp: 50,
    title_yp: 10,
    footer_xp:50,
    footer_yp:90,
  },

  init: function () {
    this.readSearchParams();    
  },

  readSearchParams: function(){
    const urlParams = new URLSearchParams(window.location.search);
    settings.id = urlParams.get('id') || Date.now().valueOf().toString(16),
    settings.type = urlParams.get('t') || urlParams.get('type') || 'wallpaper';
    settings.vendor = urlParams.get('v') || urlParams.get('vnd') || urlParams.get('vendor') ||  'default';
    settings.user = urlParams.get('u') || urlParams.get('usr') || urlParams.get('user') || 'user';
    settings.resw = urlParams.get('w') || urlParams.get('width') || window.screen.width * window.devicePixelRatio;
    settings.resh = urlParams.get('h') || urlParams.get('height') || window.screen.height * window.devicePixelRatio;
    let modes = urlParams.get('modes') || "1980x1080,1280x1024,1024x768,800x600";
    settings.modes = modes.split(',');
    if (settings.readMoreParams)
      settings.readMoreParams(urlParams);      
  }
}

settings.init();

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