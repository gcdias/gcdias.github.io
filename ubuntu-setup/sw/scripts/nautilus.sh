cat <<'EOF' > ~/.config/gtk-4.0/gtk.css
:root {
  --window-bg-color: #1e1e2e;
  --window-fg-color: #cdd6f4;
  --popover-bg-color: #1e1e2e;
  --popover-fg-color: #cdd6f4;
  --view-bg-color: #181825;
  --view-fg-color: #cdd6f4;
  --headerbar-bg-color: #11111b;
  --headerbar-fg-color: #cdd6f4;
  --sidebar-bg-color: #181825;
  --sidebar-fg-color: #cdd6f4;
}

window.nautilus-window {
  font-family: 'Ubuntu Sans';
  font-weight: 700;
  font-size: 10pt;
}

window.nautilus-window popover.menu {
  font-family: 'Ubuntu Sans';
  font-weight: 700;
  font-size: 10pt;
}
EOF

themename=$(zenity --title="Theme Name" --text="Enter the name of your theme:" --entry)
test -z "$themename" && exit 1
test -d ~/.themes/$themename || mkdir -p ~/.themes/$themename/gnome-shell
cat <<'EOF' > ~/.themes/$themename/gnome-shell/gnome-shell.css
.quick-settings {
  background-color: #1e1e2e;
}

.quick-toggle {
  background-color: #313244;
  color: #cdd6f4;
}

.quick-toggle:checked {
  background-color: #89b4fa;
  color: #1e1e2e;
}

.quick-slider {
  background-color: #313244;
}
EOF