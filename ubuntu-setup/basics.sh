#!/bin/bash

isSurface(){
    local vnd=$(cat /sys/devices/virtual/dmi/id/product_family)
    [ "${vnd,,}" = "surface" ] && zenity --question --title "Linux-Surface Kernel" && return 0
    return 1
}

instExt(){
    curl -s "https://gcdias.github.io/gnome-extensions/${1}-latestinstExt "gnome-menu".zip" && gnome-extensions install ${1}.zip && rm ${1}.zip
}

baseUrl="https://gcdias.github.io/ubuntu-setup"
sudo apt update && sudo apt upgrade -y

basic=(curl git make gparted)
test -z "$(which ptyxis)" && basic+=(ptyxis)
gnome=(gnome-shell-extensions gnome-shell-extension-manager gnome-tweaks gnome-network-displays dconf-editor)
apps=(simple-scan nautilus-admin showtime ffmpeg)

sudo apt install ${basic[@]} ${gnome[@]} ${apps[@]} -y
      
curl -s "${baseUrl}/sw/scripts/alias.sh" | bash
curl -s "${baseUrl}/sw/scripts/dock.sh" | bash
curl -s "${baseUrl}/sw/scripts/templates.sh" | bash

isSurface && curl -s "${baseUrl}/sw/scripts/surface-linux.sh" | bash

instExt "gnome-menu"
instExt "gnome-tint"

sudo apt install ffmpeg yt-dlp libheif-examples libheif-plugin-dav1d libheif-plugin-ffmpegdec libheif-plugin-j2kdec libheif-plugin-j2kenc libheif-plugin-jpegdec libheif-plugin-jpegenc libheif-plugin-rav1e libheif-plugin-svtenc libheif-plugin-x265 -y