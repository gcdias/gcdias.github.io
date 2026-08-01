#!/bin/bash
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
fi

if [[ -z "$(grep '\-\-class shutdown \-\-class os' "$f")" ]]; then
sudo cat <<'EOF' >> "$f"

menuentry 'Shutdown' --class shutdown --class os {
	halt
}
EOF
fi