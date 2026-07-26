#!/bin/bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
index_file="$script_dir/index.html"

function toJsArray(){
  local -n arr=$1
  local joined
  joined=$(printf '"%s", ' "${arr[@]}" | sed 's/, $//')
  printf '[%s]' "$joined"
}

function listNames(){
  local dir=$1
  local ext=$2
  local prefix=$3
  ls -1 "$dir" | grep ".*$ext$" | sed "s/$ext$//" | sed "s/^$prefix//"
}

# Example:
# gradArr=($(find ./gradients -type f -name "grad_*.svg" | sed 's/\.\/gradients\///' | sed 's/\.svg//'))
gradArr=($(listNames "$script_dir/gradients" .svg grad_))
gradList=$(toJsArray gradArr)

patArr=($(listNames "$script_dir/patterns" .svg pat_))
patList=$(toJsArray patArr)

vndArr=($(listNames "$script_dir/icons/hw" .svg ''))
vndList=$(toJsArray vndArr)

osArr=($(listNames "$script_dir/icons/grub-os-symb" .svg ''))
osList=$(toJsArray osArr)

python3 - "$index_file" "$patList" "$gradList" "$vndList" "$osList" <<'PY'
import pathlib
import re
import sys

index_path = pathlib.Path(sys.argv[1])
pat_list = sys.argv[2]
grad_list = sys.argv[3]
vnd_list = sys.argv[4]
os_list = sys.argv[5]

text = index_path.read_text()
replacements = {
    'patList': pat_list,
    'gradList': grad_list,
    'vndList': vnd_list,
    'osList': os_list,
}

for key, value in replacements.items():
    pattern = re.compile(rf'(?P<key>{re.escape(key)})\s*:\s*\[[^\]]*\]')
    new_text, count = pattern.subn(lambda m: f'{m.group("key")}: {value}', text, count=1)
    if count != 1:
        raise SystemExit(f'Could not update {key} in {index_path}')
    text = new_text

index_path.write_text(text)
PY

echo "Updated $index_file"
