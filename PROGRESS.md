# PROGRESS — Medhane Alem: A Deacon's Year

**Live link:** https://mogesyy.github.io/Claude-Church/ — _goes live once GitHub Pages is switched on: repo Settings → Pages → Source: **GitHub Actions**, then re-run the "Deploy to GitHub Pages" workflow (Actions tab). The code is pushed and the CI build passes; only that setting is missing._

## Update — second pass (your feedback)

**Changed**
- **GPS**: rewritten. Faster routing, starts from where you actually are, a gold guidance line on the road, a distance read-out, and it refreshes as you drive. No GPS line inside the church.
- **Houses on roads**: the map no longer invents houses or garages (real footprints only), driveways and parking aisles are not drawn as roads, and any building that would touch a road is pulled back or shrunk.
- **Map size**: cut to about 600 m around the church — only what the story uses.
- **Missions**: no more long drives. Chapter 2 happens entirely at the church (memories, Mahlet practice, asking the people in the room for their photos, the video). The Meskel permit is a phone call and the branches are in the yard. Only two short drives remain (the elder around the corner; one family home in the blizzard).
- **Rites**: the Qes censes, not the deacon. The deacon prepares the censer, holds the tuaf for the Gospel, calls "Tselyu", and rings the qachil. You bow and cross yourself on entering and kiss the priest's cross. Mahlet has two facing rows with maqomiya, tsenatsel and kebero. The Demera is circled three times before it is lit with a chibo. At Timket a processional cross leads, the Tabot goes out covered under the umbrella, and the Qes lowers the cross into the water. Siqlet has "Kiryalayson" prostrations. Fasika has the full call and response.
- **Church interior**: rebuilt from your two photos — open floor before the stage, oak benches, the exact icon/TV/clock layout on the front wall, side door near the front, two doors on the back wall, sound desk, lectern and microphone, lace table, flower table, kettle table with lilies, ceiling fan, floor vents, stream camera above the entrance.
- **Your face**: your front photo is now projected onto the 3D head (`tools/make_face.py` → `public/char/isaac_face.png`), and the head was reshaped to the photo's proportions.
- **Driving**: arcade assists (traction and steering help), stronger engine and brakes, much less sliding in winter.
- **Pause**: Esc (or Tab/P) pauses everything and opens a menu: resume, map, missions, settings, photo mode, restart chapter, quit to main menu. Losing window focus also pauses.
- **New settings**: music volume, dialogue voice on/off, FPS counter (on by default), mouse sensitivity, renderer.
- **Look**: interface restyled (green, gold and red band, Ethiopian cross, parchment dialogue box); smoother trees; richer colours and colour grading; surface relief (normal maps) on siding, stucco, shingles, asphalt, carpet and wood.
- **Sound**: reworked kebero, tsenatsel, qachil bell, maqomiya strike and ililta; a begena-and-krar style instrumental for the menu and scenes; every dialogue line is spoken.

**What is still not real, and why**
- **Mezmur, Kidase and Mahlet audio are not recordings.** I cannot download from YouTube or record anything here. Put your own MP3s in `public/audio/chant/` and `public/audio/music/` (file names are in the README in each folder) and they replace the generated instrumental automatically.
- **Voices are the browser's built-in speech**, not actors. English always works; Amharic is spoken only if your device has an Amharic voice installed. Real voice-over would need recordings.
- **Instrument sounds are synthesized**, not sampled from real instruments. Recordings of your own kebero and tsenatsel would be better; tell me and I will wire them in.
- I could not look at your YouTube thumbnails (no access to YouTube from here). The rites above are from what I know of the services; please correct anything that is not how it is done at Medhane Alem.
- The world is still stylised geometry. It is smoother and more colourful now, but it is not photoreal.

## What I need from you (Isaac)

1. **Switch on GitHub Pages** for `mogesYY/Claude-Church`: Settings → Pages → Source: *GitHub Actions*, then re-run the failed deploy in the Actions tab. (I can push code but am not permitted to change that setting.)
2. **The map — received, thank you.** `reference/map/brandon.osm` is now the source of the world: real streets and ~3,700 real building footprints from roughly Southern Ave down to Maryland Ave, 1st to 18th St. It does **not** reach downtown (Rosser/Princess/Victoria), Brandon University or the Assiniboine River, so those are not in the game yet. If you want them, export a second, taller area (same width, north edge at the river) and replace the file. About 900 houses are still generated where the map has no footprint.
   The map shows the church on the **west side of 5th Street at the corner of Queens Avenue**, long axis east–west. I assumed the **front door faces east, toward 5th Street** — please confirm (that puts the Meqdes at the west end).
3. **Missing photos** named in the brief: `church_03` (brown tower), `church_04` (festival day), `isaac_03`, `isaac_05`. See `reference/INVENTORY.md`.
4. **Chant recordings** — see `public/audio/chant/README.md` for the exact file names. Until they exist, a soft neutral drone plays instead (I did not synthesize imitation chant).
5. **Answers to the custom/accuracy questions below.**

## Questions (I did not want to guess)

