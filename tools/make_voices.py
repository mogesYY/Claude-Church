#!/usr/bin/env python3
"""Generates one spoken MP3 per dialogue line into public/audio/voice/, a distinct voice per character.
Uses the open Kokoro TTS model (pip install kokoro-onnx soundfile lameenc; model files from the kokoro-onnx GitHub releases).
Run:  python3 tools/make_voices.py <dir-with-kokoro-v1.0.onnx-and-voices-v1.0.bin>
To use real voice actors instead, just replace the MP3s (file name = dialogue key)."""
import json, os, sys, re
import numpy as np, lameenc
from kokoro_onnx import Kokoro
mdir = sys.argv[1]; k = Kokoro(os.path.join(mdir, 'kokoro-v1.0.onnx'), os.path.join(mdir, 'voices-v1.0.bin'))
VOICES = {  # speaker -> (voice, speed, language)
  'Qesis Andualem': ('bm_george', 0.86, 'en-gb'), 'Isaac': ('am_michael', 1.0, 'en-us'), 'Ato Tesfaye': ('bm_lewis', 0.84, 'en-gb'), 'Founder': ('am_onyx', 0.92, 'en-us'),
  'Emama': ('bf_emma', 0.9, 'en-gb'), 'Mother': ('af_bella', 1.0, 'en-us'), 'Grandmother': ('bf_isabella', 0.86, 'en-gb'), 'Classmate': ('am_puck', 1.06, 'en-us'), 'Driver': ('am_eric', 1.0, 'en-us'),
  'Clerk': ('af_sarah', 1.02, 'en-us'), 'Chanter': ('am_liam', 0.98, 'en-us'), 'All': ('am_fenrir', 0.9, 'en-us'), '': ('bm_daniel', 0.92, 'en-gb'),
}
# spellings that help the model pronounce Ge'ez / Amharic words
SAY = {'Qesis': 'Kessis', 'Andualem': 'Ahn-doo-ah-lem', 'Kidase': 'Kid-dah-say', 'Mahlet': 'Mah-let', 'Tselyu': 'Tse-li-yoo', 'Tabot': 'Tah-bot', 'Timket': 'Tim-ket', 'Meskel': 'Mes-kel', 'Demera': 'Deh-meh-ra', 'Meqdes': 'Mek-des',
       'Ato Tesfaye': 'Ah-toe Tes-fah-yeh', 'adey abeba': 'ah-day ah-beh-ba', "Kristos tensa'e ke'mutan": 'Kris-tos ten-sah-eh em-moo-tan', "Be'abiy hayl wesiltan": 'Beh-ah-bee hile weh-sil-tan', "Asero le'Seytan": 'Ah-seh-ro leh-say-tan', "Agazo le'Adam": 'Ah-gah-zo leh-Ah-dam',
       'Selam': 'Seh-lahm', 'Abba': 'Ah-bah', 'Kiryalayson': 'Kir-yah-lie-son', 'tuaf': 'too-ahf', 'qachil': 'kah-chil', 'sigdet': 'sig-det', 'Siqlet': 'Sik-let', 'Emama': 'Eh-mah-ma', '@EOTCBrandon': 'E O T C Brandon', '−': 'minus '}
os.makedirs('public/audio/voice', exist_ok=True)
d = json.load(open('public/story/dialogue.json', encoding='utf8')); n = 0
for key, line in d.items():
    voice, speed, lang = VOICES.get(line.get('sp', ''), VOICES[''])
    text = line['en']
    for a, b in SAY.items(): text = text.replace(a, b)
    text = re.sub(r'[“”"]', '', text).replace(' — ', ', ').replace('—', ', ')
    samples, sr = k.create(text, voice=voice, speed=speed, lang=lang)
    pcm = (np.clip(samples, -1, 1) * 32767 * 0.9).astype(np.int16)
    enc = lameenc.Encoder(); enc.set_bit_rate(48); enc.set_in_sample_rate(sr); enc.set_channels(1); enc.set_quality(2)
    open(f'public/audio/voice/{key}.mp3', 'wb').write(enc.encode(pcm.tobytes()) + enc.flush()); n += 1
print(n, 'lines')
