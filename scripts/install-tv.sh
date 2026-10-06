#!/bin/sh
set -eu
if [ "$#" -ne 2 ]; then
  echo 'Usage: scripts/install-tv.sh DEVICE PACKAGE.ipk' >&2
  exit 2
fi
ares-install --device "$1" "$2"
ares-launch --device "$1" io.mn1701.lumen.tv
