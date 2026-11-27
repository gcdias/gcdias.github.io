schemas=$(gsettings list-schemas)

function setConf(){
  local schema=$1; shift
  local key;
  local val;
  if [ -n "$(grep "${schema}" <<<"${schemas}")" ]; then
    echo "Found extension ${schema}"
    while [ -n "$1" ]; do
      key="${1}"; shift
      val="${1}"; shift
      gsettings set "${schema}" "${key}" "${val}"
    done
  fi
}

setConf org.gnome.shell.extensions.dash-to-dock \
    transparency-mode 'FIXED' \
    apply-glossy-effect false \
    autohide-in-fullscreen true \
    background-color '#202030' \
    background-opacity 0 \
    dash-max-icon-size 32 \
    dock-fixed false \
    dock-position 'BOTTOM' \
    extend-height false \
    isolate-workspaces true \
    show-mounts false \
    show-trash false \
    multi-monitor true

setConf org.gnome.shell.extensions.ding \
  icon-size 'tiny' \
  keep-arranged true \
  keep-stacked true \
  show-network-volumes true \
  show-trash true \
  show-volumes true \
  start-corner 'top-right' \
  use-nemo true

setConf org.gnome.nautilus.preferences \
  show-create-link true \
  show-delete-permanently true \
  migrated-gtk-settings true

setConf org.gnome.TextEditor show-line-numbers true