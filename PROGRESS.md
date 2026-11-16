# PROGRESS — Medhane Alem: A Deacon's Year

**Live link:** https://mogesyy.github.io/Claude-Church/

## Pass 7 (latest)

- **Four deacons, always together:** Isaac, Zekariah, Nigerte and Nebs, each with his own photographed face. **Q** cycles, **1–4** picks one directly; the others follow on foot and ride in the car.
- **Zekariah:** the demon form is now a black, winged, horned figure with burning eyes and a red glow, not a tinted human.
- **Nigerte:** when the demon appears he grows to twenty feet. Controlling him, four blows (**E**) subdue the demon; nisiha with the Qesis still works too.
- **Nebs:** in deacon vestments, outside the church, he takes up the cross and bell, rises off the ground in a ring of flame with a halo, and a choir joins in. All four vest for the Kidase in level 1; **O** changes vestments in free roam.
- **Isaac:** arrow keys **Up, Up, Down, Left** — everything on the map except the church disappears, holy fire rings the church, trumpets sound and all four rise. The same code restores the world.
- **Sound:** **M** turns all sound off and on. The constant car engine drone is removed. The choir and trumpets are synthesized because no recordings exist; drop `public/audio/sfx/angels.mp3` and `trumpets.mp3` in to replace them.
- **Shoe room:** the basement doorway is back in the wall that faces the entrance, left of the steps.
- The faces of all four are public files on the site, because the game has to load them. The photos themselves are not in the repository.

## Pass 6 (latest)

- **Church at the surveyed footprint** (10.5 m x 18.5 m from the Manitoba Lands outline in the map data); front rebuilt from the close-up photo (narrow blue entry block before the cream gable, door-side windows, cream-wall windows, 2.2 m stairs); shoe room, back wall, stage, arches and ceiling re-measured against people in the photos. Heights remain photo estimates.
- **The Meqdes can be entered** by the doorway beside the stage (Isaac and Zekariah are deacons). It was not photographed, so the room is a plain design with a fully covered menber; the Tabot is not modelled.
- **Deacon Zekariah** is a second playable character with his own photographed face. The two are always together; **Q** switches who you control and the other follows, and rides in the passenger seat.
- **Car radio menu**: every recording is on it (2 mezmur, Kidase, Mahlet, Meskel, Siqlet, Fasika, and the three music tracks). **R** next, **T** previous; the list shows on screen.
- **Crashes**: driving into a pedestrian knocks them down; hitting a traffic car stops it and bounces yours. Each crash fills **Zekariah's rage meter**.
- **Demon form**: when the meter is full, **G** turns Zekariah into a 10-foot horned figure who can pull the heads off pedestrians (stylised, no blood). It ends only by going to Qesis Andualem in front of the church for **nisiha**; then he is himself again and the meter is empty.
- Level 2 no longer makes you drive anywhere: get in the truck and you arrive at Dinsdale Park.
- Not changed in this pass: character and driving animation smoothness.

## Pass 5 (this update)

**Church rebuilt from the new photos and videos**
- The entry lobby is now lower than the nave, as in the building: you come in at door level, take your shoes off at the wooden shelves on the right, and climb five carpeted steps with handrails, between cream panelled walls, to the double wooden doors with black crosses. The doors swing open as you approach. Red-framed basement door on the left; coat rail and white table on the right.
- Nave: white ceiling with a flat centre strip and sloped sides, pointed windows with white board panelling below and yellow wall above, icons between the windows, long oak pews with curved ends and book racks, open floor before the stage, maroon runner, chair, folding chair, kebero.
- Back wall as photographed: cross doors, stream camera on its shelf, clock, TV, fire bell, Last Supper, icon grids, St Mary, corner door.
- Front: carved arches with cross tiles, copper-orange curtains with gold fringe, pictures in the photographed order, two black TVs, clock, speakers, equipment shelf, lace-draped stand, dotted-cloth table with flowers, green brocade lectern, side door.
- One set of dimensions drives outside and inside (`CH` in `src/church/church.ts`), so the proportions agree. **They are estimates from photos, not measurements** (nave 9.8 m wide, 14.5 m long; lobby floor 0.85 m below the nave).

**Three short levels** (no passenger pick-ups, no errands)
1. **Kidase** — shoes off, bow, kiss the cross, light the candles, prepare the censer, start the stream, serve beside the priest (tuaf, qachil), then join the Mahlet.
2. **Meskel** — one short drive toward the river, raise and dress the Demera at Dinsdale Park, circle it three times, light it.
3. **Fasika** — Siqlet prostrations, the vigil light, the proclamation, spring dawn, credits.

**Sound**
- Every recording you gave is used: `menu` (menu), `solemn` (opening, vigil), `festive` (after Kidase), `kidase_opening`, `mahlet_practice`, `meskel_demera`, `siqlet`, `fasika_tensae`, and `mezmur_01`/`mezmur_02` on the car radio (it comes on when you get in; R changes track).
- Removed: all synthesized instruments (kebero, tsenatsel, staff, bells, qachil), ililta, crows, magpies, train horn, crowd noise, the synthesized background music and the browser's robot voice. What remains generated: wind, footsteps, car engine, horn, door, fire crackle, and the spoken dialogue lines.

**Driving**
- S or Space now stops the car firmly (about 3× the previous braking); lifting off W slows it noticeably; S reverses once stopped. Steering is a little quicker at speed.

**Privacy**
- Reference photos are removed from the public repository and ignored from now on. **They are still in the repository's earlier history** — see "What I need from you".
- No real person from the photos is in the game. Only Isaac's face texture (`public/char/isaac_face.png`) comes from a photo, and the game needs it to be public to load it.

## How it was verified
Headless Chromium with software rendering: all three levels auto-play start to finish with no runtime errors (`npm test`); type-check and production build pass. Screenshots of the new lobby and nave are in `captures/`.

**Not verified (needs your machine):** frame rate, how the braking feels in the hand, audio balance, and the levels played by hand at normal speed.

## What I need from you
1. **Tape measurements** to replace my estimates: nave width and length (back doors to the stage), ceiling height at the wall and at the centre, pew length, aisle width, stage height and depth, lobby width and depth, height of the five steps.
2. **Photo history:** say **purge** if you want the old photos erased from the repository history as well (this rewrites history with a force-push), or make the repository private (GitHub Pages on a free account needs it public).
3. Play the three levels and tell me what is not how it is done.
4. Review of the Amharic text (`public/story/dialogue.json`, `src/core/i18n.ts`).

## Known gaps
- Proportions are photo estimates until measured. Icons are repainted originals in the photographed positions, not copies.
- The basement and the upper stair are closed doors.
- Characters are stylised procedural models; animations are procedural.
- The map covers about 600 m around the church; Dinsdale Park is a separate hand-built location reached by a fade.
- Dialogue voices are generated English speech; there is no Amharic voice-over.
