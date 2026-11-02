/* Zeichnen für Azras Welt: isometrische "Diorama"-Formen und Figuren als SVG-Text (aus tierschule/prototype-aussehen.html, Variante B). */
(function(root){
"use strict";
function rng(seed){ let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function shade(h, f){ const n = parseInt(h.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(n >> 16 & 255)},${c(n >> 8 & 255)},${c(n & 255)})`; }
const hot = (act, inner, extra = "") => `<g class="hot" data-act="${act}" ${extra}>${inner}</g>`;
const spr = (svg, x, y, s, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${svg}</g>`;
// Isometrie: P(x, y, z) → Bildpunkt; u = Kantenlänge einer Kachel.
const isoP = (o, u) => (x, y, z = 0) => [o[0] + (x - y) * .866 * u, o[1] + (x + y) * .5 * u - z * u];
const pts = (P, a) => a.map(p => P(...p).map(n => n.toFixed(1)).join(",")).join(" ");
const poly = (P, a, f, e = "") => `<polygon points="${pts(P, a)}" fill="${f}" ${e}/>`;
function box(P, x, y, z, w, d, h, c){
  return poly(P, [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], shade(c, .86))
    + poly(P, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], shade(c, .72))
    + poly(P, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c);
}
function roof(P, x, y, z, w, d, h, c){
  const m = y + d / 2;
  return poly(P, [[x, y, z], [x + w, y, z], [x + w, m, z + h], [x, m, z + h]], shade(c, 1.1))
    + poly(P, [[x, y + d, z], [x + w, y + d, z], [x + w, m, z + h], [x, m, z + h]], shade(c, .92))
    + poly(P, [[x + w, y, z], [x + w, y + d, z], [x + w, m, z + h]], shade(c, .74));
}
function floor(P, n, m, c1, c2, z = 0){ let s = ""; for(let x = 0; x < n; x++) for(let y = 0; y < m; y++) s += poly(P, [[x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z]], (x + y) % 2 ? c1 : c2); return s; }
const shadowed = (P, x, y, z, svg, s, flip) => { const [sx, sy] = P(x, y, z); return `<ellipse cx="${sx}" cy="${sy}" rx="${98 * s}" ry="${31 * s}" fill="#2b2140" opacity=".14"/>` + spr(svg, sx, sy, s, flip); };
const ping = (P, x, y, z) => { const [sx, sy] = P(x, y, z); return `<g class="ping" pointer-events="none"><circle cx="${sx}" cy="${sy}" r="16" fill="#fff" stroke="#8e5bd6" stroke-width="6"/></g>`; };

// Katzenfarben zur Wahl am ersten Tag (Fell, Bauch, dunkle Stellen, Augen).
const KATZEN = {
  lila: { name: "Lila", c: "#c4a6ec", belly: "#f1e6fd", dk: "#a684d6", eye: "#2a1d18" },
  weiss: { name: "Weiß", c: "#f3eee8", belly: "#ffffff", dk: "#e2d9cf", eye: "#2a1d18" },
  schwarz: { name: "Schwarz", c: "#3b3640", belly: "#57505e", dk: "#2a262e", eye: "#f2c94c" },
  grau: { name: "Grau", c: "#a3a1ae", belly: "#e3e2ea", dk: "#86848f", eye: "#2a1d18" },
  rot: { name: "Rot", c: "#e8a15f", belly: "#fbe3c8", dk: "#cc8240", eye: "#2a1d18" },
  braun: { name: "Braun", c: "#9b7254", belly: "#e7cfb6", dk: "#7d5a40", eye: "#2a1d18" }
};
const SP = {
  otter: { c: "#8b5e3c", belly: "#ecd2b2", dk: "#6e472c", ear: "small", inner: "#d9b48f", nose: "#3a2418", tail: "otter", apron: "#4f9fc9", hw: 74 },
  hamster: { c: "#e6a65d", belly: "#fff1dd", dk: "#c98a44", ear: "round", inner: "#f6b7a8", nose: "#e37d8a", cheeks: true, apron: "#e5607e", hw: 84 },
  squirrel: { c: "#c9672f", belly: "#f6dcbc", dk: "#a5521f", ear: "tuft", inner: "#f0b28a", nose: "#3a2418", tail: "bushy", cap: "#3a6fb8", bag: "#f2c94c" },
  mole: { c: "#4d4560", belly: "#6b6280", dk: "#3a3449", ear: "none", snout: "#d9a9bc", nose: "#f07fa2", eyeR: 5, snoutW: 30, snoutH: 30, noseR: 15, glasses: true, scarf: "#f2c94c" }
};
function catSpec(farbe){ const k = KATZEN[farbe] || KATZEN.lila; return { ...k, ear: "pointy", inner: "#f6b8c8", nose: "#f29bb5", tail: "cat", collar: "#8e5bd6" }; }
function critter(k){ // Füße bei (0,0), ca. 300 hoch
  const s = typeof k === "string" ? SP[k] : k, C = s.c, hy = -215; let t = "";
  if(s.tail === "bushy") t += `<path d="M35,-40 C150,-50 180,-200 120,-270 C95,-300 55,-280 75,-235 C100,-175 75,-120 25,-95Z" fill="${C}"/><path d="M60,-70 C130,-90 145,-190 110,-240" stroke="${s.belly}" stroke-width="8" fill="none" opacity=".5"/>`;
  if(s.tail === "cat") t += `<path d="M45,-25 C125,-25 140,-110 105,-150" stroke="${C}" stroke-width="20" fill="none" stroke-linecap="round"/>`;
  if(s.tail === "otter") t += `<path d="M40,-25 C105,-15 140,-35 158,-70 C125,-50 92,-52 50,-58Z" fill="${C}"/>`;
  t += `<ellipse cx="-30" cy="-10" rx="30" ry="15" fill="${s.dk}"/><ellipse cx="30" cy="-10" rx="30" ry="15" fill="${s.dk}"/>`;
  t += `<ellipse cy="-92" rx="70" ry="84" fill="${C}"/><ellipse cy="-80" rx="46" ry="58" fill="${s.belly}"/>`;
  if(s.apron) t += `<path d="M-44,-122 H44 L52,-34 Q0,-16 -52,-34Z" fill="${s.apron}"/><rect x="-18" y="-96" width="36" height="22" rx="5" fill="${shade(s.apron, .82)}"/>`;
  if(s.bag) t += `<path d="M-58,-160 L50,-64" stroke="#7a4f33" stroke-width="9"/><rect x="22" y="-88" width="74" height="56" rx="10" fill="${s.bag}"/><path d="M22,-72 H96" stroke="${shade(s.bag, .8)}" stroke-width="5"/>`;
  if(s.scarf) t += `<path d="M-56,-158 Q0,-128 56,-158 L60,-136 Q0,-106 -60,-136Z" fill="${s.scarf}"/><path d="M18,-134 l12,62 l20,-6 l-10,-58Z" fill="${s.scarf}"/>`;
  t += `<ellipse cx="-68" cy="-104" rx="19" ry="36" fill="${C}" transform="rotate(22 -68 -104)"/><ellipse cx="68" cy="-104" rx="19" ry="36" fill="${C}" transform="rotate(-22 68 -104)"/>`;
  if(s.ear === "round") t += [-1, 1].map(d => `<circle cx="${d * 54}" cy="${hy - 50}" r="24" fill="${C}"/><circle cx="${d * 54}" cy="${hy - 50}" r="12" fill="${s.inner}"/>`).join("");
  if(s.ear === "small") t += [-1, 1].map(d => `<circle cx="${d * 62}" cy="${hy - 36}" r="15" fill="${C}"/><circle cx="${d * 62}" cy="${hy - 36}" r="7" fill="${s.inner}"/>`).join("");
  if(s.ear === "pointy" || s.ear === "tuft") t += [-1, 1].map(d => `<path d="M${d * 70},${hy - 18} L${d * 52},${hy - 100} L${d * 14},${hy - 60}Z" fill="${C}"/><path d="M${d * 60},${hy - 32} L${d * 51},${hy - 82} L${d * 27},${hy - 58}Z" fill="${s.inner}"/>`).join("");
  if(s.ear === "tuft") t += [-1, 1].map(d => `<path d="M${d * 52},${hy - 100} l${d * -8},-26 M${d * 52},${hy - 100} l${d * 10},-24" stroke="${C}" stroke-width="7" stroke-linecap="round"/>`).join("");
  t += `<ellipse cy="${hy}" rx="${s.hw || 78}" ry="70" fill="${C}"/>`;
  if(s.cheeks) t += [-1, 1].map(d => `<ellipse cx="${d * 54}" cy="${hy + 22}" rx="34" ry="28" fill="${s.belly}"/>`).join("");
  t += `<ellipse cy="${hy + 24}" rx="${s.snoutW || 34}" ry="${s.snoutH || 24}" fill="${s.snout || s.belly}"/>`;
  const er = s.eyeR || 9, eye = s.eye || "#2a1d18";
  t += [-1, 1].map(d => `<circle cx="${d * 28}" cy="${hy - 8}" r="${er}" fill="${eye}"/><circle cx="${d * 28 + 3}" cy="${hy - 11}" r="${er / 3}" fill="#fff"/>`).join("");
  t += `<ellipse cy="${hy + 10}" rx="${s.noseR || 9}" ry="${(s.noseR || 9) * .7}" fill="${s.nose}"/>`;
  t += `<path d="M-11,${hy + 30} Q0,${hy + 39} 11,${hy + 30}" stroke="#3a2418" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  t += [-1, 1].map(d => `<ellipse cx="${d * 50}" cy="${hy + 14}" rx="14" ry="8" fill="#f08a9a" opacity=".45"/>`).join("");
  if(s.glasses) t += [-1, 1].map(d => `<circle cx="${d * 28}" cy="${hy - 8}" r="19" fill="none" stroke="#2b2b3a" stroke-width="4"/>`).join("") + `<path d="M-9,${hy - 8} H9" stroke="#2b2b3a" stroke-width="4"/>`;
  if(s.cap) t += `<path d="M-66,${hy - 38} Q0,${hy - 112} 66,${hy - 38}Z" fill="${s.cap}"/><path d="M-8,${hy - 40} H92 Q84,${hy - 24} -8,${hy - 30}Z" fill="${shade(s.cap, .8)}"/>`;
  if(s.collar) t += `<path d="M-50,-162 Q0,-140 50,-162" stroke="${s.collar}" stroke-width="11" fill="none" stroke-linecap="round"/><circle cy="-146" r="9" fill="#f2c94c"/>`;
  return t;
}
function heron(){ // ca. 400 hoch, schaut nach rechts
  return `<path d="M-15,0 L-5,-155 M20,0 L10,-155" stroke="#c9a24a" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M-70,-185 Q-125,-168 -150,-135 Q-95,-158 -50,-168Z" fill="#7d8b9b"/>
  <ellipse cy="-200" rx="82" ry="56" fill="#a9b6c4" transform="rotate(-15 0 -200)"/>
  <ellipse cx="-12" cy="-206" rx="60" ry="36" fill="#8f9cab" transform="rotate(-15 -12 -206)"/>
  <path d="M40,-230 C75,-280 10,-300 32,-338" stroke="#d3dbe3" stroke-width="30" fill="none" stroke-linecap="round"/>
  <ellipse cx="40" cy="-355" rx="38" ry="30" fill="#e8edf2"/>
  <path d="M72,-362 L155,-352 L72,-343Z" fill="#e8b53a"/>
  <path d="M18,-374 Q-22,-384 -44,-362" stroke="#3b4350" stroke-width="7" fill="none" stroke-linecap="round"/>
  <circle cx="50" cy="-360" r="6" fill="#2a1d18"/><circle cx="52" cy="-362" r="2" fill="#fff"/>
  <path d="M2,-376 Q40,-414 78,-376Z" fill="#6b8f4e"/><rect x="-8" y="-381" width="96" height="9" rx="4" fill="#58793e"/>`;
}
function snail(){ // ca. 250 hoch, schaut nach rechts
  return `<path d="M-135,0 Q-150,-32 -100,-40 L80,-40 Q118,-60 114,-140 Q116,-178 140,-182 Q166,-178 162,-140 Q162,-40 122,0Z" fill="#b9da8c"/>
  <path d="M130,-176 L114,-238 M152,-176 L168,-236" stroke="#9fc576" stroke-width="9" stroke-linecap="round"/>
  <circle cx="113" cy="-242" r="13" fill="#b9da8c"/><circle cx="169" cy="-240" r="13" fill="#b9da8c"/><circle cx="116" cy="-243" r="6" fill="#2a1d18"/><circle cx="171" cy="-241" r="6" fill="#2a1d18"/>
  <path d="M128,-146 Q140,-136 152,-146" stroke="#3a2418" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="160" cy="-156" rx="9" ry="5" fill="#f08a9a" opacity=".5"/>
  <circle cx="-12" cy="-128" r="96" fill="#e5975a"/><circle cx="-12" cy="-128" r="70" fill="#eeab72"/>
  <path d="M-12,-128 m0,-8 a8,8 0 1 1 -8,8 a20,20 0 1 1 20,20 a36,36 0 1 1 -36,-36 a52,52 0 1 1 52,52" stroke="#c97a3e" stroke-width="7" fill="none" stroke-linecap="round"/>
  <circle cx="-60" cy="-205" r="16" fill="#f7d14e"/><circle cx="-60" cy="-205" r="7" fill="#e5607e"/>`;
}
function azra(){ // Platzhalter, ihr eigenes Aussehen kommt mit Ticket 23
  const sk = "#d9a47f", hr = "#3b2720", dr = "#8e5bd6";
  return `<rect x="-26" y="-96" width="16" height="86" rx="8" fill="${sk}"/><rect x="10" y="-96" width="16" height="86" rx="8" fill="${sk}"/>
  <ellipse cx="-20" cy="-8" rx="24" ry="12" fill="#5b3a8a"/><ellipse cx="20" cy="-8" rx="24" ry="12" fill="#5b3a8a"/>
  <path d="M-30,-198 Q-74,-160 -84,-112" stroke="${sk}" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M30,-198 Q74,-160 84,-112" stroke="${sk}" stroke-width="18" fill="none" stroke-linecap="round"/>
  <path d="M-34,-206 L-80,-82 Q0,-62 80,-82 L34,-206Z" fill="${dr}"/><path d="M-76,-94 Q0,-76 76,-94" stroke="#c9a5ef" stroke-width="8" fill="none"/>
  <rect x="-10" y="-224" width="20" height="24" fill="${sk}"/><path d="M-24,-206 Q0,-188 24,-206Z" fill="#fff"/>
  <circle cy="-268" r="64" fill="${hr}"/><circle cx="-72" cy="-250" r="28" fill="${hr}"/><circle cx="72" cy="-250" r="28" fill="${hr}"/>
  <circle cx="-52" cy="-258" r="9" fill="#c9a5ef"/><circle cx="52" cy="-258" r="9" fill="#c9a5ef"/>
  <ellipse cy="-260" rx="54" ry="56" fill="${sk}"/>
  <path d="M-57,-268 Q-52,-332 0,-328 Q52,-332 57,-268 Q30,-298 0,-290 Q-30,-298 -57,-268Z" fill="${hr}"/>
  <path d="M30,-306 l6,12 l13,1 l-10,8 l4,13 l-13,-7 l-11,7 l3,-13 l-10,-8 l13,-1Z" fill="#f2c94c"/>
  <circle cx="-20" cy="-258" r="7" fill="#2a1d18"/><circle cx="20" cy="-258" r="7" fill="#2a1d18"/><circle cx="-18" cy="-260" r="2.4" fill="#fff"/><circle cx="22" cy="-260" r="2.4" fill="#fff"/>
  <path d="M-14,-236 Q0,-224 14,-236" stroke="#7a3b2e" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="-36" cy="-240" rx="11" ry="6" fill="#e9837b" opacity=".45"/><ellipse cx="36" cy="-240" rx="11" ry="6" fill="#e9837b" opacity=".45"/>`;
}
// Figur nach Art: Nachbarn, Azra oder ihre Katze (art "katze:<farbe>").
function figur(art){
  if(art === "heron") return heron();
  if(art === "snail") return snail();
  if(art === "azra") return azra();
  if(art.startsWith("katze:")) return critter(catSpec(art.slice(6)));
  return critter(art);
}
const defs = () => `<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#46328c" flood-opacity=".2"/></filter>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd8ff"/><stop offset="1" stop-color="#dff3ff"/></linearGradient></defs>`;
const B = { rng, shade, hot, spr, isoP, poly, box, roof, floor, shadowed, ping, KATZEN, figur, defs };
if(typeof module !== "undefined" && module.exports) module.exports = B; else root.BILD = B;
})(this);
