# PROGRESS — Medhane Alem: A Deacon's Year

**Live link:** _none yet._ No GitHub repository is connected to the build session, so nothing has been pushed or deployed. Everything is committed locally; the Pages workflow (`.github/workflows/deploy.yml`) is ready and will deploy on the first push to `main`.

## What I need from you (Isaac)

1. **A GitHub repo to push to.** Connect GitHub and tell me the repo (or create an empty one). Then enable Pages → Source: *GitHub Actions*.
2. **The map.** OpenStreetMap's Overpass API was allowed in the network settings but every request from the build machine was reset (100+ attempts over ~1.5 h). Please export `brandon.osm` from openstreetmap.org (Export → an area from the Assiniboine River down past Richmond Ave, 1st St to 18th St) and commit it to `reference/map/`. `npm run world` then replaces the stand-in map automatically.
   **Until then the street map is an approximation of Brandon's grid** written from memory: numbered streets, avenue names and spacing are guesses, and all houses are generated.
3. **Missing photos** named in the brief: `church_03` (brown tower), `church_04` (festival day), `isaac_03`, `isaac_05`. See `reference/INVENTORY.md`.
4. **Chant recordings** — see `public/audio/chant/README.md` for the exact file names. Until they exist, a soft neutral drone plays instead (I did not synthesize imitation chant).
5. **Answers to the custom/accuracy questions below.**

## Questions (I did not want to guess)

**The church**
- Which side of 5th Street is the church on, and which way does the front door face? (Assumed: east side, door facing west, so the Meqdes is at the east end.)
- The brief says the Qene Mahlet is by the entrance, but your photos show the chanters and kebero at the front before the curtain, and the church has pews. I followed the photos. Is that right for our church?
- Men's and women's sides: I put men on the left (north) and women on the right when facing the curtain. Correct?
- What exactly is written on the arched sign over the door? (I wrote: "የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን / መድኃኔ ዓለም / Ethiopian Orthodox Tewahedo Medhane Alem Church · Brandon".)
- Does the front door open outward, and is the shoe rack in the entry (tower) room?

**Customs**
- Deacon's vestments: I used a white robe with a short red-and-gold embroidered cape. What should a deacon here wear for Kidase, for the Timket procession, and for the Fasika vigil? Is a crown (aklil) worn?
- Is it right for a deacon to light the altar-side candles and prepare the censer before the Kidase, and to cense during it, or is censing only the priest's?
- Chapter 1 shows Isaac kissing the door on arrival and bowing to greet the Qes. Should he kiss the Qes's hand cross instead of bowing?
- Good Friday (Siqlet): the game has three full prostrations (sigdet) in the aisle. Is that appropriate to show, and should the count/gesture differ?
- Timket in Brandon at −35 °C: where does the Tabot actually go, and where is the water blessed (indoors, a basin in the yard, somewhere else)? I staged a short street procession (Ketera) and a basin blessed in the church yard the next morning.
- Is one Tabot carried, and who holds the umbrella over it — a deacon? In the game the Tabot is only ever a brocade-covered form on the priest's head, under an umbrella.
- Meskel: is the Demera lit by the priest, and is it acceptable that the game shows elders reading the direction of its fall? (Lines are light-hearted; easy to change in `public/story/dialogue.json`.)
- Fasika: the proclamation is written "Kristos tensa'e ke'mutan" / "Be'abiy hayl wesiltan". Please check the wording and the Ge'ez spelling (ክርስቶስ ተንሥአ እሙታን / በዐቢይ ኃይል ወሥልጣን).
- **All Amharic text** (UI in `src/core/i18n.ts`, dialogue in `public/story/dialogue.json`) was written by me, not a native speaker. Please review it — especially honorifics (I used "አባ" for the Qes and "አቶ ተስፋዬ" for the elder, an invented generic character).

## Status by build phase

