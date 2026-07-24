settings.wallpaper = {
  type: 'day-night',
  list: {
    day: {
      grad_top: #333,
      grad_bot: #222,
      logo_color: #fff,
      font_color: #fff
    },
    night: {
      grad_top: #eee,
      grad_bot: #ddd,
      logo_color: #111,
      font_color: #111
    }, 
  },
};

settings.readMoreParams = function(urlParams){
  opts.ar = opts.resX / opts.resY;
opts.grubSet = opts.grubSet.replace("@grub_set",'') || "grub-os-symb";
opts.ratio = 100 / window.screen.height / window.devicePixelRatio;
opts.defFooter = urlParams.get('fstr') || `powered by ${opts.user}`;

}