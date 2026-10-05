#!/bin/bash

# 1. add reboot and shutdown menu entries to grub2 custom file
a=($(sudo ls /etc/grub.d/*_custom))
f=
for i in "${a[@]}"; do
	test -n "$(grep 'exec tail' "$i")" && f="$i"
done

if [[ -z "$f" ]]; then
	echo "No grub2 custom file found"
	exit 1
fi

function insertMenu(){
 local class=$1
 local command=$2
 local file=$3
 if [[ -z "$(grep '\-\-class '$class' \-\-class os' "$f")" ]]; then
sudo cat <<EOF >> "$file"

menuentry '$class' --class $class --class os {
	$command
}
EOF
 echo "Added $class menu entry to $file"
 fi
}

if [[ -z "$(grep '\-\-class restart \-\-class os' "$f")" ]]; then
sudo cat <<'EOF' >> "$f"

menuentry 'Reboot' --class restart --class os {
	reboot
}
EOF
echo "Added reboot menu entry to $f"
fi

if [[ -z "$(grep '\-\-class shutdown \-\-class os' "$f")" ]]; then
sudo cat <<'EOF' >> "$f"

menuentry 'Shutdown' --class shutdown --class os {
	halt
}
EOF
echo "Added shutdown menu entry to $f"
fi

# 2. Add grub2 drive icon to "Advanced options for..." menu entry
function checkSubmenu(){
	for i in $(find /etc/grub.d -name '*'$1''); do
		case $i in *backup*);;
			*) sudo sed -i '/submenu/ { /Advanced options for/ s/\\\$menuentry_id_option/--class driver \\\$menuentry_id_option/ }' $i && \
			echo "Added grub2 drive icon to $i"
			;;
		esac;
	done
}
checkSubmenu "linux"
checkSubmenu "os-prober"

# 3. Add grub2 drive icon to "UEFI Firmware Settings" menu entry
efi_fw=$(find /etc/grub.d -name '*_uefi-firmware')
if [[ -f "$efi_fw" ]]; then
	sudo sed -i '/menuentry/ { s/\\\$menuentry_id_option/--class efi \\\$menuentry_id_option/ } ' $efi_fw && \
	echo "Added grub2 drive icon to $efi_fw"
fi

# 4. Set "Memory test" menu entry to the end
mem_test=$(find /etc/grub.d -name '*_memtest86+')
if [[ -f "$mem_test" ]]; then
	sudo mv "$mem_test" /etc/grub.d/99_memtest86+ && \
	echo "Set $mem_test to the end"
fi
