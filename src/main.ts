import { Game } from './game';
const game = new Game();
(window as any).__game = game;
game.boot().catch((e) => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;top:0;left:0;color:#f88;z-index:99;white-space:pre-wrap">${e?.stack ?? e}</pre>`); });
