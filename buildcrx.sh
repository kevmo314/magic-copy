#!/bin/bash
#
# Build extension crx file automatically
# 
# Version: 0.0.1
# Author: kodango <dangoakachan@foxmail.com>
# Homepage: http://kodango.com/buildcrx
#

function usage()
{
    cat << EOF
Usage: `basename $0` [OPTIONS]

Options:
  -d     specify the extension directory, required
  -p     specify the pem file, optional
  -o     specify the output directory, optional
  -n     specify the build extension name, optional
  -e     specify the exclude pattern like grep, optional
  -h     show this help message
EOF
}

if [ $# -eq 0 ]; then
    usage
    exit
fi

while getopts ":d:p:o:n:e:h" opt; do
    case $opt in
        d)
            ext_dir=$OPTARG;;
        p)
            pem_file=$OPTARG;;
        o)
            output_dir=$OPTARG;;
        n)
            ext_name=$OPTARG;;
        e)
            exclude_pattern=$OPTARG;;
        h)
            usage;;
        \?)
            echo "[ERROR] Invalid option: -$OPTARG" >&2
            exit 1;;
        :)
            echo "[ERROR] Option -$OPTARG requires an argument." >&2
            exit 1;;
    esac
done

if [ ! -d "$ext_dir" ]; then
    echo "[ERROR] Extension directory '$ext_dir' doesn't exist!" >&2
    exit 1
fi

if [ ! -f "$pem_file" ]; then
    echo "[WARNING] Pem file doesn't exist, do you miss it?"
fi

if [ -z "$output_dir" ]; then
    output_dir="./output"
fi

if [ ! -d "$output_dir" ]; then
    mkdir -p $output_dir
fi

if [ -z "$ext_name" ]; then
    ext_name=`basename $ext_dir`
fi

cwd=`pwd`
build="$cwd/build"
build_ext="$build/$ext_name"

echo "[INFO] Crete build directory"
rm -rf $build
mkdir -p $build_ext

echo "[INFO] Copy extension files to build directory" && (
    cd $ext_dir

    if [ -n "$exclude_pattern" ]; then
        find . | grep -vE "$exclude_pattern" | cpio -pdm $build_ext 2>/dev/null
    else
        find . | cpio -pdm $build_ext
    fi
)

echo -n "[INFO] Search the current build version in manifest.json: "
version=`awk -F'"' '/"version"/{print $4}' $build_ext/manifest.json`
echo $version

echo -n "[INFO] Search the update url in manifest.json: "
update_url=`awk -F'"' '/"update_url"/{print $4}' $build_ext/manifest.json`
echo $update_url

if [ -n "$update_url" ]; then
    update_file="$output_dir/${update_url##*/}"
    curl --silent $update_url -o $update_file

    sed -i -r "s/(<updatecheck.*version=)[^ /]+/\1'$version'/" $update_file
    echo "[INFO] Update the version number in $update_file to $version"
fi

echo "[DEBUG] Package crx file with crxmake.sh script"

# Codes below are taken from crxmake.sh 
# http://code.google.com/p/chromium/issues/attachmentText?id=15059&aid=-2305436989939443553&name=crxmake.sh

crx="$output_dir/$ext_name.crx"
pub="$build/$ext_name.pub"
sig="$build/$ext_name.sig"
zip="$build/$ext_name.zip"

# zip up the crx dir
(cd "$build_ext" && zip -qr -9 -X "$zip" .)

# signature
openssl sha1 -sha1 -binary -sign "$pem_file" < "$zip" > "$sig"

# public key
openssl rsa -pubout -outform DER < "$pem_file" > "$pub" 2>/dev/null

# Take "abcdefgh" and return it as "ghefcdab"
function byte_swap () 
{
    echo "${1:6:2}${1:4:2}${1:2:2}${1:0:2}"
}

crmagic_hex="4372 3234" # Cr24
version_hex="0200 0000" # 2
pub_len_hex=$(byte_swap $(printf '%08x\n' $(ls -l "$pub" | awk '{print $5}')))
sig_len_hex=$(byte_swap $(printf '%08x\n' $(ls -l "$sig" | awk '{print $5}')))

(
    echo "$crmagic_hex $version_hex $pub_len_hex $sig_len_hex" | xxd -r -p
    cat "$pub" "$sig" "$zip"
) > "$crx"

echo "[INFO] $crx is packaged successfully"