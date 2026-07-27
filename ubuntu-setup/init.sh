#!/bin/bash

#set -x
function removedups(){
    local d=""
    local out=""
    while [ $1 ]; do
        if [[ -z "$(echo $out | grep $1)" ]]; then
            out+=" $1"
        fi
        shift
    done
    echo ${out}
}

a=($(sudo cat /boot/grub/grub.cfg | grep 'menuentry' | grep -oE '\-\-class [a-zA-Z_\-]+' | sed 's,\-\-class ,,g'))
grubEntries=($(removedups ${a[@]} | sed 's,os\|driver\|gnu-linux,,g'))
grubEntries=$(printf '%s,' "${grubEntries[@]}" | sed 's/,$//')

efiModes=($(xrandr -q | awk '{print $1}' | grep -oP '\d+x\d+'))
res=($(sed 's,x, ,g' <<<"${efiModes[@]}"));
efiModes=$(printf '%s,' "${efiModes[@]}" | sed 's/,$//')

osv="$(lsb_release -rs)"
osd="$(lsb_release -ds)"
os="$(echo $osd | awk '{print $1}')"
gnome="$(gnome-shell --version | grep -oP '\d\d')"

vnd="$(sed 's/.*/\L&/' /sys/devices/virtual/dmi/id/sys_vendor)"
case "${vnd,,}" in
  *besstar*)   vnd="minisforum";;
  *microsoft*) vnd="$(cat /sys/devices/virtual/dmi/id/product_family)";;
esac

microsoft-edge "https://gcdias.github.io/ubuntu-setup/index.html?usr=${USER}&vnd=${vnd}&w=${res[0]}&h=${res[1]}&m=${efiModes}&osv=${osv}&osd=${osd}&os=${os}&grub=${grubEntries}&gnome=${gnome}"


#set +x