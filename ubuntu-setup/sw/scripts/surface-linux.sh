#!/bin/bash

# sources
# https://github.com/linux-surface/secureboot-mok
# https://github.com/linux-surface/linux-surface

wget -qO - https://raw.githubusercontent.com/linux-surface/linux-surface/master/pkg/keys/surface.asc | gpg --dearmor | sudo dd of=/etc/apt/trusted.gpg.d/linux-surface.gpg
echo "deb [arch=amd64] https://pkg.surfacelinux.com/debian release main" | sudo tee /etc/apt/sources.list.d/linux-surface.list

sudo apt update
sudo apt install linux-image-surface linux-headers-surface iptsd #libwacom-surface skip this if you're running gnome 50 or later

sudo apt install linux-surface-secureboot-mok

# shim=/boot/efi/EFI/ubuntu/shimx64.efi
# if [ -n "$(sbverify $shim --list | grep -oP 'Microsoft.*UEFI')" ] && [ -n "$(command -v refind-install)" ]; then
# refind-install --shim $shim --localkeys
# fi