| # | Phase | State |
|---|---|---|
| 1 | Vite + three.js WebGPU project, Pages workflow, third-person controller | Done. WebGPU with automatic WebGL2 fallback; only the WebGL2 path could be tested here (no GPU). |
| 2 | OSM import → neighbourhood, roads, minimap | Importer done (`tools/osm_to_world.ts`, reads Overpass JSON or `.osm` XML). **Running on stand-in map data** (see above). Roads with widths, centre/lane lines, stop bars, sidewalks, curbs, boulevards, signals, stop signs, lamps, rail line, river, parks, nav graph + A* routing, minimap and full map with waypoints. |
| 3 | Church exterior and interior | Done from the photos: three variants (`current`, `blueFlag`, `brownTower`), festival flags, enterable interior with the three-arch curtained screen, icons (original artwork), pews, chandelier, candles, censer, kebero, maqomiya, tsenatsel, umbrellas, shoe rack, livestream camera. The Meqdes cannot be entered and the camera cannot pass the curtain. |
| 4 | Vehicles and traffic | Done: 5 modern vehicles (pickup, minivan, sedan, SUV, hatchback) + 2 older ones for flashbacks; raycast suspension, headlights, wipers, horn, snow/ice grip, enter/exit any parked car, radio with 5 mezmur slots; AI traffic keeps right and obeys stop signs/signals; pedestrians on sidewalks. |
| 5 | Houses, trees, materials, weather, seasons | Done: seeded procedural houses (bungalow, 1½-storey, 2-storey; stucco or lap siding; porches, dormers, chimneys, garages, wood and chain-link fences), elms/ash/spruce, power poles; four seasons (snow roofs, snowbanks, bare trees, autumn colour, spring melt patches), snowfall, blizzard, breath vapour, real sun position for Brandon by date and time. |
| 6 | Isaac, netela, animations, NPCs | Done as a procedural rig (see gaps): sculpted head with painted face from the photos, fade haircut, moustache toggle, outfits (netela, netela over puffer, deacon, casual, winter), spring-bone netela, ~25 procedural animations; generic NPC kinds (Qes with turban and hand cross, elders in gabi, women in netela, children, neighbours). |
| 7 | Story system + Chapters 1–5 | Done: opening shot and all five chapters playable start to finish; dialogue in editable JSON (EN + AM). |
| 8 | Audio, bilingual UI, photo mode, touch, performance | Done: synthesized wind, crows/magpies, train horn, footsteps (snow crunch), engine + tire slush, kebero, tsenatsel, bell, church reverb; EN/AM toggle; photo mode with free camera and path tracing; touch controls; Low/High/Ultra presets with auto-detect and automatic step-down. |

## How it was verified

No GPU here, so everything was checked in headless Chromium with software rendering (WebGL2 path):
- `npm test` auto-plays all five chapters (objectives are completed by teleporting) and fails on any runtime error.
- Screenshots in `captures/` (church exterior/interior, Isaac, street, each chapter).

**Not verified, because it needs real hardware:** the WebGPU backend itself, Ultra preset effects (SSR, TRAA, 4-cascade shadows), 60 fps at 1440p on the RTX 5070 Ti, path-traced photo mode speed/quality, gamepad and touch on real devices, audio balance. Please try these first and tell me what you see.

## Known gaps (honest list)

**Graphics**
- "Volumetric" incense and light shafts are billboard particles and additive planes, not true volumetrics. No screen-space wet-road puddles; SSR is only enabled on Ultra and is untested on real WebGPU.
- No texture downloads: Poly Haven / ambientCG were blocked by the network, so all materials are small procedural canvas textures (no normal maps). Assets are generated at load time in code rather than shipped as Draco/KTX2 GLB files.
- Night sky before sunrise is plain (stars only, no twilight gradient or moon disc).
- Elevation is approximated (gentle rise away from the river, ~15 m valley drop); no Canadian DEM was reachable.

**Character**
- Isaac is a stylised procedural model, not a photoreal scan: likeness comes from proportions, skin tone, hair and painted features. It was not built in Blender (not available here). Eyes do not blink, there is no lip-sync, hands are mitten-like, and removed shoes are shown as a pair on the rack rather than bare feet.
- The netela is a spring-bone drape, not a full cloth simulation; it can clip the forearms in big arm movements.
- Animations are procedural (no mocap): enter/exit car is a fade-free snap into the seat, not an animated door sequence.

**World**
- Stand-in map (see top). Landmarks (Brandon University, Assiniboine College, Keystone Centre, grocery store, City Hall, downtown blocks) are simple extruded blocks at **guessed positions**; they will come from real footprints once the OSM file is in.
- Houses do not yet match individual real houses; back-lane garages and fences are generated per lot.
- No interior for any building except the church.

**Gameplay**
- Traffic AI is on rails (no lane changes, no overtaking; it stops for the player and each other).
- Chapter 4 "plan the route" is a single marker to confirm rather than a map-drawing tool.
- Save stores chapter progress and settings, not mid-chapter position.
- The first load builds everything procedurally; measured load here is a few seconds on software rendering, but the JS bundle is ~2.1 MB gzipped (three.js WebGPU + Rapier).

## Next steps I would take
1. Swap in the real OSM data and re-check church placement/orientation, landmarks and mission routes.
2. Apply your answers on customs and vestments; correct the Amharic.
3. Tune on your RTX 5070 Ti (WebGPU, Ultra), then on a phone.
4. Character pass: blinking, better hands, a proper cloth solver for the netela, animated car doors.
