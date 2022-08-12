#!/bin/sh

NAME=consul

if [[ $# -ne 1 ]]; then
    echo Usage: $0 version	
    exit 1
fi

echo "\033[0;33mNote: version must be manually updated in ConsulPlugin.cpp and ui.js\033[0m"
version=$1

case $(uname -s) in
    Linux*)
        arch=linux-x64
        ;;
    Darwin*)
        arch=macos-universal
        ;;
    MINGW*)
        arch=windows-x64
        ;;
esac

dist_dir=dist
rm -rf $dist_dir
mkdir $dist_dir

temp_bin_dir=/tmp/$NAME-bin
rm -rf $temp_bin_dir
mkdir -p $temp_bin_dir

echo "Building MIDI-only plugin (VST3 incompatible)"
cp src/DistrhoPluginInfo_vst2.h src/DistrhoPluginInfo.h
make clean && make PLUGIN_FORMAT=vst

if [ $arch = macos-universal ]; then
    cp -r bin/* $temp_bin_dir
else
    mkdir $temp_bin_dir/VST2
    cp -r bin/* $temp_bin_dir/VST2
fi

echo "Building MIDI + dummy audio I/O plugin (VST3 compliant)"
cp src/DistrhoPluginInfo_vst3.h src/DistrhoPluginInfo.h
make clean && make PLUGIN_FORMAT=vst3
cp -r bin/* $temp_bin_dir

repo_dir=$(pwd)
cd $temp_bin_dir
zip -r "$repo_dir/$dist_dir/$NAME-$arch-$version.zip" * -x "*.DS_Store"
cd $repo_dir

rm -rf $temp_bin_dir
rm src/DistrhoPluginInfo.h
