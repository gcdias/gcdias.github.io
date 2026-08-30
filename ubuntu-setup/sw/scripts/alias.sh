cat <<'EOF' > ~/.bash_aliases
#alias reboot-uefi='systemctl reboot --firmware-setup'
alias cls='clear'
alias upgrade='sudo apt update && sudo apt upgrade'
alias apt-upgrade='sudo apt update && sudo apt upgrade'
alias apt-clean='sudo apt clean && sudo apt autoremove'
alias sys-upgrade='sudo do-release-upgrade'
alias gedit='gnome-text-editor'
alias ged='gnome-text-editor'
alias edit='gnome-text-editor'

function reboot-win(){
    local winboot=$(efibootmgr -v | grep \*.*Windows | sed 's/\*//g;s/Boot//g' | awk '{print $1}')
    test -z "${winboot}" && echo "Windows boot entry not found." && return 1
    #sudo systemctl reboot --boot-loader-entry="${winboot}"
    echo -e "\e[1;93mWarning: Rebooting into Windows \e[0m(boot entry ${winboot}).\nPress \e[1;92mCtrl+C\e[0m to cancel or \e[1;92mpassword\e[0m to continue."
    sudo efibootmgr -n "${winboot}" 1>/dev/null
    systemctl reboot -i
}

function reboot-uefi(){
    echo -e "\e[1;93mWarning: Rebooting into UEFI firmware setup.\e[0m\nPress \e[1;92mCtrl+C\e[0m to cancel or \e[1;92mpassword\e[0m to continue."
    sudo systemctl reboot --firmware-setup
}

function git-config(){
    p=($(zenity --forms --text="Git Config" --add-entry="email" --add-entry="username" --add-combo="Scope" --combo-values="Local|Global" --separator=" "))
    test -z "${p[0]}" && echo "Email is required." && return 1
    test -z "${p[1]}" && echo "Username is required." && return 1
    case "${p[2],,}" in
        local)  git config user.email "${p[0]}" && git config user.name "${p[1]}" ;;
        global) git config --global user.email "${p[0]}" && git config --global user.name "${p[1]}" ;;
    esac
    echo "Git config updated."
}

function grub-theme(){
    local d="/boot/grub/themes"
    test ! -d "${d}" && echo "Grub themes directory not found." && return 1
    local c="/etc/default/grub"
    test ! -f "${c}" && echo "Grub config file not found." && return 1
    local a=($(ls ${d}))
    local theme=$(zenity --forms --text="Set Grub Theme" --add-combo="Theme" --combo-values="$(sed 's, ,|,g' <<<${a[@]})" --separator=" ")
    test ! -f "$d/$theme/theme.txt" && echo "Theme file not found." && return 1
    if grep -q "GRUB_THEME=" "${c}"; then
        sudo sed -i "s|GRUB_THEME=.*|GRUB_THEME=\"${d}/${theme}/theme.txt\"|g" "${c}"
    else
        echo "GRUB_THEME=\"${d}/${theme}/theme.txt\"" | sudo tee -a "${c}" >/dev/null
    fi
    sudo update-grub
    echo "Grub theme set to ${theme}."
}

function ffmpeg-avif() {
    test -z "$1" && echo "Usage: ffmpeg-avif [-r=remove original file] [<quality>] <file1> [file2 ...]" && return 1
    case "$1" in -r) rem=y; shift ;; esac
    test -n "$(grep -oP "\d+" <<<"${1}")" && args+=(-crf "${1}") && shift
    args=(-c:v libaom-av1 -crf ${qual:-28})
    for i in "$@"; do
        o=$(basename $i);
        o=${o%%\?*}
        o=${o/.*/.avif}
        ffmpeg -hide_banner -loglevel quiet -stats -i "${i}" "${args[@]}" "${o}" && case "${rem,,}" in y) rm "${i}" ;; esac
    done
}
alias ff-avif='ffmpeg-avif'

function ffmpeg-hevc() {
    test -z "$1" && echo "Usage: ffmpeg-hevc [-r=remove original file] [<quality>] <file1> [file2 ...]" && return 1
    case "$1" in -r) rem=y; shift ;; esac
    test -n "$(grep -oP "\d+" <<<"${1}")" && args+=(-crf "${1}") && shift
    args=(-c:v libx265 -crf ${qual:-28})
    for i in "$@"; do
        o=$(basename $i);
        o=${o%%\?*}
        o=${o/.*/-HEVC.mp4}
        echo "output ${o}"
        ffmpeg -hide_banner -loglevel quiet -stats -i "${i}" "${args[@]}" "${o}" && case "${rem,,}" in y) rm "${i}" ;; esac
    done
}
alias ff-hevc='ffmpeg-hevc'

function ffmpeg-cut() {
    test -z "$1" && echo "Usage: ffmpeg-cut [-r=remove original file] <start_time>[-<end_time>] <file1> [file2 ...]" && return 1
    case "$1" in -r) rem=y; shift ;; esac
    IFS='-' read -ra c <<< "$1"; shift
    args=(-c copy)
    test -n "$(grep -oP "\d{2}:\d{2}" <<<"${c[0]}")" && args+=(-ss "${c[0]}")
    test -n "$(grep -oP "\d{2}:\d{2}" <<<"${c[1]}")" && args+=(-to "${c[1]}")
    for i in "$@"; do
        o=$(basename $i);
        o=${o%%\?*}
        o=${o/.*/-cut.mp4}
        ffmpeg -hide_banner -i "${i}" "${args[@]}" "${o}" && case "${rem,,}" in y) rm "${i}" ;; esac
    done
}
alias ff-cut='ffmpeg-cut'

function ff-tag() {
    test -z "$1" && echo "Usage: ff-tag [-t|--tag tagname] <files>" && return 1
    local f=".*"
    case "$1" in -t|--tag) f="${2}=.*"; shift 2;; esac
    for i in "$@"; do
        echo -e "\n$(basename $i):"
        ffprobe -hide_banner -loglevel quiet -show_entries format_tags -show_entries stream_tags "$i" | grep -oE "$f"
    done
}

function alias-help(){
echo -e "Functions and alias added to your shell:

\e[1;92malias      :\e[0;2m reboot-uefi, reboot-win, cls, upgrade/apt-upgrade, apt-clean, sys-upgrade, gedit/edit\e[0m

\e[1;92mgit-config :\e[0;2m Configure Git user email and username via GUI.\e[0m
\e[1;92mff-avif:\e[0;2m Convert images to AVIF format using ffmpeg.\e[0m
\e[1;92mff-hevc:\e[0;2m Convert videos to HEVC format using ffmpeg.\e[0m
\e[1;92mff-cut :\e[0;2m Cut videos using ffmpeg.\e[0m
\e[1;92mff-tag     :\e[0;2m Show metadata tags of media files using ffprobe.\e[0m
"
}

echo -e "$(lsb_release -ds). Type \e[1;92malias-help\e[0m or press \e[1;92m<F12>\e[0m to show extra functions and alias.\n"
bind '"\e[24~":"alias-help\n"'
EOF
