# Reference image inventory

Every image in the repo, what it shows, and exactly how the game uses it. Scanned: 11 images (all the photos sent so far).
The prompt lists a few file names that have **not** been received yet — see "Missing" at the bottom.

| Path | Shows | Used for |
|---|---|---|
| `reference/church/church_01.png` | Church exterior, **current look, summer**, straight-on front: blue-grey vertical-siding tower, triple lancets, gold onion dome + white Ethiopian cross, cream stucco nave, white pointed windows (red glass tops), dark-green skirt, arched green/white sign, concrete steps with black railings, small vestibule wings beside the tower. | Default `current` variant in `src/church/church.ts`: tower/wing/nave proportions, siding direction, sign shape and text layout, door surround with pointed head, stair + railing layout, colours. |
| `reference/church/church_02.png` | Church exterior, **older winter look**: royal-blue horizontal-siding tower, green/yellow/red banner filling the lancet group, wooden steps, yellower nave, snow. | `blueFlag` variant (Chapter 2 flashback B): colours, horizontal siding, tricolour banner across the three lancets, wood steps, bluish cross. Also winter dressing (snow on steps/roofs). |
| `reference/church/church_05.png` | Church exterior, **current look in snow, 3/4 view**: side wall with five pointed windows, basement windows in the green skirt, roof depth, yard, neighbouring trees. | Nave length and window count/spacing (`CH.WIN_Z`), basement window panels, roof pitch/overhang, tower side lancet pairs, yard/tree placement, winter look of the default variant. |
| `reference/isaac/isaac_01.webp` | Isaac, **front, even light** (black cape). | Face layout in `src/char/human.ts`: slim oval face, brow shape/thickness, eye spacing, nose width, full lips with lighter lower lip, thin moustache, hairline; skin-tone sampling. |
| `reference/isaac/isaac_02.webp` | Isaac, **right profile**, short tapered fade, black tee. | Skull depth, straight nose profile, lip projection, jaw/chin line, ear position, fade gradient and sharp edge-up of the hair; lean neck/shoulder build. |
| `reference/isaac/isaac_04.webp` | Isaac, **3/4 left**, shorter cut, cream tee. | Cheekbone height and jaw definition in the head sculpt; moustache shape; alternate (shorter) hair length. |
| `reference/isaac/isaac_06.webp` | Isaac, **low front, white netela over a black puffer**; background: warm orange-brown wood paneling with a coat-hook rail. | `netelaPuffer` outfit (netela wrapped over both shoulders, crossed in front, over a black puffer); vestibule interior: wood paneling + coat-hook rail (`src/church/interior.ts`). |
| `reference/interior/interior_01_empty_aisle.webp` | **Church interior, empty**, looking down the red aisle runner: wooden pews both sides, red/gold circle-pattern carpet, wood-panelled front wall with **three arches and orange-gold satin curtains with crosses**, yellow scalloped valances, icons, two TVs showing hymn text, clock, speakers, crystal chandelier, recessed lights, chair, kebero drum, small table with flowers. | The whole nave layout: sanctuary screen with three curtained arches, icon placement, TVs/clock/speakers, pews + runner + carpet pattern, chandelier and recessed lights, priest's chair, kebero and table positions, raised platform. |
| `reference/interior/interior_02_evening_practice.webp` | **Evening zema practice**: boys in white netela with **maqomiya** prayer staffs, a priest in pale-green robe with gold brocade and a cylindrical cap, two **kebero** drums, side wall with **yellow upper wall over white-grey board paneling**, pointed windows with coloured top panes, icons between windows (St Mary, St Michael, St George…). | Side-wall materials and window design; icon spacing between windows; chanter positions before the curtain; NPC costumes (netela drape, priest's robe + brocade + cap), `staff`/`chant` poses, maqomiya and kebero models. |
| `reference/interior/interior_03_service_a.png` | **Sunday service** from the pews (older décor: maroon curtains, hanging lamps): congregation in white, priest at the centre arch. | Congregation density and seating, people in white netela/gabi seen from behind; where the priest stands; confirms front-wall icon arrangement. |
| `reference/interior/interior_04_service_b.png` | **Feast-day service**: priest in red-and-gold vestments at the centre arch, full church, blue side walls (older paint). | Festal vestment colours (red/gold brocade cape), crowd arrangement for the Kidase/vigil scenes. |

## Notes on how the photos changed the design
- The real interior **has pews** and the chanters stand at the **front**, before the curtain; the game follows the photos for layout and keeps the three traditional divisions as zones (see questions in `PROGRESS.md`).
- Curtains are orange-gold today and maroon in the older service photos; the game uses the current orange-gold.
- Icons in the game are **original code-painted artwork** in the Ethiopian style (`src/church/icons.ts`); none of the photographed icons are copied.
- No real person other than Isaac is modelled. People visible in the interior photos were used only for costume, posture and crowd-layout reference.

## Missing (listed in the brief but not received)
- `church_03.png` (dark-brown tower, green steps, white dome, street context) — the `brownTower` variant is built from the written description only.
- `church_04.png` (festival day with flags) — festival dressing is built from the description.
- `isaac_03.png`, `isaac_05.png` — only four photos of Isaac were received; `isaac_01` doubles as the skin-tone reference.
- `reference/map/brandon.osm` — see `PROGRESS.md` (OpenStreetMap download failed from the build machine).
