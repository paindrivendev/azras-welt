/* Gehen (Ticket 19): wohin Azra auf einem Boden laufen kann, rein und getestet. Ein Boden ist
   {w, h, sperren: [[x0, y0, x1, y1]] (Möbel, Häuser), gesperrt?: (x, y) => true für Wasser}; gelaufen wird auf
   Feldern von 0,5 × 0,5, auch schräg, aber nie schräg an einer Ecke vorbei. */
(function(root){
"use strict";
const F = .5;
function frei(b, x, y){
  return x > 0 && y > 0 && x < b.w && y < b.h && !b.sperren.some(([a, c, d, e]) => x > a && x < d && y > c && y < e) && !(b.gesperrt && b.gesperrt(x, y));
}
const mitte = v => (Math.floor(v / F) + .5) * F;
const rund = v => Math.round(v * 1000) / 1000;
// Der freie Feldmittelpunkt, der dem getippten Punkt am nächsten liegt (getippt neben den Boden: an seinen Rand).
function ziel(b, [x, y]){
  const cx = mitte(Math.min(b.w - F / 2, Math.max(F / 2, x))), cy = mitte(Math.min(b.h - F / 2, Math.max(F / 2, y)));
  if(frei(b, cx, cy)) return [rund(cx), rund(cy)];
  let best = null, bd = Infinity;
  for(let i = 0; i < b.w / F; i++) for(let j = 0; j < b.h / F; j++){
    const px = (i + .5) * F, py = (j + .5) * F, d = (px - x) ** 2 + (py - y) ** 2;
    if(d < bd && frei(b, px, py)){ bd = d; best = [rund(px), rund(py)]; }
  }
  return best || [rund(cx), rund(cy)];
}
// Der kürzeste Weg von Feld zu Feld (ohne das Startfeld); [] wenn sie schon da ist oder nicht hinkommt.
function weg(b, von, nach){
  const a = ziel(b, von), z = ziel(b, nach), nx = Math.round(b.w / F), ny = Math.round(b.h / F);
  const key = ([x, y]) => Math.floor(y / F) * nx + Math.floor(x / F), pt = k => [rund((k % nx + .5) * F), rund((Math.floor(k / nx) + .5) * F)];
  const ziel_ = key(z), vor = new Map([[key(a), -1]]), q = [key(a)];
  const ok = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && frei(b, (i + .5) * F, (j + .5) * F);
  while(q.length){
    const k = q.shift(); if(k === ziel_) break;
    const i = k % nx, j = Math.floor(k / nx);
    for(const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]){
      const n = (j + dj) * nx + i + di;
      if(!ok(i + di, j + dj) || vor.has(n) || (di && dj && !(ok(i + di, j) && ok(i, j + dj)))) continue;
      vor.set(n, k); q.push(n);
    }
  }
  if(!vor.has(ziel_) || ziel_ === key(a)) return [];
  const w = []; for(let k = ziel_; k !== key(a); k = vor.get(k)) w.unshift(pt(k));
  return w;
}
// Ein Punkt im Bild (Ursprung o, Kantenlänge u wie BILD.isoP) wird ein Punkt auf dem Boden (z = 0).
function vonBild(o, u, sx, sy){ const d = (sx - o[0]) / (.866 * u), s = (sy - o[1]) / (.5 * u); return [(s + d) / 2, (s - d) / 2]; }
// Pfeiltasten: ein Schritt in die Richtung, in die der Pfeil auf dem Bildschirm zeigt.
const PFEIL = { ArrowUp: [-F, -F], ArrowDown: [F, F], ArrowLeft: [-F, F], ArrowRight: [F, -F] };
const pfeil = k => PFEIL[k] || null;
const GEHEN = { frei, ziel, weg, vonBild, pfeil };
if(typeof module !== "undefined" && module.exports) module.exports = GEHEN; else root.GEHEN = GEHEN;
})(this);
