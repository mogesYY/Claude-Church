# Medhane Alem: A Deacon's Year

**Live link:** https://mogesyy.github.io/Claude-Church/ — _goes live once GitHub Pages is switched on: repo Settings → Pages → Source: **GitHub Actions**, then re-run the "Deploy to GitHub Pages" workflow (Actions tab). The code is pushed and the CI build passes; only that setting is missing._

A respectful, story-driven, third-person open-world tribute to the Ethiopian Orthodox Tewahedo Medhane Alem Church, 1260 5th Street, Brandon, Manitoba, and its community. Five chapters across one church year: **Kidan**, **Hamer**, **Meskel**, **Timket**, **Fasika**. No violence, no crime — service, travel, festivals, family and community.

## Run it
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run world      # rebuild world data from reference/map/brandon.osm(.json)
npm test           # headless auto-play of all five chapters (needs a prior `npm run build`)
```
URL options: `?q=low|high|ultra` graphics preset · `?chapter=1..5` jump to a chapter · `?roam` free roam · `?webgl` force WebGL2 · `?agx` AgX tone mapping.

## Controls
| | Keyboard / mouse | Gamepad | Touch |
|---|---|---|---|
| Move / look | WASD / mouse | left / right stick | left stick / drag right side |
| Run · Jump | Shift · Space | L3 or RB · A | » · ⤒ |
| Interact | E | X | E |
| Enter / exit car | F | Y | 🚗 |
| Drive | W/S, A/D, Space brake | RT/LT, stick, B | ▲ ▼ + stick |
| Lights · wipers · horn · radio | L · V · H · R | D-pad / R3 | — |
| Pause menu (map, missions, settings, photo mode, quit) | Esc, Tab or P | Start | ☰ |

## Tech
three.js `WebGPURenderer` (automatic WebGL2 fallback) · TypeScript · Vite · Rapier physics (character controller + raycast vehicles) · everything procedural (no downloaded art) · OpenStreetMap importer (`tools/osm_to_world.ts`) · `three-gpu-pathtracer` photo mode · English + Amharic UI.

See **`PROGRESS.md`** for status, known gaps and the questions that need a deacon's answer, and **`reference/INVENTORY.md`** for how each reference photo is used.
