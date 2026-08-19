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
for i in $(find /etc/grub.d -name '*os-prober'); do
	case $i in *backup*);;
		*)
			a='"Advanced options for %s"'
			b='"${OS} $onstr"'
			sudo sed -i "s/$a $b/$a \-\-class driver $b/g" $i && echo "Added grub2 drive icon to $i"
		;;
	esac;
done