**The church**
- Does the front door face east toward 5th Street (as assumed from the map), which would put the Meqdes at the west end? Or is the entrance on another side?
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
| 1 | Vite + three.js WebGPU project, Pages workflow, third-person controller | Done. WebGPU with automatic WebGL2 fallback (both exercised in software). Pushed to `mogesYY/Claude-Church`; CI build passes; deploy waits on Pages being enabled. |
| 2 | OSM import → neighbourhood, roads, minimap | Importer done (`tools/osm_to_world.ts`, reads Overpass JSON or `.osm` XML). Running on your real OSM export (south-central Brandon). Roads with widths, centre/lane lines, stop bars, sidewalks, curbs, boulevards, signals, stop signs, lamps, rail line, river, parks, nav graph + A* routing, minimap and full map with waypoints. |
| 3 | Church exterior and interior | Done from the photos: three variants (`current`, `blueFlag`, `brownTower`), festival flags, enterable interior with the three-arch curtained screen, icons (original artwork), pews, chandelier, candles, censer, kebero, maqomiya, tsenatsel, umbrellas, shoe rack, livestream camera. The Meqdes cannot be entered and the camera cannot pass the curtain. |
| 4 | Vehicles and traffic | Done: 5 modern vehicles (pickup, minivan, sedan, SUV, hatchback) + 2 older ones for flashbacks; raycast suspension, headlights, wipers, horn, snow/ice grip, enter/exit any parked car, radio with 5 mezmur slots; AI traffic keeps right and obeys stop signs/signals; pedestrians on sidewalks. |
| 5 | Houses, trees, materials, weather, seasons | Done: seeded procedural houses (bungalow, 1½-storey, 2-storey; stucco or lap siding; porches, dormers, chimneys, garages, wood and chain-link fences), elms/ash/spruce, power poles; four seasons (snow roofs, snowbanks, bare trees, autumn colour, spring melt patches), snowfall, blizzard, breath vapour, real sun position for Brandon by date and time. |
| 6 | Isaac, netela, animations, NPCs | Done as a procedural rig (see gaps): sculpted head with painted face from the photos, fade haircut, moustache toggle, outfits (netela, netela over puffer, deacon, casual, winter), spring-bone netela, ~25 procedural animations; generic NPC kinds (Qes with turban and hand cross, elders in gabi, women in netela, children, neighbours). |
| 7 | Story system + Chapters 1–5 | Done: opening shot and all five chapters playable start to finish; dialogue in editable JSON (EN + AM). |
| 8 | Audio, bilingual UI, photo mode, touch, performance | Done: synthesized wind, crows/magpies, train horn, footsteps (snow crunch), engine + tire slush, kebero, tsenatsel, bell, church reverb; EN/AM toggle; photo mode with free camera and path tracing; touch controls; Low/High/Ultra presets with auto-detect and automatic step-down. |

## How it was verified

There is no GPU on the build machine, so everything was checked in headless Chromium with software rendering:
- **All five chapters auto-play start to finish with zero runtime errors** (`npm test`: objectives are completed by teleporting; takes ~8–10 min per chapter in software).
- **Driving physics test** (`node tools/cartest.mjs`): accelerate, steer (correct direction), brake, reverse, suspension settles on the road.
- **Both render backends run**: WebGL2 fallback (Low/High/Ultra) and the **WebGPU backend on a software adapter** (High and Ultra, outdoors and inside the church). This caught and fixed a WebGPU-only validation error in the Ultra pipeline.
- Screenshots in `captures/` (church exterior/interior, Isaac, street, chapter 1 scenes, WebGPU Ultra frames).
- If WebGPU still fails on your machine, the game retries itself on WebGL2 automatically, and Phone → Settings → Renderer switches by hand.

**Not verified, because it needs real hardware:** frame rate (60 fps at 1440p Ultra on the RTX 5070 Ti is a target, not a measurement), the look of SSR/TRAA/cascaded shadows at full resolution, the path-traced photo mode (never run here), gamepad and touch on real devices, audio balance, and playing the chapters by hand at normal speed (only the automated run was done). Please try these first and tell me what you see.

## Known gaps (honest list)

**Graphics**
- "Volumetric" incense and light shafts are billboard particles and additive planes, not true volumetrics. No screen-space wet-road puddles; SSR is only enabled on Ultra and is untested on real WebGPU.
- No texture downloads: Poly Haven / ambientCG were blocked by the network, so all materials are small procedural canvas textures (no normal maps). Assets are generated at load time in code rather than shipped as Draco/KTX2 GLB files.
- Night sky is plain (stars and a simple dawn/dusk glow; no moon disc). Interior lighting runs a little bright and there is a faint ceiling shading artifact near the chandelier.
- First time each new kind of object appears there can be a short shader-compile hitch.
- Elevation is approximated (gentle rise away from the river, ~15 m valley drop); no Canadian DEM was reachable.

**Character**
- Isaac is a stylised procedural model, not a photoreal scan: likeness comes from proportions, skin tone, hair and painted features. It was not built in Blender (not available here). Eyes do not blink, there is no lip-sync, hands are mitten-like, and removed shoes are shown as a pair on the rack rather than bare feet.
- The netela is a spring-bone drape, not a full cloth simulation; it can clip the forearms in big arm movements.
- Animations are procedural (no mocap): enter/exit car is a fade-free snap into the seat, not an animated door sequence.

**World**
- The map export covers south-central Brandon only. Brandon University, Assiniboine College, City Hall, downtown and the river are outside it, so missions that mention them (university in Chapters 2 and 5, City Hall in Chapter 3) currently send you to a nearby residential street instead. The Co-op grocery is real. Large buildings are simple extruded blocks.
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
