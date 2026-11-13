#!/bin/sh
# Builds the demo site into dist/ (or the folder given as the first argument).
#
#   sh scripts/build-site.sh
#
# ONETAG_KEY   the key the published pages use. The key is public by design and ends up in
#              the page like an analytics ID; the GitHub secret only keeps it out of the
#              repository history. Without it the placeholder stays: the pages then use the
#              localhost demo key on localhost and show the key entry screen elsewhere.
set -e
cd "$(dirname "$0")/.."
OUT=${1:-dist}
npx vite build --outDir "$OUT" --emptyOutDir
if [ -n "$ONETAG_KEY" ]; then
	for f in "$OUT"/assets/*.js; do
		if grep -q "YOUR_ONETAG_KEY" "$f"; then
			sed "s|YOUR_ONETAG_KEY|$ONETAG_KEY|g" "$f" > "$f.tmp" && mv "$f.tmp" "$f"
		fi
	done
else
	echo "No ONETAG_KEY: the pages keep the placeholder."
fi
echo "Site built in $OUT"
