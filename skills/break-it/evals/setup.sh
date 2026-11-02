#!/bin/sh
# Copy the eval app and its server into a new directory with a git repo of its own, away from
# this folder's README, so a break-it run there reads only the app. The directory must not exist.
#
#   sh setup.sh <dir>
set -e
here=$(cd "$(dirname "$0")" && pwd)
dir=$1
if [ -z "$dir" ]; then echo "usage: sh setup.sh <dir>"; exit 2; fi
if [ -e "$dir" ]; then echo "$dir exists; give a new directory"; exit 2; fi
mkdir -p "$dir"
cp -R "$here/app" "$dir/app"
cp "$here/server.py" "$dir/server.py"
cd "$dir"
git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.com commit -qm "Projects page"
echo "$dir: start it with  python3 $dir/server.py <port> <writes.log outside $dir>"
