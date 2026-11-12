#!/usr/bin/env bash
# Fetch OSM data ~1.5 km around 1260 5th St, Brandon MB from the Overpass API.
set -u
OUT="$(dirname "$0")/../reference/map/brandon.osm.json"
Q='[out:json][timeout:120];(way(49.8300,-99.9750,49.8600,-99.9300););(._;>;);out body;'
for i in $(seq 1 ${TRIES:-40}); do
  code=$(curl -sS -m 250 --compressed -A "osm-game-importer/1.0" -o "$OUT.tmp" --data-urlencode "data=$Q" https://overpass-api.de/api/interpreter -w '%{http_code}' 2>/dev/null)
  if [ "$code" = "200" ] && head -c 1 "$OUT.tmp" | grep -q '{'; then mv "$OUT.tmp" "$OUT"; echo "ok after $i tries"; exit 0; fi
  echo "try $i -> $code"; sleep 30
done
rm -f "$OUT.tmp"; exit 1
