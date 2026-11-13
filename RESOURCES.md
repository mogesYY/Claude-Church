# What to give me — the full list

Everything here makes the game better. Nothing is required to play; each item replaces something that is generated or guessed today.
Send photos as **JPG or PNG** (iPhone: Settings → Camera → Formats → *Most Compatible*, or screenshot the photo). HEIC files do not open here.

## 1. Sound (the biggest gap)

Put MP3 files in these folders with these exact names. 128 kbps is plenty; keep each under ~5 MB. Trim to the best 1–3 minutes.
Only use recordings the church has the right to share (your own streams are ideal).

| File | Folder | Where it plays | What to record / cut from a stream |
|---|---|---|---|
| `menu.mp3` | `public/audio/music/` | Main menu | A calm mezmur or begena piece |
| `solemn.mp3` | `public/audio/music/` | Opening shot, quiet scenes | Slow mezmur or begena |
| `festive.mp3` | `public/audio/music/` | People leaving after Kidase, celebrations | A joyful mezmur with kebero |
| `kidase_opening.mp3` | `public/audio/chant/` | Chapter 1, the Kidase | Priest and deacon responses from the start of a Kidase |
| `mahlet_practice.mp3` | `public/audio/chant/` | Chapter 2, Mahlet | Mahlet with maqomiya, tsenatsel, kebero |
| `meskel_demera.mp3` | `public/audio/chant/` | Chapter 3, Demera | Meskel hymns (your "Meskel Abriha Wereb" stream) |
| `timket_procession.mp3` | `public/audio/chant/` | Chapter 4, Ketera | Timket wereb with kebero |
| `timket_blessing.mp3` | `public/audio/chant/` | Chapter 4, blessing of the water | The prayer over the water |
| `siqlet.mp3` | `public/audio/chant/` | Chapter 5, Good Friday | Siqlet chant with "Kiryalayson" |
| `fasika_vigil.mp3` | `public/audio/chant/` | Chapter 5, vigil | The vigil before the proclamation |
| `fasika_tensae.mp3` | `public/audio/chant/` | Chapter 5, Resurrection and credits | Fasika mezmur |
| `mezmur_01.mp3` … `mezmur_05.mp3` | `public/audio/chant/` | Car radio | Any five mezmur |

**Real instrument sounds** (optional, each 1–2 seconds, recorded close with a phone): one kebero low hit, one kebero high hit, one tsenatsel shake, one qachil ring, one maqomiya strike on the floor, a few seconds of ililta. Send them with any names and tell me which is which.

**Voices.** Every line now has a generated voice, one per character (`public/audio/voice/<line>.mp3`). To use real people, record each line and save it with the same file name. The lines are in `public/story/dialogue.json`. Amharic voice-over would have to be recorded by you; I cannot generate natural Amharic speech.

## 2. Photos of you (for the head shape)

Same day, same haircut, neutral face, plain wall behind, even light (stand facing a window; no flash), phone at eye level about 1.5 m away:
1. Straight front
2. Left side (pure profile)
3. Right side (pure profile)
4. Back of the head
5. Both three-quarter views
6. Top of the head, looking down
7. Full body, standing straight, arms slightly out — front and side
8. Full body wearing your netela the way you wear it to church

## 3. Photos of the church

**Outside:** all four sides straight on; each corner; the dome and cross zoomed in; the sign zoomed in; the steps and railings from the side; the yard on each side; the back of the building; the view from the top of the steps looking out.

**Inside:**
- The entry room: straight in from the door, then the left wall (basement door), the right wall (coat rail), both shoe racks, the ceiling
- From the back door of the nave looking at the stage (wide)
- From the stage looking back at the entrance (wide)
- Each side wall, straight on, so every icon and window is visible
- The stage up close: each arch, the yellow-draped book stand, the tables, the phone stand by the side door
- Each icon straight on (so I can match subject and position; I repaint them rather than copy)
- The ceiling, chandelier and fan
- One pew from the side
- The carpet and the runner, straight down
- The sound desk and the place the stream camera sits

**The four photos you sent last time did not open** (unsupported format). Please resend them as JPG or PNG.

## 4. Vestments and objects (one clear photo each)

Deacon's vestments for Kidase and for feasts; priest's vestments; the processional cross; hand cross; censer; umbrellas open; the cloth that covers the Tabot in procession (covered only); kebero; tsenatsel; maqomiya; the yellow book-stand cloth; the curtain crosses.

## 5. Answers only you can give

1. Men on the left and women on the right when facing the curtain — is that how it is at Medhane Alem?
2. Does the front door face 5th Street (the gravel road)? (Assumed yes from Street View.)
3. What exactly does a deacon do in the Kidase here: who holds the tuaf, who rings the qachil, who reads which reading?
4. Where does the Tabot go at Timket in Brandon, and where is the water blessed?
5. Where is the Demera built — front lawn, side yard?
6. How many clergy serve on a normal Sunday, and what colour vestments?
7. Anything in the five chapters that is not how it is done.
8. The Amharic text in `public/story/dialogue.json` and `src/core/i18n.ts` — please correct it.

## 6. The map (optional)

The game uses about 600 m around the church. If a mission should go somewhere specific (a member's street, the hall, the place the water is blessed), tell me where.

## 7. One decision

The repository is public and includes your reference photos and a face texture made from your photo. Say **keep** or **remove from the public repo**.
