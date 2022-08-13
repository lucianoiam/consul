#!/bin/sh

PORT=8000
SCRIPT_DIR=`dirname -- "$0"`

open http://localhost:$PORT?dev=1
python3 -m http.server --directory $SCRIPT_DIR/../src/ui $PORT
