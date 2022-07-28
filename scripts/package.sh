#!/bin/sh

if [[ $# -ne 2 ]]; then
   echo Usage: $0 name version	
   exit 1
fi

NAME=$1
VERSION=$2

zip -r $NAME-linux-x64-$VERSION.zip $NAME-linux-x64-$VERSION/* -x ".*"
zip -r $NAME-windows-x64-$VERSION.zip $NAME-windows-x64-$VERSION/* -x ".*"
zip -r $NAME-macos-universal-$VERSION.zip $NAME-macos-universal-$VERSION/* -x ".*"

