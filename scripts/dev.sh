#!/bin/sh

PORT=3000
SCRIPT_DIR=`dirname -- "$0"`

open http://localhost:$PORT?dev=1
npx serve --symlinks --listen $PORT $SCRIPT_DIR/../src/ui

