// English + Amharic UI strings. Amharic was written by a non-native tool: please review (see PROGRESS.md).
export type Lang = 'en' | 'am';
const S: Record<string, [string, string]> = {
  title: ['MEDHANE ALEM', 'መድኃኔ ዓለም'], subtitle: ["A Deacon's Year", 'የአንድ ዲያቆን ዓመት'],
  newGame: ['New Game', 'አዲስ ጨዋታ'], continue: ['Continue', 'ቀጥል'], chapters: ['Chapters', 'ምዕራፎች'], settings: ['Settings', 'ቅንብሮች'], freeRoam: ['Free Roam', 'ነፃ ጉዞ'],
  language: ['Language', 'ቋንቋ'], quality: ['Graphics', 'ግራፊክስ'], low: ['Low', 'ዝቅተኛ'], high: ['High', 'ከፍተኛ'], ultra: ['Ultra', 'እጅግ ከፍተኛ'],
  map: ['Map', 'ካርታ'], missions: ['Missions', 'ተልእኮዎች'], photo: ['Photo Mode', 'የፎቶ ሁነታ'], save: ['Save', 'አስቀምጥ'], saved: ['Game saved', 'ጨዋታው ተቀምጧል'], close: ['Close', 'ዝጋ'],
  interact: ['Interact', 'ተግባር'], enterCar: ['Drive', 'ንዳ'], exitCar: ['Exit car', 'ከመኪና ውረድ'], skip: ['Skip', 'ዝለል'], next: ['Next', 'ቀጣይ'],
  objective: ['Objective', 'ዓላማ'], chapter: ['Chapter', 'ምዕራፍ'], complete: ['Chapter complete', 'ምዕራፉ ተጠናቋል'],
  waypointSet: ['Waypoint set', 'መድረሻ ተመርጧል'], waypointClear: ['Waypoint cleared', 'መድረሻ ተሰርዟል'],
  moustache: ['Moustache', 'ጢም'], outfit: ['Outfit', 'ልብስ'], season: ['Season', 'ወቅት'], time: ['Time of day', 'ሰዓት'], volume: ['Volume', 'ድምፅ'], on: ['On', 'አብራ'], off: ['Off', 'አጥፋ'],
  summer: ['Summer', 'በጋ'], autumn: ['Autumn', 'መኸር'], winter: ['Winter', 'ክረምት'], spring: ['Spring', 'ጸደይ'],
  radio: ['Radio', 'ሬዲዮ'], radioOff: ['Radio off', 'ሬዲዮ ጠፍቷል'], church: ['Medhane Alem Church', 'መድኃኔ ዓለም ቤተ ክርስቲያን'],
  loading: ['Loading the neighbourhood…', 'ሰፈሩ በመጫን ላይ…'], clickToPlay: ['Click to play', 'ለመጫወት ይጫኑ'],
  controls: ['WASD move · Mouse look · Shift run · Space jump/brake · E interact · F car · Tab phone · L lights · V wipers · R radio', 'WASD መንቀሳቀስ · ማውስ መመልከት · Shift መሮጥ · E ተግባር · F መኪና · Tab ስልክ'],
  sanctuary: ['Only the clergy enter the Meqdes.', 'ወደ መቅደስ የሚገቡት ካህናት ብቻ ናቸው።'],
  shoesFirst: ['Remove your shoes before entering the church.', 'ወደ ቤተ ክርስቲያን ከመግባትዎ በፊት ጫማዎን ያውልቁ።'],
  pathTrace: ['Ray-traced render', 'ሬይ-ትሬስ ምስል'], capture: ['Save photo', 'ፎቶ አስቀምጥ'], exitPhoto: ['Exit photo mode', 'ከፎቶ ሁነታ ውጣ'], samples: ['samples', 'ናሙናዎች'],
  credits: ['Credits', 'ምስጋና'], replay: ['Play', 'ጫወት'], locked: ['Locked', 'ተቆልፏል'], casual: ['Casual', 'ተራ ልብስ'], netela: ['Netela', 'ነጠላ'], winterOutfit: ['Winter', 'የክረምት ልብስ'],
};
export class I18n {
  lang: Lang = 'en';
  listeners: (() => void)[] = [];
  constructor() { try { const l = localStorage.getItem('ma.lang'); if (l === 'am' || l === 'en') this.lang = l; } catch { /* ignore */ } }
  t(k: string): string { const e = S[k]; return e ? e[this.lang === 'en' ? 0 : 1] : k; }
  /** pick from a bilingual pair */
  pick(en: string, am?: string) { return this.lang === 'am' && am ? am : en; }
  set(l: Lang) { this.lang = l; try { localStorage.setItem('ma.lang', l); } catch { /* ignore */ } document.documentElement.lang = l; for (const f of this.listeners) f(); }
  toggle() { this.set(this.lang === 'en' ? 'am' : 'en'); }
}
