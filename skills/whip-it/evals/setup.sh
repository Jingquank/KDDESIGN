#!/bin/sh
# Build a throwaway repo for one case: base/ committed on main, the case committed on the branch
# `invite` with the ask as its message, so /whip-it run there with no argument sees exactly
# the case's change. The directory must not exist yet.
#
#   sh setup.sh <case> <dir>        e.g.  sh setup.sh 9-align <scratch>/whip-9
set -e
here=$(cd "$(dirname "$0")" && pwd)
case=$1 dir=$2
if [ -z "$case" ] || [ -z "$dir" ]; then echo "usage: sh setup.sh <case> <dir>"; exit 2; fi
if [ ! -f "$here/cases/$case/index.html" ]; then echo "no case $case in $here/cases"; exit 2; fi
if [ -e "$dir" ]; then echo "$dir exists; give a new directory"; exit 2; fi
mkdir -p "$dir"
cd "$dir"
git init -q -b main
commit() { git -c user.name=eval -c user.email=eval@example.com commit -qm "$1"; }
cp "$here/base/index.html" index.html
git add index.html && commit "Members page"
git checkout -qb invite
cp "$here/cases/$case/index.html" index.html
git add index.html && commit "Members: invite people by email with a role, and list who is invited until they join"
echo "$dir: branch invite, case $case"
