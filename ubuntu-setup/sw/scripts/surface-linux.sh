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
function update_surface_grub(){
    local d="/boot"
    local a=$(find $d -name "vmlinuz-*surface*" 2>/dev/null | sort | tail -n 1 )
    if [ -z "$a" ]; then
        echo "No surface kernel found in $d"
        return 1
    fi
    local b="$d/$(basename $a)"
    local g="/etc/default/grub"
    if [ -z "$(cat $b | grep "GRUB_TOP_LEVEL")" ]; then
        echo "GRUB_TOP_LEVEL=$b" | sudo tee -a $g
    else
        sudo sed -i "s|^GRUB_TOP_LEVEL=.*|GRUB_TOP_LEVEL=$b|" $g
    fi
    sudo update-grub
    echo "GRUB_TOP_LEVEL set to $b"
}