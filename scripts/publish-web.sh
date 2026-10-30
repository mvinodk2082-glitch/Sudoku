#!/usr/bin/env bash
# Rebuild the web app and publish ONLY the built files to the public
# repo mvinodk2082-glitch/sudoku-play (served at
# https://mvinodk2082-glitch.github.io/sudoku-play/). Needs `gh` logged in.
# No source code, keystore or secrets are copied: just dist/ + 404.html + README.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
out=$(mktemp -d)
git clone -q https://github.com/mvinodk2082-glitch/sudoku-play.git "$out"
find "$out" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$out/"
cp dist/index.html "$out/404.html"      # SPA fallback for unknown paths
touch "$out/.nojekyll"
cp web-publish/README.md "$out/README.md"
cd "$out"
git add -A
git -c user.name="M Vinod Kumar" -c user.email="mvinodk2082@gmail.com" commit -qm "Publish web build $(date +%F)" || { echo "No changes"; exit 0; }
git push -q origin HEAD:main
echo "Published: https://mvinodk2082-glitch.github.io/sudoku-play/"
