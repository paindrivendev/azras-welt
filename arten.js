/* Die 32 freigegebenen Aufgabenarten von Azras Welt (aus tierschule/prototype-aufgabenarten.html), jede eingehängt mit
   AUFGABEN.art({...}) (Vertrag: Kopf von aufgaben.js). Texte, Hilfe-Leitern und Lob sind freigegeben und unverändert.
   Erweiterungen aus der Schritt-Liste (prototype-schritte-batch1.html) sind Varianten der Aufgaben-Daten derselben Art:
     rechenstrich  {minus: true}           rückwärts springen (−10, −5, −1)
     zahlenstrahl  {bis: 20}               kurze Straße 0–20
     weiterschwingen {post, hilfe}         Lücke irgendwo, beliebige Kärtchen (ie, h oder nichts, Satzzeichen)
     ergaenzen     {a, b} oder {wort, res} ohne Lücke: Ergebnis von a + b tippen, Zahlwort als Ziffern tippen
     lesenmalen    {karte}                 Feld auf einem Karten-Gitter anmalen
     zahlenmauer   {b: [x, y]}             kleine Mauer mit 2 Reihen
   Jede Aufgabe kann mit bitte ihren eigenen Satz des Nachbarn mitbringen (aus der Schritt-Liste).
   probe.falsch / probe.richtig bedienen die echte Oberfläche wie ein Finger (Klick, Tippen, Ziehen); nur für den
   Rauchtest tests/arten_check.py. */
(function(){
"use strict";
const A = window.AUFGABEN;

// ---------- gemeinsame Bausteine ----------
const shuffle = a => { a = [...a]; for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Geld wie in der Schule: 50 ct, 1 €, 9 € 30 ct (gemischte Schreibweise, wie betrag in inhalt.js)
const fmt = c => c < 100 ? c + " ct" : c % 100 ? `${Math.floor(c / 100)} € ${c % 100} ct` : c / 100 + " €";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const COINS = [1, 2, 5, 10, 20, 50, 100];
const greedy = (v, set = [100, 50, 20, 10, 5, 2, 1]) => { const out = []; for(const c of set) while(v >= c){ out.push(c); v -= c; } return out; };
// Münzen bis 2 €, ab 5 € Scheine (Klasse schein); geld (optional): welche es auf dem Tablett gibt, sonst bis 1 €
const coinEl = v => { const d = document.createElement("div"); d.className = "coin c" + v + (v >= 500 ? " schein" : ""); d.textContent = fmt(v); d.dataset.v = v; return d; };
const geldSatz = it => it.geld ? [...it.geld].sort((a, b) => b - a) : undefined;
function coinGame(st, G, { tag, target, react, geld }){
  st.innerHTML = `<div class="scene"><div class="tag">${tag}</div><div class="zone counter" id="counter"><span class="ph">Hier hinlegen</span></div>
    <div class="hintline" id="sum"></div><div class="tray" id="tray"></div><button class="btn" id="go">Fertig</button></div>`;
  const counter = G.$("#counter"), tray = G.$("#tray"), sumEl = G.$("#sum");
  const sum = () => [...counter.querySelectorAll(".coin")].reduce((s, c) => s + +c.dataset.v, 0);
  const upd = G.ref.upd = () => { counter.querySelector(".ph").style.display = counter.querySelector(".coin") ? "none" : ""; if(G.ref.showSum) sumEl.textContent = "Schon hingelegt: " + fmt(sum()); };
  const put = v => { const c = coinEl(v); counter.appendChild(c); G.klang("pop"); G.draggable(c, { onTap: () => { c.remove(); upd(); }, onDrop: z => { if(!z || z.id !== "counter"){ c.remove(); upd(); } } }); upd(); };
  (geld || COINS).forEach(v => { const c = coinEl(v); tray.appendChild(c); G.draggable(c, { onTap: () => put(v), onDrop: z => { if(z && z.id === "counter") put(v); } }); });
  G.ref.clear = () => { counter.querySelectorAll(".coin").forEach(c => c.remove()); upd(); };
  G.ref.glow = vals => { tray.querySelectorAll(".coin").forEach(c => c.classList.toggle("glow", vals.includes(+c.dataset.v))); sumEl.textContent = vals.map(fmt).join(" + "); };
  G.$("#go").onclick = () => { if(G.locked) return; const s = sum(); if(s === target) G.solved(); else G.miss(react(s)); };
}
function strichSVG(min, max, marks, arcs){
  const W = 520, x = v => 30 + (v - min) / (max - min) * (W - 60); let s = `<svg viewBox="0 0 ${W} 130" class="strich"><line x1="14" y1="96" x2="${W - 14}" y2="96"/>`;
  for(const m of marks) s += `<line x1="${x(m.v)}" y1="86" x2="${x(m.v)}" y2="106"/><text x="${x(m.v)}" y="126">${m.t ?? m.v}</text>`;
  for(const a of arcs){ const x1 = x(a.f), x2 = x(a.t), mx = (x1 + x2) / 2, h = Math.min(70, (x2 - x1) * .5 + 18);
    s += `<path d="M${x1},92 Q${mx},${92 - h * 1.5} ${x2},92" class="arc"/>${a.l ? `<text x="${mx}" y="${92 - h * .85}" class="al">${a.l}</text>` : ""}`; }
  return s + "</svg>";
}
function keypad(st, G, onDone){
  let v = ""; const box = st.querySelector(".answerbox"), kp = st.querySelector(".keypad");
  kp.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "✓"].map(k => `<button class="btn ${k === "✓" ? "" : "ghost"}" data-k="${k}">${k}</button>`).join("");
  kp.querySelectorAll("button").forEach(b => b.onclick = () => { if(G.locked) return; const k = b.dataset.k;
    if(k === "⌫") v = v.slice(0, -1); else if(k === "✓"){ if(v) onDone(+v); return; } else if(v.length < 3) v += k; box.textContent = v; });
  return { clear(){ v = ""; box.textContent = ""; } };
}
// Wörter in Silben anzeigen (Bögen)
const sylHTML = (parts, cls = "") => parts.map(p => `<span class="syl ${cls}">${p}</span>`).join("");
// Fisch von x1 (Schwanz) bis x2 (Maul), gestrichelt = „so lang wäre er“
function fishSVG(x1, x2, y, dash){
  const w = x2 - x1, t = Math.min(28, w * .3), cy = y + 22;
  return `<path d="M${x1},${cy - 18} L${x1 + t},${cy} L${x1},${cy + 18} Z M${x1 + t * .7},${cy} C${x1 + t + w * .2},${cy - 26} ${x2 - w * .15},${cy - 24} ${x2},${cy} C${x2 - w * .15},${cy + 24} ${x1 + t + w * .2},${cy + 26} ${x1 + t * .7},${cy} Z"
    fill="${dash ? "none" : "#7fb3d9"}" stroke="#2b5d80" stroke-width="2.5" ${dash ? 'stroke-dasharray="6 5"' : ""}/>${dash ? "" : `<circle cx="${x2 - w * .12}" cy="${cy - 4}" r="3" fill="#2b2140"/>`}`;
}
// Schlüsselwörter eines Textes markierbar machen
const markKeys = (t, keys) => keys.reduce((s, k) => s.replace(k, `<span class="k">${k}</span>`), t);
// Schritt für Schritt etwas zeigen, solange die Aufgabe noch zu sehen ist
async function nacheinander(el, n, ms, fn){ for(let i = 0; i < n; i++){ if(!el.isConnected) return; fn(i); await sleep(ms); } }
// Zahlwörter bis 999 (Rückmeldung beim Zahlwort-Tippen)
const EIN = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const ZEHN = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];
function zahlwort(n){
  if(n >= 100){ const h = Math.floor(n / 100), r = n % 100; return (h === 1 ? "ein" : EIN[h]) + "hundert" + (r ? zahlwort(r) : ""); }
  if(n < 20) return EIN[n];
  const z = ZEHN[Math.floor(n / 10)], e = n % 10; return e ? (e === 1 ? "ein" : EIN[e]) + "und" + z : z;
}

// ---------- Finger für den Rauchtest (probe) ----------
const mitte = el => { el.scrollIntoView({ block: "center", inline: "center" }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const zeig = (el, typ, p) => el.dispatchEvent(new PointerEvent(typ, { bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: "mouse", isPrimary: true,
  clientX: p.x, clientY: p.y, button: 0, buttons: typ === "pointerup" ? 0 : 1 }));
const tippe = el => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
const tap = el => { const p = mitte(el); zeig(el, "pointerdown", p); zeig(el, "pointerup", p); };
const ziehe = (el, ziel) => { const a = mitte(el); zeig(el, "pointerdown", a); zeig(el, "pointermove", { x: a.x + 20, y: a.y + 20 }); const b = mitte(ziel); zeig(el, "pointermove", b); zeig(el, "pointerup", b); };
const warte = async (f, ms = 6000) => { for(let t = 0; t < ms; t += 20){ if(f()) return true; await sleep(20); } return false; };
function tippZahl(st, n){
  const kp = st.querySelector(".keypad"); for(let i = 0; i < 3; i++) tippe(kp.querySelector('[data-k="⌫"]'));
  for(const d of String(n)) tippe(kp.querySelector(`[data-k="${d}"]`)); const ok = kp.querySelector('[data-k="✓"]'); if(ok) tippe(ok);
}
// Münzen von der Theke nehmen, dann die gewünschten hinlegen und Fertig tippen
function legeMuenzen(st, werte){ st.querySelectorAll("#counter .coin").forEach(tap); for(const v of werte) tap(st.querySelector(`#tray .coin[data-v="${v}"]`)); tippe(st.querySelector("#go")); }

// ==================== MATHE ====================
A.art({ id: "bezahlen", fach: "mathe", titel: "Mit Münzen bezahlen", klang: "clink",
  en: { title: "Pay with coins", does: "drags or taps coins onto the shop counter to pay a price." },
  beispiel: [{ p: 65, thing: "Das Glitzerpapier" }, { p: 38, thing: "Die Haarspange für die Puppe" }, { p: 90, thing: "Die Bastelschere" },
    { p: 1240, geld: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000], bitte: "Für den Lieferanten brauche ich genau 12 € 40 ct. Leg das Geld auf die Theke." }],
  mount(st, it, G){ G.say("n", it.bitte || `${it.thing} kostet ${fmt(it.p)}. Leg das Geld auf die Theke.`);
    coinGame(st, G, { tag: `🏷️ ${fmt(it.p)}`, target: it.p, geld: it.geld, react: s => s < it.p ? `Da fehlen noch ${fmt(it.p - s)}.` : `Oh, das sind ${fmt(s - it.p)} zu viel.` }); },
  hint(r, it, G){ if(r === 1) return it.geld ? "Fang mit dem größten Geld an, das noch passt." : "Fang mit der größten Münze an, die noch passt.";
    if(r === 2){ G.ref.showSum = true; G.ref.upd(); return "Ich schreibe mit, wie viel schon daliegt."; }
    G.ref.clear(); G.ref.glow(greedy(it.p, geldSatz(it))); return it.geld ? "Dieses Geld passt zusammen. Leg du es hin." : "Diese Münzen passen zusammen. Leg du sie hin."; },
  praise: it => it.lob || "Du hast die Münzen zusammengezählt, bevor du bezahlt hast.",
  probe: { falsch: st => legeMuenzen(st, [1]), richtig: (st, it) => legeMuenzen(st, greedy(it.p, geldSatz(it))) } });

A.art({ id: "wechselgeld", fach: "mathe", titel: "Wechselgeld geben", klang: "clink",
  en: { title: "Give change", does: "gives a café guest the change from 1 € with coins (counting on to 100)." },
  beispiel: [{ p: 70, thing: "Kakao" }, { p: 45, thing: "Brezel" }, { p: 85, thing: "Apfelschorle" },
    { p: 370, pa: 220, pb: 150, bez: 500, geld: [1, 2, 5, 10, 20, 50, 100, 200], thing: "ein Muffin und ein Saft", tag: "2 € 20 ct + 1 € 50 ct · bezahlt: 5 €" }],
  mount(st, it, G){ G.say("n", it.bitte || `Mein ${it.thing} kostet ${fmt(it.p)}. Ich gebe dir 1 €. Bekomme ich Geld zurück?`);
    const bez = it.bez || 100, z = bez - it.p; // bez (optional): womit bezahlt wurde, sonst 1 €
    coinGame(st, G, { tag: it.tag || `${it.thing}: ${fmt(it.p)} · bezahlt: 1 €`, target: z, geld: it.geld, react: s => s < z ? `Da fehlen mir noch ${fmt(z - s)}.` : `Oh, das sind ${fmt(s - z)} zu viel.` }); },
  hint(r, it, G){ const bez = it.bez || 100;
    if(bez !== 100){ const euro = Math.ceil(it.p / 100) * 100;
      if(r === 1) return `Zähl von ${fmt(it.p)} weiter bis ${fmt(bez)}.`;
      if(r === 2){ G.$("#sum").textContent = euro > it.p && euro < bez ? `${fmt(it.p)} → ${fmt(euro)} → ${fmt(bez)}` : `${fmt(it.p)} → ${fmt(bez)}`; return euro > it.p && euro < bez ? "Zähl erst bis zum nächsten vollen Euro, dann weiter." : "Zähl in ganzen Euro weiter."; }
      G.ref.clear(); G.ref.glow(greedy(bez - it.p, geldSatz(it))); return "Dieses Geld passt. Leg du es hin."; }
    if(r === 1) return `Zähl von ${it.p} weiter bis 100.`;
    if(r === 2){ const t = Math.ceil(it.p / 10) * 10, marks = [{ v: it.p }]; for(let v = t; v <= 100; v += 10) if(v !== it.p) marks.push({ v, t: v === 100 ? "1 €" : "?" });
      G.$("#sum").innerHTML = strichSVG(it.p - 2, 102, marks, []); return "Hier ist ein Rechenstrich bis 1 €."; }
    G.ref.clear(); G.ref.glow(greedy(100 - it.p)); return `Zähl mit: ${it.p}, dann weiter bis 100. Leg du die leuchtenden Münzen hin.`; },
  praise: it => it.bez ? `Du hast weitergezählt bis ${fmt(it.bez)}.` : `Du hast von ${it.p} weitergezählt bis 1 €.`,
  probe: { falsch: st => legeMuenzen(st, [1]), richtig: (st, it) => legeMuenzen(st, greedy((it.bez || 100) - it.p, geldSatz(it))) } });

function packe(st, n){
  st.querySelectorAll("#box [data-v]").forEach(tap); const rod = st.querySelector('#tray [data-v="10"]'), bead = st.querySelector('#tray [data-v="1"]');
  for(let i = 0; i < Math.floor(n / 10); i++) tap(rod); for(let i = 0; i < n % 10; i++) tap(bead); tippe(st.querySelector("#go"));
}
A.art({ id: "zehner", fach: "mathe", titel: "Zehner und Einer legen", klang: "pop",
  en: { title: "Lay tens and ones", does: "packs rods of ten and single beads into a box until it holds the number." },
  beispiel: [{ n: 47 }, { n: 63 }, { n: 58 }],
  mount(st, it, G){ G.say("n", it.bitte || `Für das Armband brauche ich ${it.n} Perlen. Packst du sie ein?`);
    st.innerHTML = `<div class="scene"><div class="tag">${it.n} Perlen</div><div class="zone counter" id="box"><span class="ph">Schachtel</span></div><div class="hintline" id="ze"></div>
      <div class="tray" id="tray"><div class="rod" data-v="10">${"<i></i>".repeat(10)}</div><div class="bead" data-v="1"></div></div><button class="btn" id="go">Fertig</button></div>`;
    const box = G.$("#box"), ze = G.$("#ze"), val = () => [...box.querySelectorAll("[data-v]")].reduce((s, e) => s + +e.dataset.v, 0);
    const upd = G.ref.upd = () => { box.querySelector(".ph").style.display = box.querySelector("[data-v]") ? "none" : "";
      if(G.ref.showZE) ze.textContent = `Zehner: ${box.querySelectorAll(".rod").length} · Einer: ${box.querySelectorAll(".bead").length}`; };
    const put = src => { const c = src.cloneNode(true); c.classList.remove("glow"); box.appendChild(c); G.klang("pop"); G.draggable(c, { onTap: () => { c.remove(); upd(); }, onDrop: z => { if(!z || z.id !== "box"){ c.remove(); upd(); } } }); upd(); };
    G.$$("#tray [data-v]").forEach(t => G.draggable(t, { onTap: () => put(t), onDrop: z => { if(z && z.id === "box") put(t); } }));
    G.ref.clear = () => { box.querySelectorAll("[data-v]").forEach(e => e.remove()); upd(); };
    G.$("#go").onclick = () => { if(G.locked) return; const v = val(); v === it.n ? G.solved() : G.miss(`Ich zähle ${v} Perlen.`); }; },
  hint(r, it, G){ if(r === 1) return `Wie viele Zehner stecken in ${it.n}?`;
    if(r === 2){ G.ref.showZE = true; G.ref.upd(); return "Ich schreibe auf, wie viele Zehner und Einer schon drin sind."; }
    G.ref.clear(); G.$$("#tray [data-v]").forEach(e => e.classList.add("glow")); G.$("#ze").textContent = `${Math.floor(it.n / 10)} Zehnerstangen und ${it.n % 10} einzelne`;
    return `${it.n}: ${Math.floor(it.n / 10)} Zehner und ${it.n % 10} Einer. Pack du sie ein.`; },
  praise: () => "Du hast erst die Zehner gelegt und dann die Einer.",
  probe: { falsch: st => packe(st, 1), richtig: (st, it) => packe(st, it.n) } });

// Rechenstrich: plus springt vorwärts (+10, +5, +1), {minus: true} rückwärts (−10, −5, −1)
// Teilsprünge der Hilfe: erst die Zehner, dann bis zum Zehner, dann der Rest (13 − 5 → 3, 2; 62 − 25 → 20, 2, 3)
const teile = it => { const z = Math.floor(it.b / 10) * 10, e = it.b % 10, p = it.minus ? it.a - z : it.a + z, bis = it.minus ? p % 10 : (10 - p % 10) % 10;
  const ueber = bis > 0 && e > bis, T = [z, ...(ueber ? [bis, e - bis] : [e])].filter(x => x > 0); T.ueber = ueber; return T; };
function springe(st, spruenge){ for(let i = 0; i < 12; i++) tippe(st.querySelector("#undo")); for(const j of spruenge) tippe(st.querySelector(`[data-j="${j}"]`)); tippe(st.querySelector("#go")); }
A.art({ id: "rechenstrich", fach: "mathe", titel: "Springen am Rechenstrich", klang: "pop",
  en: { title: "Jumps on the Rechenstrich", does: "taps jumps (+10, +5, +1) along a number strip until the second number is added. Minus items jump backwards (−10, −5, −1)." },
  beispiel: [{ a: 38, b: 25 }, { a: 46, b: 30 }, { a: 57, b: 16 },
    { a: 13, b: 5, minus: true, bitte: "Ich hatte 13 Äpfel. 5 habe ich verkauft. Wie viele sind noch da? Spring rückwärts, erst bis zur 10." }, { a: 62, b: 25, minus: true }],
  mount(st, it, G){ const z = it.minus ? "−" : "+";
    G.say("n", it.bitte || (it.minus ? `Rechne ${it.a} − ${it.b} und spring am Rechenstrich rückwärts.` : `Rechne ${it.a} + ${it.b} und spring am Rechenstrich vorwärts.`));
    st.innerHTML = `<div class="scene"><div class="big">${it.a} ${z} ${it.b}</div><div id="rs" class="rs"></div><div class="hintline" id="ze"></div>
      <div class="row">${[10, 5, 1].map(j => `<button class="btn sm" data-j="${j}">${z}${j}</button>`).join("")}<button class="btn ghost sm" id="undo">↩</button><button class="btn" id="go">Fertig</button></div></div>`;
    const J = G.ref.J = [], rs = G.$("#rs");
    const draw = G.ref.draw = () => { let p = it.a; const arcs = [], marks = [{ v: it.a }];
      for(const j of J){ arcs.push(it.minus ? { f: p - j, t: p, l: "−" + j } : { f: p, t: p + j, l: "+" + j }); p += it.minus ? -j : j; marks.push({ v: p }); }
      rs.innerHTML = it.minus ? strichSVG(Math.min(Math.max(0, it.a - it.b - 12), p - 4), it.a + 2, marks, arcs) : strichSVG(it.a - 2, Math.max(it.a + it.b + 12, p + 4), marks, arcs); };
    G.$$("[data-j]").forEach(b => b.onclick = () => { if(G.locked) return; J.push(+b.dataset.j); G.klang("pop"); draw(); });
    G.$("#undo").onclick = () => { if(G.locked) return; J.pop(); draw(); };
    G.$("#go").onclick = () => { if(G.locked) return; const s = J.reduce((a, b) => a + b, 0); s === it.b ? G.solved() : G.miss(`Du bist bei ${it.minus ? it.a - s : it.a + s} gelandet.`); }; draw(); },
  hint(r, it, G){ const v = it.minus ? "−" : "+", T = teile(it), ueber = T.ueber;
    if(r === 1) return ueber ? (it.minus ? "Spring erst rückwärts bis zum Zehner." : "Spring erst bis zum nächsten Zehner.") : it.b >= 10 ? `Zerleg ${it.b}: Wie viele Zehner, wie viele Einer?` : `Welche Sprünge ergeben zusammen ${it.b}?`;
    if(r === 2){ const zl = T.length > 1 ? T : greedy(it.b, [10, 5, 1]);
      if(zl.length < 2) return "Das geht mit einem einzigen Sprung. Welcher Knopf ist genau so weit?";
      G.$("#ze").textContent = `${it.b} = ${zl.join(" + ")}`; return "So kannst du die Zahl zerlegen."; }
    G.ref.J.length = 0; G.ref.draw(); const seq = T.flatMap(t => greedy(t, [10, 5, 1])); G.$$("[data-j]").forEach(b => b.classList.toggle("glow", seq.includes(+b.dataset.j)));
    G.$("#ze").textContent = T.map(t => v + t).join("  "); return ueber ? "Erst bis zum Zehner, dann der Rest. Spring du." : "Erst die Zehnersprünge, dann der Rest. Spring du."; },
  praise: () => "Du hast zuerst große Sprünge gemacht und dann kleine.",
  probe: { falsch: st => springe(st, [1]), richtig: (st, it) => springe(st, greedy(it.b, [10, 5, 1])) } });

// Ziffernblock: mit Lücke {a, t, thing} (34 + _ = 50); ohne Lücke {a, b} (8 + 5 = _) oder {wort, res} (Zahlwort → Ziffern)
// Ticket 37: ohne Lücke auch {op: "-"} (43 − 5 = _) und {hilfe: [Satz, [Zeile, Satz], [Zeile, Satz]]} (Hilfsaufgabe +9 = +10 − 1);
// mit Lücke {einheit: "Brötchen"} statt Geld; lob (optional)
const loesung = it => it.wort ? it.res : it.b != null ? (it.op === "-" ? it.a - it.b : it.a + it.b) : it.t - it.a;
// Einer zu einer Zehnerzahl ohne Übergang: wie die kleine Aufgabe; minus über den Zehner: erst zurück bis zum Zehner
const einerFall = it => it.b != null && it.b < 10 && (it.op === "-" || (it.a % 10 > 0 && it.a % 10 + it.b <= 9));
function einerHilfe(it){ const m = it.op === "-", z = m ? "−" : "+", e = it.a % 10, k = m ? e - it.b : e + it.b, T = it.a - e;
  if(m && it.b > e && e === 0) return [`Denk an die kleine Aufgabe 10 − ${it.b}.`, [`10 − ${it.b} = ?`, "Das weißt du schon."], [`10 − ${it.b} = ${10 - it.b}, dazu die ${T - 10}`, "Jetzt noch die Zehner dazu, dann tipp."]];
  if(m && it.b > e) return ["Rechne erst zurück bis zum Zehner.", [`${it.a} − ${e} − ${it.b - e}`, `So zerlege ich die ${it.b}.`], [`${it.a} − ${e} = ${T}, ${T} − ${it.b - e} = ?`, "Rechne du den letzten Schritt."]];
  return [`Denk an die kleine Aufgabe ${e} ${z} ${it.b}.`, [`${e} ${z} ${it.b} = ?`, "Rechne erst mit den Einern."], [`${e} ${z} ${it.b} = ${k}, dazu die ${T}`, "Jetzt noch die Zehner dazu, dann tipp."]]; }
const teilpunkt = it => { const res = it.a + it.b, z = Math.ceil((it.a + 1) / 10) * 10; return z < res ? z : it.a + Math.floor(it.b / 10) * 10; };
A.art({ id: "ergaenzen", fach: "mathe", titel: "Ergänzen mit Ziffern tippen", klang: "clink",
  en: { title: "Type the number on a keypad", does: "types the missing number of a gap sum (34 + _ = 50) on a keypad. Without a gap: types the result of a plain sum (8 + 5 = ?, 43 − 5 = ?) or a number word in digits." },
  beispiel: [{ a: 34, t: 50, thing: "Der Lolli" }, { a: 27, t: 40, thing: "Das Stickerheft" }, { a: 72, t: 100, thing: "Der Puppenhut" },
    { a: 8, b: 5 }, { a: 37, b: 6 }, { wort: "vierundsiebzig", res: 74 }, { wort: "achtundvierzig", res: 48 },
    { a: 42, b: 5 }, { a: 43, b: 5, op: "-" }, { a: 68, b: 4, op: "-" },
    { a: 36, b: 9, hilfe: ["Rechne erst mit 10 statt mit 9.", ["36 + 10 − 1", "So rechne ich mit der Hilfsaufgabe."], ["36 + 10 = 46, 46 − 1 = ?", "Rechne du den letzten Schritt."]] },
    { a: 46, t: 50, einheit: "Brötchen", bitte: "In der Tüte sind 46 Brötchen. Wie viele fehlen bis 50?" }],
  mount(st, it, G){
    if(it.wort){ G.say("n", it.bitte || `Auf dem Paket steht: ${it.wort}. Tipp die Hausnummer mit Ziffern.`);
      st.innerHTML = `<div class="scene"><div class="tag">📦 ${it.wort}</div><div class="hintline" id="h"></div><div class="big"><span class="answerbox"></span></div><div class="keypad"></div></div>`;
    } else if(it.b != null){ const z = it.op === "-" ? "−" : "+"; G.say("n", it.bitte || `Rechne ${it.a} ${z} ${it.b} und tipp das Ergebnis.`);
      st.innerHTML = `<div class="scene"><div class="big">${it.a} ${z} ${it.b} = <span class="answerbox"></span></div><div class="hintline" id="h"></div><div id="rs" class="rs"></div><div class="keypad"></div></div>`;
    } else { G.say("n", it.bitte || `Du hast ${fmt(it.a)}. ${it.thing} kostet ${fmt(it.t)}. Wie viel fehlt dir noch?`);
      st.innerHTML = `<div class="scene"><div class="big">${it.a} + <span class="answerbox"></span> = ${it.t}</div><div id="rs" class="rs"></div><div class="keypad"></div></div>`; }
    const res = loesung(it);
    const react = x => it.wort ? `${x} heißt „${zahlwort(x)}“.`
      : it.b != null && it.op === "-" ? (x < it.a ? `${it.a} − ${it.a - x} wäre ${x}.` : `${x} ist nicht weniger als ${it.a}.`)
      : it.b != null ? (x > it.a ? `${it.a} + ${x - it.a} wäre ${x}.` : `${x} ist weniger als ${it.a}.`)
      : it.einheit ? `Mit ${x} ${it.einheit} mehr wären es ${it.a + x}.` : `Mit ${x} ct mehr hättest du ${fmt(it.a + x)}.`;
    const kp = keypad(st, G, x => { if(x === res) G.solved(); else { G.miss(react(x)); kp.clear(); } }); },
  hint(r, it, G){
    if(it.wort){ const m = it.res > 20 && it.res < 100 && it.res % 10 ? /^(.+)und(.+)$/.exec(it.wort) : null;
      if(r === 1) return m ? "Hör genau hin: Bei diesem Wort kommen die Einer zuerst." : "Lies das Wort langsam, Silbe für Silbe.";
      if(r === 2){ G.$("#h").textContent = m ? `${m[1]} · und · ${m[2]}` : it.wort; return "Hier ist das Wort in Teilen."; }
      G.$("#h").textContent = m ? `${m[2]} = ${Math.floor(it.res / 10)} Zehner · ${m[1]} = ${it.res % 10} Einer` : it.wort; return "Tipp erst die Zehner, dann die Einer."; }
    if(it.hilfe || einerFall(it)){ const x = (it.hilfe || einerHilfe(it))[r - 1]; if(!x) return null;
      if(typeof x === "string") return x; G.$("#h").textContent = x[0]; return x[1]; }
    if(it.b != null){ const res = it.a + it.b, m = teilpunkt(it), ueber = m === Math.ceil((it.a + 1) / 10) * 10;
      if(r === 1) return ueber ? "Rechne erst bis zum nächsten Zehner." : `Zerleg ${it.b}: Wie viele Zehner, wie viele Einer?`;
      const marks = [{ v: it.a }, ...(m !== it.a ? [{ v: m, t: r === 3 ? m : "" }] : []), { v: res, t: "?" }];
      const arcs = m !== it.a ? [{ f: it.a, t: m, l: "+" + (m - it.a) }, { f: m, t: res, l: "+" + (res - m) }] : [{ f: it.a, t: res, l: "+" + it.b }];
      G.$("#rs").innerHTML = strichSVG(it.a - 2, res + 2, marks, arcs);
      if(r === 2) return "So kannst du die Zahl zerlegen.";
      if(m !== it.a) G.$("#h").textContent = `${it.a} + ${m - it.a} = ${m}`; return `Von ${m} aus noch ${res - m} weiter, dann tipp das Ergebnis.`; }
    const z = Math.ceil(it.a / 10) * 10, eins = z === it.t || z === it.a;
    if(r === 1) return z === it.t ? `Wie viele fehlen von ${it.a} bis zum nächsten Zehner?` : z === it.a ? `Zähl von ${it.a} aus weiter bis ${it.t}.` : "Rechne erst bis zum nächsten Zehner.";
    const sp = (eins ? [[it.a, it.t]] : [[it.a, z], [z, it.t]]).map(([f, t]) => r === 2 ? { f, t } : { f, t, l: "+" + (t - f) });
    G.$("#rs").innerHTML = strichSVG(it.a - 2, it.t + 2, eins ? [{ v: it.a }, { v: it.t }] : [{ v: it.a }, { v: z }, { v: it.t }], sp);
    if(eins) return r === 2 ? "Hier ist der Sprung. Wie groß ist er?" : "Lies die Zahl am Sprung und tipp sie.";
    return r === 2 ? "Hier sind die zwei Sprünge. Wie groß ist jeder?" : "Zähl die beiden Sprünge zusammen und tipp das Ergebnis."; },
  praise: it => it.lob || (it.wort ? "Du hast das Wort genau gelesen." : einerFall(it) && !(it.op === "-" && it.b > it.a % 10) ? "Du hast an die kleine Aufgabe gedacht." : "Du hast erst bis zum Zehner gerechnet."),
  probe: { falsch: (st, it) => tippZahl(st, loesung(it) + 1), richtig: (st, it) => tippZahl(st, loesung(it)) } });

// Blitzrechnen (Ticket 33): Hilfe je nach Aufgabe – Zehnerzahlen wie Einer, über die 10 in zwei Schritten, nur die Einer, Punkte
function blitzHilfe(it){
  const { a, b, op, res } = it, z = op === "+" ? "+" : "−";
  if(a <= 10 && res <= 10){ const p = op === "+" ? "●".repeat(a) + " " + "●".repeat(b) : "●".repeat(a - b) + "○".repeat(b);
    return [op === "+" ? `Fang bei ${a} an und zähl im Kopf weiter.` : `Fang bei ${a} an und zähl im Kopf zurück.`,
      [p, op === "+" ? "Hier sind die Punkte." : "Die leeren Punkte nimmst du weg."], [p, "Zähl die vollen Punkte, dann tipp."]]; }
  if(a % 10 === 0 && b % 10 === 0) return ["Rechne mit den Zehnern wie mit kleinen Zahlen.",
    [`${a / 10} Zehner ${z} ${b / 10} Zehner`, "Das ist wie eine kleine Aufgabe."], [`${a / 10} ${z} ${b / 10} = ? → ? Zehner`, "Rechne die kleine Aufgabe, dann tipp die Zehnerzahl."]];
  if(op === "+" && a < 10){ const bis = 10 - a, rest = b - bis;
    return ["Rechne erst bis zur 10.", [`${a} + ${bis} + ${rest}`, `So zerlege ich die ${b}.`], [`${a} + ${bis} = 10, 10 + ${rest} = ?`, "Rechne du den letzten Schritt."]]; }
  if(op === "-" && res < 10){ const bis = a - 10, rest = b - bis;
    return ["Rechne erst zurück bis zur 10.", [`${a} − ${bis} − ${rest}`, `So zerlege ich die ${b}.`], [`${a} − ${bis} = 10, 10 − ${rest} = ?`, "Rechne du den letzten Schritt."]]; }
  const e = a % 10, ee = op === "+" ? e + b : e - b;
  return ["Schau nur auf die Einer.", [`${e} ${z} ${b} = ?`, "Rechne erst mit den Einern."], [`${e} ${z} ${b} = ${ee}, dazu die 10`, "Jetzt noch die 10 dazu."]];
}
A.art({ id: "blitzrechnen", fach: "mathe", titel: "Blitzrechnen: schnell im Kopf", klang: "chime",
  en: { title: "Quick sums against the lightning", does: "sees a plus or minus fact and types the result on a keypad; answering before the lightning bar runs out earns a ⚡ star, being slower costs nothing." },
  beispiel: [{ a: 7, b: 8, op: "+", res: 15, ms: 7000 }, { a: 13, b: 6, op: "-", res: 7, ms: 6000 }, { a: 30, b: 40, op: "+", res: 70, ms: 6000 },
    { a: 14, b: 3, op: "+", res: 17, ms: 7000 }, { a: 9, b: 4, op: "-", res: 5, ms: 8000 }],
  mount(st, it, G){ const z = it.op === "+" ? "+" : "−", ms = it.ms || 7000, frage = it.bitte || `Blitzrechnen! Wie viel ist ${it.a} ${it.op === "+" ? "plus" : "minus"} ${it.b}?`;
    const vor = 400 + 70 * frage.length, t0 = Date.now() + vor; // so lange etwa spricht der Nachbar die Frage; erst danach läuft der Blitz
    G.say("n", frage);
    st.innerHTML = `<div class="scene"><div class="blitzbahn" id="bb"><div class="blitzrest" id="bz"></div><span class="blitzicon">⚡</span></div>
      <div class="big">${it.a} ${z} ${it.b} = <span class="answerbox"></span></div><div class="hintline" id="h"></div><div class="keypad"></div></div>`;
    const bz = G.$("#bz"); bz.style.transition = `width ${ms}ms linear ${vor}ms`; requestAnimationFrame(() => requestAnimationFrame(() => { bz.style.width = "0%"; }));
    const kp = keypad(st, G, x => {
      if(x === it.res){ if(G.rung === 0 && !G.zusammen && Date.now() - t0 <= ms){ G.ref.stern = true; G.$("#bb").classList.add("stern"); } G.solved(); }
      else { G.miss(x > it.res ? `${x} ist ein bisschen zu viel.` : `${x} ist ein bisschen zu wenig.`); kp.clear(); } }); },
  hint(r, it, G){ const h = blitzHilfe(it); if(r === 1) return h[0]; G.$("#h").textContent = h[r - 1][0]; return h[r - 1][1]; },
  praise: (it, G) => G.ref.stern ? "Schneller als der Blitz!" : "Du hast im Kopf gerechnet.",
  probe: { falsch: (st, it) => tippZahl(st, it.res + 1), richtig: (st, it) => tippZahl(st, it.res) } });

A.art({ id: "hundert", fach: "mathe", titel: "Hausnummer auf der Hundertertafel", klang: "chime",
  en: { title: "House number on the Hundertertafel", does: "taps the square of a house number on the hundred square." },
  beispiel: [{ n: 47 }, { n: 23 }, { n: 86 }],
  mount(st, it, G){ G.say("n", it.bitte || `Dieser Brief ist für Hausnummer ${it.n}. Tipp auf das Haus.`);
    st.innerHTML = `<div class="scene"><div class="grid h100" id="g" style="grid-template-columns:repeat(10,1fr)"></div></div>`;
    const g = G.$("#g"); for(let k = 1; k <= 100; k++){ const d = document.createElement("div"); d.dataset.k = k; if(k <= 10 || k % 10 === 1){ d.textContent = k; d.classList.add("lbl"); }
      d.onclick = () => { if(G.locked) return; if(k === it.n){ d.classList.add("home"); d.textContent = "🏠"; G.solved(); } else { d.textContent = k; d.classList.add("seen"); G.miss(`Das ist Hausnummer ${k}.`); } }; g.appendChild(d); } },
  hint(r, it, G){ const rs = Math.floor((it.n - 1) / 10) * 10 + 1;
    if(r === 1) return `Such zuerst die Reihe, die mit ${rs} anfängt.`;
    if(r === 2){ G.$$("#g div").forEach(d => d.classList.toggle("rowhl", +d.dataset.k >= rs && +d.dataset.k < rs + 10)); return `In dieser Reihe wohnen ${rs} bis ${rs + 9}.`; }
    const g = G.$("#g"); nacheinander(g, it.n - rs, 350, i => { const d = g.querySelector(`div[data-k="${rs + i}"]`); d.textContent = rs + i; d.classList.add("seen"); });
    return `Zähl mit von ${rs} an. Tipp du auf ${it.n}.`; },
  praise: () => "Du hast erst die richtige Reihe gesucht.",
  probe: { falsch: (st, it) => tippe(st.querySelector(`#g div[data-k="${it.n === 1 ? 2 : it.n - 1}"]`)), richtig: (st, it) => tippe(st.querySelector(`#g div[data-k="${it.n}"]`)) } });

const beet = (st, r, c) => { tippe(st.querySelector(`#g div[data-r="${r - 1}"][data-c="${c - 1}"]`)); tippe(st.querySelector("#go")); };
A.art({ id: "punktefeld", fach: "mathe", titel: "Beet als Punktefeld (Malaufgaben)", klang: "pop",
  en: { title: "Flower bed as dot field", does: "taps the corner up to which a bed is planted: rows times flowers (multiplication)." },
  beispiel: [{ r: 3, c: 4 }, { r: 2, c: 5 }, { r: 4, c: 6 }],
  mount(st, it, G){ G.say("n", it.bitte || `Pflanz ${it.r} Reihen mit je ${it.c} Blumen. Tipp auf die Ecke, bis wohin gepflanzt wird.`);
    st.innerHTML = `<div class="scene"><div class="big">${it.r} · ${it.c}</div><div class="grid beet" id="g" style="grid-template-columns:repeat(8,1fr)"></div><button class="btn" id="go">Fertig</button></div>`;
    const g = G.$("#g"); let sel = null;
    for(let rr = 0; rr < 5; rr++) for(let cc = 0; cc < 8; cc++){ const d = document.createElement("div"); d.dataset.r = rr; d.dataset.c = cc;
      d.onclick = () => { if(G.locked) return; sel = { r: rr + 1, c: cc + 1 }; G.klang("pop");
        g.querySelectorAll("div").forEach(x => { const on = +x.dataset.r < sel.r && +x.dataset.c < sel.c; x.classList.toggle("on", on); x.textContent = on ? "🌷" : ""; }); }; g.appendChild(d); }
    G.$("#go").onclick = () => { if(G.locked || !sel) return; (sel.r === it.r && sel.c === it.c) ? G.solved() : G.miss(`Das sind ${sel.r} ${sel.r === 1 ? "Reihe" : "Reihen"} mit je ${sel.c} Blumen.`); }; },
  hint(r, it, G){ if(r === 1) return "Eine Reihe geht von links nach rechts.";
    G.$$("#g div").forEach(d => d.classList.toggle("guide", +d.dataset.r < (r === 2 ? 1 : it.r) && +d.dataset.c < it.c));
    return r === 2 ? `So lang ist eine Reihe mit ${it.c} Blumen.` : "Tipp du auf die Ecke unten rechts."; },
  praise: it => `Du hast ${it.r} gleich lange Reihen gepflanzt.`,
  probe: { falsch: (st, it) => it.r === 1 && it.c === 1 ? beet(st, 1, 2) : beet(st, 1, 1), richtig: (st, it) => beet(st, it.r, it.c) } });

// Uhr wie ein Finger stellen: langen Zeiger zur Seite, kurzen stellen, langen stellen
function stelleUhr(st, G, h, m){
  const svg = st.querySelector("#clk"), S = G.ref.S;
  const punkt = a => { const b = svg.getBoundingClientRect(), r = b.width * .3, w = a * Math.PI / 180; return { x: b.left + b.width / 2 + r * Math.sin(w), y: b.top + b.height / 2 - r * Math.cos(w) }; };
  const zug = (von, nach) => { zeig(svg, "pointerdown", punkt(von)); zeig(svg, "pointermove", punkt(nach)); zeig(svg, "pointerup", punkt(nach)); };
  const hA = (hh, mm) => ((hh % 12) + mm / 60) * 30, abst = (p, q) => { const d = Math.abs(p - q) % 360; return Math.min(d, 360 - d); };
  if(G.ref.mfixed) return zug(hA(S.h, S.m), hA(h, S.m));
  const park = [30, 20, 40, 10, 50].map(d => (m + d) % 60).find(p => abst(hA(S.h, p), p * 6) > 10 && abst(hA(h, p), p * 6) > 10);
  zug(S.m * 6, park * 6); zug(hA(S.h, S.m), hA(h, park)); zug(park * 6, m * 6);
}
A.art({ id: "uhr", fach: "mathe", titel: "Uhr stellen", klang: "chime",
  en: { title: "Set the clock", does: "turns the clock hands with her finger to a time (full, half, quarter hours)." },
  beispiel: [{ h: 7, m: 0, say: "7 Uhr" }, { h: 3, m: 30, say: "halb vier" }, { h: 9, m: 15, say: "Viertel nach neun" }, { h: 12, m: 0, say: "12 Uhr" },
    { h: 3, m: 45, say: "Viertel vor vier" }],
  mount(st, it, G){ G.say("n", it.bitte || `Treffen wir uns um ${it.say} am See? Stell die Uhr, damit du es nicht vergisst.`);
    const nums = [...Array(12)].map((_, i) => { const n = i + 1, a = n * Math.PI / 6; return `<text class="num" id="n${n}" x="${(80 * Math.sin(a)).toFixed(1)}" y="${(-80 * Math.cos(a) + 6).toFixed(1)}">${n}</text>`; }).join("");
    const ticks = [...Array(60)].map((_, i) => `<line x1="0" y1="-100" x2="0" y2="${i % 5 ? -95 : -90}" stroke="#2b2140" stroke-width="${i % 5 ? 1 : 3}" transform="rotate(${i * 6})"/>`).join("");
    st.innerHTML = `<div class="scene"><svg viewBox="-110 -110 220 220" class="clock" id="clk"><circle r="100" class="face"/>${ticks}${nums}<g id="tgt"></g>
      <line id="hh" x1="0" y1="0" x2="0" y2="-48" class="hh"/><line id="mh" x1="0" y1="0" x2="0" y2="-74" class="mh"/><circle r="6" fill="#2b2140"/></svg><button class="btn" id="go">Fertig</button></div>`;
    const S = G.ref.S = { h: it.h === 12 && !it.m ? 6 : 12, m: 0 }, svg = G.$("#clk"), mh = G.$("#mh"), hh = G.$("#hh");
    const draw = G.ref.draw = () => { mh.setAttribute("transform", `rotate(${S.m * 6})`); hh.setAttribute("transform", `rotate(${((S.h % 12) + S.m / 60) * 30})`); };
    const ang = e => { const b = svg.getBoundingClientRect(); return (Math.atan2(e.clientX - (b.left + b.width / 2), -(e.clientY - (b.top + b.height / 2))) * 180 / Math.PI + 360) % 360; };
    const dist = (p, q) => { const d = Math.abs(p - q) % 360; return Math.min(d, 360 - d); }; let drag = null;
    const mv = e => { if(!drag) return; const a = ang(e); if(drag === "m") S.m = (Math.round(a / 30) * 5) % 60; else { let h = Math.round(a / 30 - S.m / 60) % 12; if(h <= 0) h += 12; S.h = h; } draw(); };
    svg.addEventListener("pointerdown", e => { if(G.locked) return; const a = ang(e); drag = (G.ref.mfixed || dist(a, ((S.h % 12) + S.m / 60) * 30) < dist(a, S.m * 6)) ? "h" : "m";
      try{ svg.setPointerCapture(e.pointerId); }catch(x){} mv(e); });
    svg.addEventListener("pointermove", mv); svg.addEventListener("pointerup", () => drag = null);
    G.$("#go").onclick = () => { if(G.locked) return; (S.h === it.h && S.m === it.m) ? G.solved() : G.miss(`Die Uhr zeigt jetzt ${S.h}:${String(S.m).padStart(2, "0")} Uhr.`); }; draw(); },
  hint(r, it, G){ if(r === 1) return "Der lange Zeiger zeigt die Minuten, der kurze die Stunden.";
    if(r === 2){ const a = it.m * 6 * Math.PI / 180; G.$("#tgt").innerHTML = `<circle cx="${92 * Math.sin(a)}" cy="${-92 * Math.cos(a)}" r="9" fill="#ffe066" stroke="#c27a00" stroke-width="2"/>`; return "Am gelben Punkt steht der lange Zeiger."; }
    // nach halb steht der kurze Zeiger schon fast auf der nächsten Zahl ("Viertel vor vier": kurz vor die 4)
    const nach = it.h % 12 + 1, zahl = it.m > 30 ? nach : it.h;
    G.ref.S.m = it.m; G.ref.mfixed = true; G.ref.draw(); G.$(`#n${zahl}`).classList.add("glowt");
    const wo = !it.m ? `auf die ${it.h}` : it.m === 30 ? `genau zwischen die ${it.h} und die ${nach}` : it.m > 30 ? `kurz vor die ${nach}` : `kurz hinter die ${it.h}`;
    return `Den langen Zeiger habe ich gestellt. Dreh du den kurzen ${wo}.`; },
  praise: () => "Du hast zuerst auf den langen Zeiger geschaut.",
  probe: { falsch(st, it, G){ stelleUhr(st, G, it.h % 12 + 1, it.m); tippe(st.querySelector("#go")); }, richtig(st, it, G){ stelleUhr(st, G, it.h, it.m); tippe(st.querySelector("#go")); } } });

function fuettere(st, ziel){ st.querySelectorAll(".cat .fish").forEach(tap); const cats = [...st.querySelectorAll(".cat")];
  [...st.querySelectorAll("#pile .fish")].forEach((f, k) => ziehe(f, cats[ziel(k, cats.length)])); tippe(st.querySelector("#go")); }
A.art({ id: "verteilen", fach: "mathe", titel: "Gerecht verteilen", klang: "splash",
  en: { title: "Share fairly", does: "drags fish to the cats until every cat has the same number (division as sharing)." },
  beispiel: [{ n: 12, cats: ["Mina", "Lilo", "Tom"] }, { n: 10, cats: ["Mina", "Lilo"] }, { n: 8, cats: ["Mina", "Lilo", "Tom", "Fips"] }],
  mount(st, it, G){ G.say("n", it.bitte || `Verteil die ${it.n} Fische gerecht an die Katzen.`);
    st.innerHTML = `<div class="scene"><div class="zone counter" id="pile"></div><div class="cats">${it.cats.map((c, i) => `<div class="zone cat" data-i="${i}"><div class="cc"></div><div class="ce">🐱</div><div class="cn">${c}</div><div class="fishes"></div></div>`).join("")}</div><button class="btn" id="go">Fertig</button></div>`;
    const pile = G.$("#pile"), cats = G.$$(".cat");
    const upd = G.ref.upd = () => { const n = cats.map(c => c.querySelectorAll(".fish").length);
      cats.forEach((c, i) => { c.querySelector(".cc").textContent = G.ref.counts ? n[i] : ""; c.classList.toggle("glow", !!G.ref.walk && !!pile.querySelector(".fish") && i === n.indexOf(Math.min(...n))); }); };
    for(let k = 0; k < it.n; k++){ const f = document.createElement("div"); f.className = "fish"; f.textContent = "🐟"; pile.appendChild(f);
      G.draggable(f, { onDrop: z => { if(!z) return; const ziel = z.classList.contains("cat") ? z.querySelector(".fishes") : z.id === "pile" ? pile : null; if(ziel) ziel.appendChild(f); G.klang("pop"); upd(); },
        onTap: () => { if(f.parentElement !== pile){ pile.appendChild(f); upd(); } } }); }
    G.$("#go").onclick = () => { if(G.locked) return; const left = pile.querySelectorAll(".fish").length, n = cats.map(c => c.querySelectorAll(".fish").length);
      if(left) return G.miss(`Hier liegen noch ${left} ${left === 1 ? "Fisch" : "Fische"}.`);
      n.every(x => x === n[0]) ? G.solved() : G.miss(it.cats.map((c, i) => `${c} hat ${n[i]}`).join(", ") + "."); }; },
  hint(r, it, G){ if(r === 1) return "Gib jeder Katze reihum einen Fisch.";
    if(r === 2){ G.ref.counts = true; G.ref.upd(); return "Über jeder Katze steht jetzt, wie viele Fische sie hat."; }
    G.ref.counts = true; G.ref.walk = true; const pile = G.$("#pile"); G.$$(".cat .fish").forEach(f => pile.appendChild(f)); G.ref.upd(); return "Die leuchtende Katze ist dran. Gib ihr einen Fisch."; },
  thanks: () => "Miau! Alle haben gleich viel.", praise: () => "Du hast reihum verteilt, eine Katze nach der anderen.",
  probe: { falsch: st => fuettere(st, () => 0), richtig: st => fuettere(st, (k, n) => k % n) } });

const spiegelZiel = it => new Set(it.p.map(([r, c]) => r * 8 + (7 - c)));
function falte(st, ziel){ st.querySelectorAll("#g div").forEach((d, k) => { if(k % 8 >= 4 && d.classList.contains("on") !== ziel.has(k)) tippe(d); }); tippe(st.querySelector("#go")); }
A.art({ id: "spiegeln", fach: "mathe", titel: "Spiegeln am Basteltisch", klang: "paper",
  en: { title: "Mirror on the craft table", does: "taps squares on the right half so both halves match when the paper is folded." },
  beispiel: [{ p: [[0, 3], [1, 2], [1, 3], [2, 1], [2, 3], [3, 0], [3, 1], [3, 2], [3, 3], [4, 2], [5, 3]] }, { p: [[0, 1], [1, 2], [1, 3], [2, 0], [2, 3], [3, 2], [3, 3], [4, 1], [4, 3], [5, 0]] }],
  mount(st, it, G){ G.say("n", it.bitte || "Das Papier wird an der Linie gefaltet. Mal die rechte Seite so an, dass beim Falten alles aufeinanderliegt.");
    st.innerHTML = `<div class="scene"><div class="grid mirror" id="g" style="grid-template-columns:repeat(8,1fr)"></div><button class="btn" id="go">Fertig</button></div>`;
    const g = G.$("#g"), L = new Set(it.p.map(([r, c]) => r * 8 + c)), target = spiegelZiel(it), on = G.ref.on = new Set();
    G.ref.target = target; G.ref.cells = [];
    for(let r = 0; r < 6; r++) for(let c = 0; c < 8; c++){ const k = r * 8 + c, d = document.createElement("div"); G.ref.cells[k] = d; if(c === 3) d.classList.add("fold"); if(L.has(k)) d.classList.add("on");
      if(c >= 4) d.onclick = () => { if(G.locked) return; on.has(k) ? on.delete(k) : on.add(k); d.classList.toggle("on", on.has(k)); d.classList.remove("tg"); G.klang("pop"); }; else d.classList.add("fest"); g.appendChild(d); }
    G.$("#go").onclick = () => { if(G.locked) return; const miss = [...target].filter(k => !on.has(k)).length + [...on].filter(k => !target.has(k)).length;
      miss ? G.miss(`Beim Falten ${miss === 1 ? "liegt 1 Kästchen" : `liegen ${miss} Kästchen`} noch nicht aufeinander.`) : G.solved(); }; },
  hint(r, it, G){ if(r === 1) return "Jedes Kästchen hat einen Zwilling: gleich weit weg von der Faltlinie.";
    const { on, target, cells } = G.ref, bad = new Set([...target].filter(k => !on.has(k)).concat([...on].filter(k => !target.has(k))).map(k => Math.floor(k / 8)));
    if(r === 2){ cells.forEach((d, k) => d.classList.toggle("dim", !bad.has(Math.floor(k / 8)))); return "In den hellen Reihen passt es noch nicht."; }
    cells.forEach(d => d.classList.remove("dim")); [...on].filter(k => !target.has(k)).forEach(k => { on.delete(k); cells[k].classList.remove("on"); }); [...target].filter(k => !on.has(k)).forEach(k => cells[k].classList.add("tg"));
    return "Tipp du auf die hellen Kästchen."; },
  praise: () => "Du hast für jedes Kästchen den Zwilling gesucht.",
  probe: { falsch: st => falte(st, new Set()), richtig: (st, it) => falte(st, spiegelZiel(it)) } });

// Sachaufgabe: erst die Rechnung (eigene Hilfe-Leiter), dann das Ergebnis (eigene Hilfe-Leiter); "allein gelöst" zählt beide Schritte
A.art({ id: "sachaufgabe", fach: "mathe", titel: "Sachaufgabe: erst die Rechnung, dann das Ergebnis", klang: "clink",
  en: { title: "Word problem: pick the calculation, then the result", does: "reads a short story problem, taps the calculation that fits, then types the result." },
  beispiel: [{ t: "Otto hat 35 Brezeln. Er verkauft 12 Brezeln. Wie viele Brezeln hat er noch?", k: ["35 Brezeln", "verkauft 12", "noch"], ops: ["35 − 12", "35 + 12", "12 + 12"], res: 23, unit: "Brezeln",
      bad: { 1: "Mit 35 + 12 hätte Otto nach dem Verkaufen mehr Brezeln als vorher.", 2: "Bei 12 + 12 kommen Ottos 35 Brezeln gar nicht vor." }, op3: "Otto hatte 35 und gibt 12 weg.",
      r1: "Rechne in Schritten: erst die Zehner, dann die Einer.", s2: "35 − 10 = 25", s3: "Jetzt noch 25 − 2.", gegenprobe: x => `Ich mache die Probe: ${x} + 12 = ${x + 12}. Ich hatte aber 35 Brezeln.` },
    { t: "Hilde hat 24 Sticker. Azra schenkt ihr 18 Sticker. Wie viele Sticker hat Hilde jetzt?", k: ["24 Sticker", "schenkt ihr 18", "jetzt"], ops: ["24 + 18", "24 − 18", "18 + 18"], res: 42, unit: "Sticker",
      bad: { 1: "Mit 24 − 18 hätte Hilde nach dem Geschenk weniger Sticker als vorher.", 2: "Bei 18 + 18 fehlen Hildes eigene 24 Sticker." }, op3: "Hilde hat 24 und bekommt 18 dazu.",
      r1: "Rechne in Schritten: erst die Zehner, dann die Einer.", s2: "24 + 10 = 34", s3: "Jetzt noch 34 + 8.", gegenprobe: x => `Ich mache die Probe: ${x} − 18 = ${x - 18}. Hilde hatte aber 24.` },
    { t: "Otto deckt 4 Tische. Auf jeden Tisch stellt er 5 Becher. Wie viele Becher braucht er?", k: ["4 Tische", "jeden Tisch", "5 Becher"], ops: ["4 · 5", "4 + 5", "5 − 4"], res: 20, unit: "Becher",
      bad: { 1: "Mit 4 + 5 hätte nur ein Tisch seine 5 Becher.", 2: "Mit 5 − 4 wären es weniger Becher als auf einem einzigen Tisch." }, op3: "4 Tische, auf jedem 5 Becher: 4-mal 5.",
      r1: "4 · 5 heißt: 4-mal die 5.", s2: "5 + 5 + 5 + 5", s3: "Zähl weiter: 5, 10, 15 …", gegenprobe: x => `Mit ${x} Bechern stehen nicht auf jedem der 4 Tische genau 5.` }],
  mount(st, it, G){ G.say("n", it.t); G.ref.phase = "op"; G.ref.resMiss = 0;
    st.innerHTML = `<div class="scene"><div class="sachtext" id="t">${markKeys(it.t, it.k)}</div><div class="hintline" id="h"></div>
      <div class="row" id="ops">${shuffle(it.ops.map((o, i) => [o, i])).map(([o, i]) => `<button class="btn ghost opbtn" data-i="${i}">${o}</button>`).join("")}</div>
      <div id="res" class="scene" style="padding:0" hidden><div class="big"><span id="opl"></span> = <span class="answerbox"></span></div><div class="keypad"></div></div></div>`;
    const ops = G.$$("#ops .btn"), h = G.$("#h"), res = G.$("#res");
    ops.forEach(b => b.onclick = () => { if(G.locked || G.ref.phase !== "op") return; const i = +b.dataset.i;
      if(i !== 0) return G.miss(it.bad[i]);
      G.klang("pop"); b.classList.add("on"); ops.forEach(x => { x.classList.remove("glow"); if(x !== b) x.style.opacity = .3; });
      G.ref.phase = "res"; h.textContent = ""; G.$("#opl").textContent = it.ops[0]; res.hidden = false; G.say("n", "Und was kommt heraus?"); });
    const kp = keypad(res, G, x => { if(x === it.res) G.solved(); else { G.ref.resMiss++; G.miss(it.gegenprobe(x)); kp.clear(); } }); },
  hint(r, it, G){
    if(G.ref.phase === "op"){ if(r === 1) return "Lies die Frage am Ende: Wird es mehr oder weniger?";
      if(r === 2){ G.$$("#t .k").forEach(k => k.classList.add("hl")); return "Diese Wörter verraten die Rechnung."; }
      G.$$("#ops .btn").forEach(b => b.classList.toggle("glow", b.dataset.i === "0")); return `${it.op3} Tipp du die leuchtende Rechnung.`; }
    const rr = Math.min(G.ref.resMiss, 3); if(!rr) return null;   // Hilfe aus der Rechnungs-Stufe kam zu spät
    if(rr === 1) return it.r1;
    if(rr === 2){ G.$("#h").textContent = it.s2; return "So fängt die Rechnung an."; }
    G.$("#h").textContent = `${it.s2}   ·   ${it.s3}`; return `${it.s3} Tipp du das Ergebnis.`; },
  thanks: it => `Danke! Jetzt weiß ich es: ${it.res} ${it.unit}.`, praise: () => "Du hast erst überlegt, welche Rechnung passt.",
  probe: {
    // erster Versuch: falsche Rechnung; danach die richtige Rechnung und ein falsches Ergebnis (so kommen beide Hilfe-Leitern dran)
    falsch(st, it, G){ if(G.ref.phase === "op" && !G.rung) return tippe(st.querySelector('#ops [data-i="1"]'));
      if(G.ref.phase === "op") tippe(st.querySelector('#ops [data-i="0"]')); tippZahl(st.querySelector("#res"), it.res + 1); },
    richtig(st, it, G){ if(G.ref.phase === "op") tippe(st.querySelector('#ops [data-i="0"]')); tippZahl(st.querySelector("#res"), it.res); } } });

A.art({ id: "messen", fach: "mathe", titel: "Fisch messen mit dem Lineal", klang: "splash",
  en: { title: "Measure a fish with the ruler", does: "reads the fish's length off a ruler and types it in cm. The third fish does not start at 0." },
  beispiel: [{ a: 0, b: 7 }, { a: 0, b: 12 }, { a: 2, b: 11 }],
  mount(st, it, G){ G.say("n", it.bitte || "Schau, was ich gefangen habe! Wie lang ist mein Fisch? Miss mit dem Lineal.");
    st.innerHTML = `<div class="scene"><svg viewBox="0 0 600 180" class="nl" id="r"></svg><div class="big"><span class="answerbox"></span> cm</div><div class="keypad"></div></div>`;
    const X = v => 30 + v * 36, svg = G.$("#r"); G.ref.extra = ""; G.ref.ghost = "";
    const draw = G.ref.draw = () => { let s = `<rect x="10" y="110" width="580" height="60" rx="6" fill="#fff3c4" stroke="#c9a94a" stroke-width="2"/>`;
      for(let c = 0; c <= 15; c++){ s += `<line x1="${X(c)}" y1="110" x2="${X(c)}" y2="138" stroke="#2b2140" stroke-width="2"/><text x="${X(c)}" y="160" font-size="15" text-anchor="middle">${c}</text>`;
        if(c < 15) s += `<line x1="${X(c + .5)}" y1="110" x2="${X(c + .5)}" y2="124" stroke="#2b2140"/>`; }
      svg.innerHTML = s + fishSVG(X(it.a), X(it.b), 62) + G.ref.ghost + G.ref.extra; };
    G.ref.X = X; draw();
    const kp = keypad(st, G, x => { if(x === it.b - it.a) return G.solved(); kp.clear();
      G.ref.ghost = `<g opacity=".8">${fishSVG(X(it.a), X(Math.min(it.a + x, 15)), 2, true)}</g>`; draw();
      G.miss(`Ein Fisch mit ${x} cm wäre so lang wie der gestrichelte.`); }); },
  hint(r, it, G){ const X = G.ref.X; if(r === 1) return "Schau, wo die Schwanzflosse anfängt und wo das Maul aufhört.";
    G.ref.extra = [it.a, it.b].map(v => `<line x1="${X(v)}" y1="40" x2="${X(v)}" y2="140" stroke="#8e5bd6" stroke-width="3" stroke-dasharray="6 4"/>`).join("");
    if(r === 3) for(let i = 0; i < it.b - it.a - 1; i++) G.ref.extra += `<text x="${X(it.a + i + .5)}" y="134" font-size="14" text-anchor="middle" fill="#8e5bd6" font-weight="700">${i + 1}</text>`;
    G.ref.draw(); return r === 2 ? "An den lila Linien fängt der Fisch an und hört auf." : "Ich zähle die Zentimeter mit. Den letzten zählst du und tippst die Zahl."; },
  thanks: it => `Mein Fisch ist ${it.b - it.a} cm lang!`, praise: () => "Du hast genau geschaut, wo der Fisch anfängt.",
  probe: { falsch: (st, it) => tippZahl(st, it.b - it.a + 1), richtig: (st, it) => tippZahl(st, it.b - it.a) } });

// Zahlenmauer: b mit 3 Zahlen = Mauer mit 3 Reihen, b mit 2 Zahlen = kleine Mauer mit 2 Reihen
const MAUER = {
  3: { reihen: [["t0"], ["m0", "m1"], ["b0", "b1", "b2"]], order: ["b0", "b1", "b2", "m0", "m1", "t0"],
    wert: b => { const v = { b0: b[0], b1: b[1], b2: b[2], m0: b[0] + b[1], m1: b[1] + b[2] }; v.t0 = v.m0 + v.m1; return v; },
    rel: { m0: [["+", "b0", "b1"], ["−", "t0", "m1"]], m1: [["+", "b1", "b2"], ["−", "t0", "m0"]], t0: [["+", "m0", "m1"]], b0: [["−", "m0", "b1"]], b1: [["−", "m0", "b0"], ["−", "m1", "b2"]], b2: [["−", "m1", "b1"]] } },
  2: { reihen: [["t0"], ["b0", "b1"]], order: ["b0", "b1", "t0"], wert: b => ({ b0: b[0], b1: b[1], t0: b[0] + b[1] }),
    rel: { t0: [["+", "b0", "b1"]], b0: [["−", "t0", "b1"]], b1: [["−", "t0", "b0"]] } } };
function mauere(st, it, falsch){ const val = MAUER[it.b.length].wert(it.b), kp = st.querySelector(".keypad");
  for(const k of it.hide){ tippe(st.querySelector(`.brick[data-k="${k}"]`)); for(let i = 0; i < 3; i++) tippe(kp.querySelector('[data-k="⌫"]'));
    for(const d of String(val[k] + (falsch ? 1 : 0))) tippe(kp.querySelector(`[data-k="${d}"]`)); }
  tippe(st.querySelector("#go")); }
A.art({ id: "zahlenmauer", fach: "mathe", titel: "Zahlenmauer", klang: "pop",
  en: { title: "Number wall (Zahlenmauer)", does: "fills the empty bricks; each brick is the two bricks below it added together. Some walls run backwards (a bottom brick is missing); small walls have only 2 rows." },
  beispiel: [{ b: [3, 5, 2], hide: ["m0", "m1", "t0"] }, { b: [10, 7, 6], hide: ["b1", "m1"] }, { b: [20, 15, 25], hide: ["m0", "m1", "t0"] },
    { b: [7, 2], hide: ["b1"], bitte: "Meine kleine Mauer hat oben eine 9. Unten links steht 7. Welcher Stein fehlt?" }, { b: [4, 5], hide: ["t0"] }],
  mount(st, it, G){ G.say("n", it.bitte || "Ich baue eine Zahlenmauer für mein Beet. Jeder Stein ist so viel wie die zwei Steine darunter zusammen. Füllst du die leeren Steine?");
    const M = MAUER[it.b.length], val = M.wert(it.b), inp = {}; let sel = it.hide[0];
    G.ref.val = val; G.ref.inp = inp; G.ref.order = M.order.filter(k => it.hide.includes(k)); G.ref.rel = M.rel; G.ref.hide = it.hide;
    st.innerHTML = `<div class="scene"><div class="wall" id="w">${M.reihen.map(r => `<div class="wr">${r.map(k => `<div class="brick ${it.hide.includes(k) ? "hid" : ""}" data-k="${k}">${it.hide.includes(k) ? "" : val[k]}</div>`).join("")}</div>`).join("")}</div>
      <div class="hintline" id="h"></div><div class="keypad"></div><button class="btn" id="go">Fertig</button></div>`;
    const upd = () => G.$$(".brick.hid").forEach(d => { d.textContent = inp[d.dataset.k] ?? ""; d.classList.toggle("sel", d.dataset.k === sel); });
    G.$$(".brick.hid").forEach(d => d.onclick = () => { if(G.locked) return; sel = d.dataset.k; upd(); });
    const kp = G.$(".keypad"); kp.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0].map(k => `<button class="btn ghost" data-k="${k}">${k}</button>`).join("");
    kp.querySelectorAll("button").forEach(b => b.onclick = () => { if(G.locked || !sel) return; const k = b.dataset.k, v = inp[sel] ?? "";
      inp[sel] = k === "⌫" ? v.slice(0, -1) : (v.length < 3 ? v + k : v); if(inp[sel] === "") delete inp[sel]; upd(); });
    upd();
    G.$("#go").onclick = () => { if(G.locked) return; if(it.hide.some(k => inp[k] === undefined)) return G.say("n", "Es sind noch Steine leer.");
      const bad = it.hide.filter(k => +inp[k] !== val[k]); if(!bad.length) return G.solved();
      const w = G.$("#w"); w.classList.remove("wobble"); void w.offsetWidth; w.classList.add("wobble"); G.klang("plop");
      G.miss(`Die Mauer wackelt: ${bad.length === 1 ? "1 Stein passt" : bad.length + " Steine passen"} noch nicht in die Mauer.`); }; },
  hint(r, it, G){ if(r === 1) return "Jeder Stein ist so viel wie die zwei Steine darunter zusammen.";
    const { val, inp, order, rel, hide } = G.ref, known = x => !hide.includes(x) || +inp[x] === val[x];
    const pick = k => rel[k].find(([, x, y]) => known(x) && known(y)), offen = order.filter(k => +inp[k] !== val[k]);
    const k = offen.find(pick) || offen[0] || order[0], [op, x, y] = pick(k) || rel[k][0];
    G.$$(".brick").forEach(d => d.classList.toggle("glow", d.dataset.k === k || d.dataset.k === x || d.dataset.k === y));
    if(r === 2) return "Schau auf die leuchtenden Steine.";
    G.$("#h").textContent = `${val[x]} ${op} ${val[y]} = ?`; return "Rechne du und tipp die Zahl in den leuchtenden leeren Stein."; },
  thanks: () => "Danke! Die Mauer steht fest.", praise: () => "Du hast immer die zwei Steine darunter zusammengerechnet.",
  probe: { falsch: (st, it) => mauere(st, it, true), richtig: (st, it) => mauere(st, it, false) } });

// Zahlenstrahl: lange Straße 0–100 oder {bis: 20} kurze Straße 0–20
const SKALA = { 100: { klein: 5, gross: 10, tol: 3, zeile: "Ich schreibe die Zehner an die Straße." }, 20: { klein: 1, gross: 5, tol: .5, zeile: "Ich schreibe die Fünfer an die Straße." } };
function stelleHaus(st, v, bis){ const svg = st.querySelector("#nl"); svg.scrollIntoView({ block: "center" }); const b = svg.getBoundingClientRect();
  const p = { x: b.left + (30 + v * 540 / bis) / 600 * b.width, y: b.top + b.height * .6 }; zeig(svg, "pointerdown", p); zeig(svg, "pointerup", p); tippe(st.querySelector("#go")); }
A.art({ id: "zahlenstrahl", fach: "mathe", titel: "Zahlenstrahl: Haus an die richtige Stelle", klang: "chime",
  en: { title: "Number line: put the house in its place", does: "drags a house along a 0–100 street to the house number (within 3); on the short street 0–20 to the exact number." },
  beispiel: [{ n: 60, h: "Es ist der lange Strich gleich nach der 50." }, { n: 75, h: "Zwischen 70 und 80, genau in der Mitte." }, { n: 92, h: "Zwischen 90 und 100, ganz nah bei 90." },
    { n: 15, bis: 20, h: "Genau in der Mitte zwischen 10 und 20.", bitte: "Hier ist ein Brief für Nummer 15. Zieh das Haus an die richtige Stelle der kurzen Straße." }, { n: 7, bis: 20, h: "Zwei Striche nach der 5." }],
  mount(st, it, G){ G.say("n", it.bitte || `Dieser Brief ist für Hausnummer ${it.n}. Zieh das Haus an die richtige Stelle der Straße.`);
    const bis = it.bis || 100, sk = SKALA[bis], u = 540 / bis;
    st.innerHTML = `<div class="scene"><div class="tag">✉️ Nr. ${it.n}</div><svg viewBox="0 0 600 130" class="nl" id="nl"></svg><button class="btn" id="go">Fertig</button></div>`;
    const X = v => 30 + v * u, svg = G.$("#nl"); G.ref.pos = null;
    const draw = G.ref.draw = () => { let s = G.ref.band != null ? `<rect x="${X(G.ref.band)}" y="58" width="${sk.gross * u}" height="40" fill="#ffe066" opacity=".6"/>` : "";
      s += `<line x1="${X(0)}" y1="80" x2="${X(bis)}" y2="80" stroke="#2b2140" stroke-width="4"/>`;
      for(let v = 0; v <= bis; v += sk.klein){ const big = v % sk.gross === 0; s += `<line x1="${X(v)}" y1="${big ? 66 : 72}" x2="${X(v)}" y2="${big ? 94 : 88}" stroke="#2b2140" stroke-width="${big ? 3 : 1.5}"/>`;
        if(v === 0 || v === bis || (big && G.ref.labels)) s += `<text x="${X(v)}" y="118" font-size="16" text-anchor="middle">${v}</text>`; }
      if(G.ref.pos != null) s += `<text x="${X(G.ref.pos)}" y="60" font-size="34" text-anchor="middle">🏠</text>`;
      svg.innerHTML = s; };
    const set = e => { const b = svg.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * 600; G.ref.pos = Math.max(0, Math.min(bis, (x - 30) / u)); draw(); };
    let down = false; svg.addEventListener("pointerdown", e => { if(G.locked) return; down = true; try{ svg.setPointerCapture(e.pointerId); }catch(x){} set(e); });
    svg.addEventListener("pointermove", e => { if(down && !G.locked) set(e); }); svg.addEventListener("pointerup", () => down = false);
    G.$("#go").onclick = () => { if(G.locked || G.ref.pos == null) return; const p = G.ref.pos; Math.abs(p - it.n) <= sk.tol ? G.solved() : G.miss(`Dort wohnt ungefähr Nummer ${Math.round(p)}.`); }; draw(); },
  hint(r, it, G){ const bis = it.bis || 100, sk = SKALA[bis]; if(r === 1) return `In der Mitte der Straße ist die ${bis / 2}.`; G.ref.labels = true;
    if(r === 3) G.ref.band = Math.floor(it.n / sk.gross) * sk.gross; G.ref.draw();
    return r === 2 ? sk.zeile : `${it.h} Stell du das Haus hin.`; },
  thanks: it => `Danke! Der Brief ist bei Nummer ${it.n}.`, praise: () => "Du hast dich an den Zehnern orientiert.",
  probe: { falsch: (st, it) => { const bis = it.bis || 100; stelleHaus(st, it.n > bis / 2 ? it.n - bis / 5 : it.n + bis / 5, bis); }, richtig: (st, it) => stelleHaus(st, it.n, it.bis || 100) } });

const VERKAUFT = [["🍎", "Äpfel", 7], ["🍌", "Bananen", 4], ["🍐", "Birnen", 5], ["🍓", "Erdbeeren", 9]];
A.art({ id: "diagramm", fach: "mathe", titel: "Säulendiagramm lesen", klang: "chime",
  en: { title: "Read a bar chart", does: "reads Hilde's sales chart: taps the tallest bar, reads one value, compares two bars. A wrong number draws a dashed line at that height." },
  beispiel: [{ d: VERKAUFT, q: "Wovon habe ich am meisten verkauft? Tipp die Säule an.", kind: "tap", a: 3 }, { d: VERKAUFT, q: "Wie viele Bananen habe ich verkauft?", kind: "num", a: 4, bars: [1] },
    { d: VERKAUFT, q: "Wie viele Äpfel habe ich mehr verkauft als Birnen?", kind: "num", a: 2, bars: [0, 2] }],
  mount(st, it, G){ G.say("n", it.bitte || `Das habe ich heute verkauft. ${it.q}`); const D = it.d;
    st.innerHTML = `<div class="scene"><div class="big" style="font-size:26px">${it.q}</div><svg viewBox="0 0 460 340" class="chart" id="ch"></svg>${it.kind === "num" ? `<div class="big"><span class="answerbox"></span></div><div class="keypad"></div>` : ""}</div>`;
    const Y = v => 290 - Math.min(v, 10.5) * 26, svg = G.$("#ch");
    const draw = G.ref.draw = () => { let s = ""; for(let v = 0; v <= 10; v++) s += `<line x1="50" y1="${Y(v)}" x2="450" y2="${Y(v)}" stroke="${v ? "#eee6f6" : "#2b2140"}" stroke-width="${v ? 1 : 2}"/><text x="38" y="${Y(v) + 5}" font-size="14" text-anchor="end">${v}</text>`;
      D.forEach(([e, , v], i) => { const x = 80 + i * 100, dim = G.ref.dim && !G.ref.dim.includes(i); s += `<g class="bar" data-i="${i}" opacity="${dim ? .25 : 1}">`;
        for(let u = 0; u < v; u++){ const yl = G.ref.shade && G.ref.shade.bar === i && u >= G.ref.shade.from; s += `<rect x="${x}" y="${Y(u + 1)}" width="60" height="26" fill="${yl ? "#ffe066" : "#b48be6"}" stroke="#fff" stroke-width="1.5"/>`;
          if(G.ref.count && G.ref.count.bar === i && u < G.ref.count.upTo) s += `<text x="${x + 30}" y="${Y(u) - 7}" font-size="15" text-anchor="middle" fill="#fff" font-weight="700">${u + 1}</text>`; }
        if(G.ref.glowBar === i) s += `<rect x="${x - 4}" y="${Y(v) - 4}" width="68" height="${v * 26 + 8}" fill="none" stroke="#ffb800" stroke-width="5"/>`;
        s += `<text x="${x + 30}" y="322" font-size="28" text-anchor="middle">${e}</text></g>`; });
      (G.ref.guides || []).forEach(v => s += `<line x1="50" y1="${Y(v)}" x2="450" y2="${Y(v)}" stroke="#8e5bd6" stroke-width="2.5" stroke-dasharray="7 5"/>`);
      if(G.ref.ghost != null) s += `<line x1="50" y1="${Y(G.ref.ghost)}" x2="450" y2="${Y(G.ref.ghost)}" stroke="#c27a00" stroke-width="3" stroke-dasharray="3 5"/>`;
      svg.innerHTML = s;
      if(it.kind === "tap") svg.querySelectorAll(".bar").forEach(g => g.onclick = () => { if(G.locked) return; const i = +g.dataset.i; i === it.a ? G.solved() : G.miss(`${D[i][1]} habe ich ${D[i][2]} verkauft. Von etwas anderem mehr.`); }); };
    draw();
    if(it.kind === "num"){ const kp = keypad(st, G, x => { if(x === it.a) return G.solved(); kp.clear();
      if(it.bars.length === 1){ G.ref.ghost = x; draw(); G.miss(`So hoch wäre die Säule bei ${x} ${D[it.bars[0]][1]}: die gestrichelte Linie.`); }
      else { const base = D[it.bars[1]][2]; G.ref.ghost = base + x; draw(); G.miss(`Dann hätte ich ${base + x} ${D[it.bars[0]][1]} verkauft: die gestrichelte Linie.`); } }); } },
  hint(r, it, G){ const D = it.d;
    if(it.kind === "tap"){ if(r === 1) return "Die höchste Säule zeigt, wovon es am meisten gibt.";
      if(r === 2){ const zwei = D.map((x, i) => [x[2], i]).sort((p, q) => q[0] - p[0]).slice(0, 2).map(x => x[1]); G.ref.dim = zwei; G.ref.draw(); return "Es ist eine von diesen zwei Säulen."; }
      G.ref.dim = null; G.ref.glowBar = it.a; G.ref.draw(); return "Tipp du die leuchtende Säule an."; }
    const [b0, b1] = it.bars;
    if(it.bars.length === 1){ if(r === 1) return "Fahr mit dem Finger oben von der Säule nach links zu den Zahlen.";
      G.ref.guides = [D[b0][2]]; if(r === 3) G.ref.count = { bar: b0, upTo: D[b0][2] - 1 }; G.ref.draw();
      return r === 2 ? "Die lila Linie führt von der Säule zu den Zahlen." : "Ich zähle die Kästchen mit. Das letzte zählst du."; }
    if(r === 1) return `Schau, wie viel die ${D[b0][1]}-Säule höher ist als die ${D[b1][1]}-Säule.`;
    G.ref.guides = [D[b0][2], D[b1][2]]; if(r === 3) G.ref.shade = { bar: b0, from: D[b1][2] }; G.ref.draw();
    return r === 2 ? "Die lila Linien zeigen, wie hoch beide Säulen sind." : "Zähl die gelben Kästchen und tipp die Zahl."; },
  praise: () => "Du hast genau an der Säule entlang geschaut.",
  probe: { falsch: (st, it) => it.kind === "tap" ? tippe(st.querySelector(`#ch .bar[data-i="${it.a === 0 ? 1 : 0}"] rect`)) : tippZahl(st, it.a + 1),
    richtig: (st, it) => it.kind === "tap" ? tippe(st.querySelector(`#ch .bar[data-i="${it.a}"] rect`)) : tippZahl(st, it.a) } });

// ==================== DEUTSCH ====================
async function schneide(st, b){ const soll = new Set(b); for(let i = 1; ; i++){ const g = st.querySelector(`.gap[data-i="${i}"]`); if(!g) break; if(g.classList.contains("on") !== soll.has(i)) tippe(g); } tippe(st.querySelector("#go")); }
A.art({ id: "silben", fach: "deutsch", titel: "Silbenbögen setzen", klang: "pop",
  en: { title: "Set syllable arcs", does: "taps between the letters where a syllable ends; the word is read aloud." },
  beispiel: [{ w: "Sonne", b: [3] }, { w: "Banane", b: [2, 4] }, { w: "Fahrrad", b: [4] }, { w: "Schmetterling", b: [6, 9] }],
  mount(st, it, G){ G.say("n", it.bitte || "Schwing das Wort und tipp dorthin, wo eine Silbe aufhört."); G.sprich(it.w);
    st.innerHTML = `<div class="scene"><div class="word" id="w"></div><div class="hintline" id="h"></div><button class="btn" id="go">Fertig</button></div>`;
    const cut = G.ref.cut = new Set(), w = G.$("#w"); const segs = b => { const out = []; let s = 0; for(const x of [...b].sort((a, b) => a - b)){ out.push(it.w.slice(s, x)); s = x; } out.push(it.w.slice(s)); return out; };
    const truth = segs(it.b), owner = i => { let n = 0; for(const x of it.b) if(i >= x) n++; return n; };
    const render = G.ref.render = () => { const parts = []; let cur = ""; [...it.w].forEach((ch, i) => { if(i > 0 && cut.has(i)){ parts.push(cur); cur = ""; }
        if(i > 0) cur += `<span class="gap ${cut.has(i) ? "on" : ""}" data-i="${i}"></span>`; cur += `<span class="ltr ${G.ref.color ? "c" + owner(i) % 2 : ""}">${ch}</span>`; }); parts.push(cur);
      w.innerHTML = sylHTML(parts); w.querySelectorAll(".gap").forEach(g => g.onclick = () => { if(G.locked) return; const i = +g.dataset.i; cut.has(i) ? cut.delete(i) : cut.add(i); G.klang("pop"); render(); }); };
    G.ref.truth = truth; render();
    G.$("#go").onclick = () => { if(G.locked) return; const mine = segs(cut); (mine.join("|") === truth.join("|")) ? G.solved() : G.miss(`So hast du geschwungen: ${mine.join(" – ")}.`); }; },
  hint(r, it, G){ if(r === 1) return "Sprich das Wort langsam und schwing mit dem Arm. Wie viele Silben hörst du?";
    if(r === 2){ G.$("#h").textContent = `${it.b.length + 1} Silben`; return `Das Wort hat ${it.b.length + 1} Silben.`; }
    G.ref.color = true; G.ref.render(); return `Hör zu: ${G.ref.truth.join(" – ")}. Jetzt setz du die Striche.`; },
  praise: () => "Du hast das Wort langsam geschwungen.",
  probe: { falsch: st => schneide(st, []), richtig: (st, it) => schneide(st, it.b) } });

function male(st, p){ const soll = new Set(p); for(let k = 0; ; k++){ const u = st.querySelector(`.unit[data-k="${k}"]`); if(!u) break; if(u.classList.contains("on") !== soll.has(k)) tippe(u); } tippe(st.querySelector("#go")); }
A.art({ id: "piloten", fach: "deutsch", titel: "Piloten anmalen", klang: "pop",
  en: { title: "Colour the Piloten (vowels)", does: "taps the vowel ('Pilot') in each syllable of a word; it turns yellow." },
  beispiel: [{ u: ["T", "o", "m", "a", "t", "e"], s: [2, 2, 2], p: [1, 3, 5] }, { u: ["B", "au", "m"], s: [3], p: [1] }, { u: ["Eu", "l", "e"], s: [1, 2], p: [0, 2] }, { u: ["K", "i", "n", "d", "e", "r"], s: [3, 3], p: [1, 4] }],
  mount(st, it, G){ G.say("n", it.bitte || "Mal in jedem Wort die Piloten gelb an."); G.sprich(it.u.join(""));
    st.innerHTML = `<div class="scene"><div class="word units" id="w"></div><button class="btn" id="go">Fertig</button></div>`;
    const on = G.ref.on = new Set(), w = G.$("#w");
    const render = G.ref.render = () => { let html = "", k = 0; const groups = G.ref.syl ? it.s : [it.u.length];
      for(const n of groups){ let part = ""; for(let j = 0; j < n; j++, k++) part += `<span class="unit ${on.has(k) ? "on" : ""}" data-k="${k}">${it.u[k]}</span>`; html += G.ref.syl ? `<span class="syl ${G.ref.walk ? "walk" : ""}">${part}</span>` : part; }
      w.innerHTML = html; w.querySelectorAll(".unit").forEach(u => u.onclick = () => { if(G.locked) return; const k = +u.dataset.k; on.has(k) ? on.delete(k) : on.add(k); G.klang("pop"); render(); }); };
    render();
    G.$("#go").onclick = () => { if(G.locked) return; const ok = on.size === it.p.length && it.p.every(k => on.has(k)); ok ? G.solved() : G.miss(`Du hast ${on.size} ${on.size === 1 ? "Pilot" : "Piloten"} angemalt.`); }; },
  hint(r, it, G){ if(r === 1) return "In jeder Silbe sitzt ein Pilot: a, e, i, o, u oder au, ei, eu.";
    G.ref.syl = true; if(r === 3){ G.ref.walk = true; let k = 0; G.sprich(it.s.map(n => { const t = it.u.slice(k, k + n).join(""); k += n; return t; }).join(" – ")); }
    G.ref.render(); return r === 2 ? "Ich zeige dir die Silbenbögen." : "In jedem Bogen genau ein Pilot. Tipp ihn an."; },
  praise: () => "Du hast in jeder Silbe nach dem Piloten gesucht.",
  probe: { falsch: st => male(st, []), richtig: (st, it) => male(st, it.p) } });

async function waehleBild(st, n){ await warte(() => !st.querySelector("#o").hidden); tippe(st.querySelector(`.opt[data-n="${n}"]`)); }
A.art({ id: "blitzwort", fach: "deutsch", titel: "Blitzwort: lesen und Bild wählen", klang: "chime",
  en: { title: "Flash word → picture", does: "sees a word for a moment and taps the matching picture." },
  beispiel: [{ w: "Biene", syl: ["Bie", "ne"], o: [["🐝", "eine Biene"], ["🌸", "eine Blume"], ["🦋", "ein Schmetterling"], ["🚂", "ein Zug"]] },
    { w: "Katze", syl: ["Kat", "ze"], o: [["🐱", "eine Katze"], ["🕯️", "eine Kerze"], ["🐾", "eine Tatze"], ["🧢", "eine Mütze"]] },
    { w: "Schnecke", syl: ["Schne", "cke"], o: [["🐌", "eine Schnecke"], ["❄️", "Schnee"], ["🐍", "eine Schlange"], ["🍫", "Schokolade"]] }],
  mount(st, it, G){ G.say("n", it.bitte || "Gleich blitzt ein Wort auf. Lies es und tipp dann das passende Bild.");
    st.innerHTML = `<div class="scene"><div class="flash${it.satz ? " satz" : ""}" id="f"></div><div class="opts${it.satz ? " zwei" : ""}" id="o" hidden></div><button class="btn ghost" id="again" hidden>👁 Nochmal zeigen</button></div>`;
    const f = G.$("#f"), o = G.$("#o"), again = G.$("#again");
    const flash = G.ref.flash = async (ms, syl) => { f.innerHTML = syl ? `<span>${it.syl.map((s, i) => `<span class="ltr c${i % 2}">${s}</span>`).join("")}</span>` : it.w; await sleep(ms);
      if(!G.ref.keep && !G.locked) f.textContent = "· · ·"; o.hidden = false; again.hidden = false; };
    o.innerHTML = shuffle(it.o).map(([e, n]) => `<button class="opt" data-n="${n}">${e}</button>`).join("");
    o.querySelectorAll(".opt").forEach(b => b.onclick = () => { if(G.locked) return; b.dataset.n === it.o[0][1] ? (f.textContent = it.w, G.solved()) : G.miss(`Das ist ${b.dataset.n}.`); });
    const ms = it.ms || 1500; again.onclick = () => flash(ms); f.textContent = "Achtung …"; setTimeout(() => { if(f.isConnected) flash(ms); }, 1600); },
  hint(r, it, G){ if(r === 1) return it.satz ? "Lies den ganzen Satz bis zum Punkt. Du kannst ihn nochmal zeigen lassen." : "Schau genau auf den Anfang vom Wort. Du kannst es nochmal zeigen lassen.";
    if(r === 2){ G.ref.flash(it.satz ? 6000 : 3000, true); return it.satz ? "Ich zeige dir den Satz länger." : "Ich zeige es dir länger, mit Silben."; }
    const teile = it.satz ? it.syl.map(s => s.trim().replace(/\.$/, "")) : it.syl; // Satz: Wörter ohne Leerzeichen und Punkt
    G.ref.keep = true; G.ref.flash(0, true); G.sprich(teile.join(" – ")); return `Lies mit mir: ${teile.join(" – ")}. Tipp du das Bild.`; },
  praise: it => it.satz ? "Du hast den ganzen Satz gelesen, bevor du getippt hast." : "Du hast das Wort gelesen, bevor du getippt hast.",
  probe: { falsch: (st, it) => waehleBild(st, it.o[1][1]), richtig: (st, it) => waehleBild(st, it.o[0][1]) } });

A.art({ id: "stimmt", fach: "deutsch", titel: "Stimmt das? (Satz lesen)", klang: "chime", binary: true,
  en: { title: "True or not?", does: "reads a sentence and taps „Stimmt“ or „Stimmt nicht“. Two answers only, so there is no hint ladder." },
  beispiel: [{ s: "Fische können fliegen.", a: false, f: "Fische können nicht fliegen. Sie schwimmen." }, { s: "Im Winter ist es bei uns oft kalt.", a: true, f: "Doch: Im Winter ist es bei uns oft kalt." },
    { s: "Eine Katze hat vier Beine.", a: true, f: "Doch: Eine Katze hat vier Beine." }, { s: "Bananen sind blau.", a: false, f: "Bananen sind gelb, nicht blau." }],
  mount(st, it, G){ G.say("n", it.bitte || "Lies den Satz. Stimmt das?");
    st.innerHTML = `<div class="scene">${it.bild ? `<div class="satzbild">${it.bild}</div>` : ""}<div class="sentence">${it.s}</div><div class="row yesno"><button class="btn" data-a="1">👍 Stimmt</button><button class="btn nein" data-a="0">👎 Stimmt nicht</button></div></div>`;
    G.ref.richtig = () => G.$(`[data-a="${it.a ? 1 : 0}"]`).classList.add("richtig"); // nach einer falschen Antwort, bevor es weitergeht
    G.$$("[data-a]").forEach(b => b.onclick = () => { if(G.locked) return; (b.dataset.a === "1") === it.a ? G.solved() : G.miss(it.f); }); },
  hint(){ return null; }, praise: () => "Du hast den ganzen Satz gelesen, bevor du entschieden hast.",
  probe: { falsch: (st, it) => tippe(st.querySelector(`[data-a="${it.a ? 0 : 1}"]`)), richtig: (st, it) => tippe(st.querySelector(`[data-a="${it.a ? 1 : 0}"]`)) } });

const sauber = w => w.replace(/[.,!?]/g, "");
A.art({ id: "stolper", fach: "deutsch", titel: "Stolperwort finden", klang: "pop",
  en: { title: "Find the Stolperwort", does: "taps the word that does not belong in the sentence; it is crossed out." },
  beispiel: [{ s: "Meine Katze schläft gern Gabel auf dem Bett.", x: "Gabel" }, { s: "Im Westpark schwimmen die Enten Schere auf dem See.", x: "Schere" }, { s: "Nach der Schule trinke ich einen warmen Fenster Kakao.", x: "Fenster" }],
  mount(st, it, G){ G.say("n", it.bitte || "In diesem Satz ist ein Wort, über das man stolpert. Tipp es an.");
    const ws = it.s.split(" "); st.innerHTML = `<div class="scene"><div class="sentence" id="s">${ws.map((w, i) => `<span data-i="${i}">${w}</span>`).join(" ")}</div></div>`;
    G.$$("#s span").forEach(sp => sp.onclick = () => { if(G.locked) return; const w = sauber(sp.textContent); if(w === it.x){ sp.classList.add("x"); G.solved(); } else G.miss(`„${w}“ passt gut in den Satz.`); }); },
  hint(r, it, G){ const sp = G.$$("#s span"), xi = sp.findIndex(s => sauber(s.textContent) === it.x), half = Math.ceil(sp.length / 2), inFirst = xi < half;
    if(r === 1) return "Lies den Satz leise. Wo stolperst du?";
    if(r === 2){ sp.forEach((s, i) => s.classList.toggle("dim", (i < half) !== inFirst)); return "In diesem Teil steckt es."; }
    sp.forEach(s => s.classList.remove("dim")); nacheinander(sp[0], xi, 420, i => sp[i].classList.add("hl")); G.sprich(sp.slice(0, xi).map(s => s.textContent).join(" ") + " …");
    return "Ich lese vor, bis ich stolpere. Tipp du das Wort."; },
  praise: () => "Du hast den Satz Wort für Wort gelesen.",
  probe: { falsch: (st, it) => tippe([...st.querySelectorAll("#s span")].find(s => sauber(s.textContent) !== it.x)), richtig: (st, it) => tippe([...st.querySelectorAll("#s span")].find(s => sauber(s.textContent) === it.x)) } });

// Groß oder klein? (Ticket 37, Karibu Kap. 5): der Satz steht ganz klein da; sie tippt die Wörter, die groß werden
// (Satzanfang und Nomen), dann „Fertig“. {w: Wörter klein, g: Stellen, die groß werden, p: {Stelle: Artikelprobe}}
const gross = w => w[0].toUpperCase() + w.slice(1);
function grossTippen(st, it, soll){ st.querySelectorAll("#s span").forEach(sp => { const i = +sp.dataset.i; if(sp.classList.contains("gross") !== soll.includes(i)) tippe(sp); }); tippe(st.querySelector("#go")); }
A.art({ id: "gross", fach: "deutsch", titel: "Groß oder klein?", klang: "pop",
  en: { title: "Capital or small?", does: "sees a sentence written all small and taps the words that need a capital letter (the first word and the nouns), then taps Fertig." },
  beispiel: [{ w: ["die", "katze", "schläft."], g: [0, 1], p: { 1: "die Katze" } },
    { w: ["der", "hund", "spielt", "mit", "dem", "ball."], g: [0, 1, 5], p: { 1: "der Hund", 5: "der Ball" } },
    { w: ["heute", "liest", "das", "kleine", "kind", "ein", "buch."], g: [0, 4, 6], p: { 4: "das Kind", 6: "das Buch" } }],
  mount(st, it, G){ G.say("n", it.bitte || "Mein Satz ist ganz klein geschrieben. Tipp die Wörter an, die groß werden.");
    st.innerHTML = `<div class="scene"><div class="sentence" id="s">${it.w.map((w, i) => `<span data-i="${i}">${w}</span>`).join(" ")}</div><div class="hintline" id="h"></div><button class="btn" id="go">Fertig</button></div>`;
    G.$$("#s span").forEach(sp => sp.onclick = () => { if(G.locked) return; const i = +sp.dataset.i, an = sp.classList.toggle("gross");
      sp.textContent = an ? gross(it.w[i]) : it.w[i]; sp.classList.remove("glow"); G.klang("pop"); });
    G.$("#go").onclick = () => { if(G.locked) return; const an = G.$$("#s span.gross").map(sp => +sp.dataset.i), zuviel = an.find(i => !it.g.includes(i)), fehlt = it.g.filter(i => !an.includes(i));
      if(zuviel === undefined && !fehlt.length) return G.solved();
      if(zuviel !== undefined) return G.miss(`„${it.w[zuviel].replace(/[.,!?]/g, "")}“ ist kein Nomen, das bleibt klein.`);
      G.miss(fehlt.length === 1 ? "Ein Wort ist noch klein, das groß werden muss." : `${fehlt.length} Wörter sind noch klein, die groß werden müssen.`); }; },
  hint(r, it, G){ const sp = G.$$("#s span"), an = i => sp[i].classList.contains("gross");
    if(r === 1) return "Der Satzanfang wird groß, und Nomen werden groß. Kannst du der, die oder das davor sagen?";
    if(r === 2){ if(!an(0)){ sp[0].classList.add("glow"); return "Das erste Wort im Satz schreibt man immer groß."; }
      G.$("#h").textContent = `In diesem Satz werden ${it.g.length} Wörter groß.`; return "Zähl, wie viele du schon hast."; }
    const zuviel = sp.findIndex((s, i) => an(i) && !it.g.includes(i)); if(zuviel >= 0){ sp[zuviel].classList.add("glow"); return "Das leuchtende Wort ist kein Nomen. Tipp es an, dann wird es wieder klein."; }
    const i = it.g.find(i => i > 0 && !an(i)) ?? it.g.find(i => !an(i)); if(i === undefined) return null;
    sp[i].classList.add("glow"); if(it.p[i]){ G.$("#h").textContent = `Probe: ${it.p[i]}`; return "Hier passt ein Artikel davor, also ist es ein Nomen. Tipp du es an."; }
    return "Das leuchtende Wort wird groß. Tipp du es an."; },
  thanks: () => "Danke! Jetzt ist mein Satz richtig geschrieben.", praise: () => "Du hast bei jedem Wort die Artikelprobe gemacht.",
  probe: { falsch: (st, it) => grossTippen(st, it, []), richtig: (st, it) => grossTippen(st, it, it.g) } });

// Lückenwort: am Ende {pre, long, alt} (weiterschwingen) oder irgendwo {pre, post, hilfe} mit beliebigen Kärtchen ("" = nichts)
const kartchen = t => t === "" ? "nichts" : t;
A.art({ id: "weiterschwingen", fach: "deutsch", titel: "Lückenwort: weiterschwingen", klang: "pop",
  en: { title: "Gap word (pick the letters)", does: "drags the right tile into a gap. End letters d/t, g/k, b/p by lengthening the word; also any tiles anywhere in a word or sentence (i/ie, h or nothing, . ? !)." },
  beispiel: [{ pic: "🐶", pre: "Hun", ans: "d", tiles: ["d", "t"], long: ["Hun", "de"], alt: { t: "Hun-te" } }, { pic: "⛰️", pre: "Ber", ans: "g", tiles: ["g", "k"], long: ["Ber", "ge"], alt: { k: "Ber-ke" } },
    { pic: "🧺", pre: "Kor", ans: "b", tiles: ["b", "p"], long: ["Kör", "be"], alt: { p: "Kör-pe" } },
    { pic: "🐝", pre: "Bi", post: "ne", ans: "ie", tiles: ["i", "ie"], bitte: "Auf dem Paket fehlt ein Stück: Bi_ne. Kommt i oder ie hinein?",
      hilfe: ["Sprich das Wort langsam: Klingt das i lang oder kurz?", ["Biii – ne", "Hör mal, wie lang das i klingt."], ["langes i", "Ein langes i schreibt man meistens ie. Zieh du die Buchstaben.", "Biii – ne"]] },
    { pic: "👟", pre: "Schu", post: "e", ans: "h", tiles: ["h", ""], bitte: "Auf dem Paket steht Schu_e. Fehlt da ein h?",
      hilfe: ["Schwing das Wort in Silben. Hörst du etwas zwischen den Silben?", ["Schu – ?e", "Hör genau hin, wie die zweite Silbe anfängt."], ["Schu – he", "Hör zu: Schu – he. Zieh du das, was fehlt.", "Schu – he"]] },
    { pic: "🪧", pre: "Wie heißt du", ans: "?", tiles: [".", "?", "!"], bitte: "Am Ende meiner Schilder fehlt das Zeichen. Punkt, Fragezeichen oder Ausrufezeichen?",
      hilfe: ["Lies den Satz laut: Erzählst du, fragst du oder rufst du?", ["Wie …?", "Sätze mit Wie, Wo oder Was am Anfang wollen etwas wissen."], ["Frage", "Wer etwas fragt, setzt ein Fragezeichen. Zieh du das Zeichen.", "Wie heißt du?"]] }],
  mount(st, it, G){ G.say("n", it.bitte || (it.post ? "Was fehlt in der Lücke?" : "Welcher Buchstabe fehlt am Ende?"));
    st.innerHTML = `<div class="scene"><div class="big bild">${it.pic || ""}</div><div class="word">${it.pre}<span class="zone gapz" id="gap"></span>${it.post || ""}</div><div class="hintline" id="h"></div><div class="row" id="tiles"></div></div>`;
    const gap = G.$("#gap"), tiles = G.$("#tiles");
    shuffle(it.tiles).forEach(t => { const d = document.createElement("div"); d.className = "tile" + (t === "" ? " leer" : ""); d.textContent = kartchen(t); d.dataset.t = t; tiles.appendChild(d);
      const tryIt = () => { if(G.locked) return; if(t === it.ans){ if(t === "") d.remove(); else gap.appendChild(d); gap.classList.add("voll"); G.solved(); }
        else G.miss(it.alt && it.alt[t] ? `Mit ${t} hieße es weitergeschwungen „${it.alt[t]}“.` : `Jetzt steht da „${it.pre}${t}${it.post || ""}“.`); };
      G.draggable(d, { onTap: tryIt, onDrop: z => { if(z === gap) tryIt(); } }); }); },
  hint(r, it, G){ const h = G.$("#h");
    if(it.long){ if(r === 1) return "Schwing das Wort weiter: Wie heißt es, wenn es zwei sind?";
      if(r === 2){ h.textContent = `zwei ${it.long[0]} – ${it.long[1].replace(it.ans, "_")}`; return "So sieht es weitergeschwungen aus. Was hörst du an der Lücke?"; }
      h.innerHTML = `zwei ${it.long[0]} – ${it.long[1].replace(it.ans, `<u>${it.ans}</u>`)}`; G.sprich(it.long.join(" – ")); return `Hör genau: ${it.long.join(" – ")}. Zieh du den Buchstaben.`; }
    const x = (it.hilfe || [])[r - 1]; if(!x) return r === 1 ? "Sprich das Wort langsam und hör genau hin." : null;
    if(typeof x === "string") return x;
    h.textContent = x[0]; if(x[2]) G.sprich(x[2]); return x[1]; },
  praise: it => it.long ? "Du hast das Wort weitergeschwungen." : "Du hast genau hingehört.",
  probe: { falsch: (st, it) => tap(st.querySelector(`.tile[data-t="${it.tiles.find(t => t !== it.ans)}"]`)), richtig: (st, it) => ziehe(st.querySelector(`.tile[data-t="${it.ans}"]`), st.querySelector("#gap")) } });

// Ziehen in Körbe/Tonnen: falsch = erstes Ding in einen falschen Korb, richtig = alles in den passenden
function sortiere(st, sel, korb, attr, ziel, falsch){
  const offen = [...st.querySelectorAll(`#src ${sel}`)], koerbe = [...st.querySelectorAll(korb)];
  if(falsch) return ziehe(offen[0], koerbe.find(k => k.dataset[attr] !== ziel(offen[0])));
  for(const d of offen) ziehe(d, koerbe.find(k => k.dataset[attr] === ziel(d)));
}
A.art({ id: "sortieren", fach: "deutsch", titel: "Wörter in Körbe sortieren", klang: "pop",
  en: { title: "Sort into baskets", does: "taps a word to hear it and drags it into the right basket (long or short Pilot)." },
  beispiel: [{ w: [["Rose", "Ro-se", "l"], ["Sonne", "Son-ne", "k"], ["Biene", "Bie-ne", "l"], ["Butter", "But-ter", "k"], ["Hose", "Ho-se", "l"], ["Kiste", "Kis-te", "k"]] },
    { w: [["Nase", "Na-se", "l"], ["Tasse", "Tas-se", "k"], ["Igel", "I-gel", "l"], ["Ente", "En-te", "k"], ["Ofen", "O-fen", "l"], ["Wolke", "Wol-ke", "k"]] }],
  mount(st, it, G){ G.say("n", it.bitte || "Tipp ein Wort an und hör es dir an. Ist der Pilot lang wie bei Roooose oder kurz wie bei Sonne?");
    st.innerHTML = `<div class="scene"><div class="items" id="src"></div><div class="baskets"><div class="zone basket" data-b="l"><div class="bl">🐢 langer Pilot</div><div class="items"></div></div><div class="zone basket" data-b="k"><div class="bl">🐇 kurzer Pilot</div><div class="items"></div></div></div></div>`;
    const heard = G.ref.heard = new Set(), src = G.$("#src");
    shuffle(it.w).forEach(([w, syl, b]) => { const d = document.createElement("div"); d.className = "wtile"; d.textContent = w; d.dataset.w = w; src.appendChild(d);
      G.draggable(d, { onTap: () => { heard.add(w); G.sprich(w); }, onDrop: z => { if(!z || !z.dataset.b) return; G.ref.last = { w, b, syl };
        if(z.dataset.b === b){ z.querySelector(".items").appendChild(d); d.classList.remove("glow"); G.$$(".basket").forEach(x => x.classList.remove("glow")); G.klang("pop"); if(!src.querySelector(".wtile")) G.solved(); }
        else G.miss(`Hör mal: ${syl}.`); } }); }); },
  hint(r, it, G){ if(r === 1) return "Sprich das Wort langsam. Kannst du den Piloten lang ziehen?";
    if(r === 2){ G.sprich("Ro-se. Son-ne."); return "Hör den Unterschied: Rooo-se ist lang, Son-ne ist kurz."; }
    const l = G.ref.last; if(l){ G.$$(".basket").forEach(x => x.classList.toggle("glow", x.dataset.b === l.b)); G.sprich(l.syl); return `Bei ${l.w} ist es der leuchtende Korb. Zieh du es hinein.`; } return null; },
  praise: (it, G) => G.ref.heard && G.ref.heard.size >= it.w.length ? "Du hast dir jedes Wort angehört, bevor du sortiert hast." : "Du hast auf die Piloten gehört.",
  probe: { falsch: (st, it) => sortiere(st, ".wtile", ".basket", "b", d => it.w.find(x => x[0] === d.dataset.w)[2], true),
    richtig: (st, it) => sortiere(st, ".wtile", ".basket", "b", d => it.w.find(x => x[0] === d.dataset.w)[2], false) } });

function lege(st, wort){ st.querySelectorAll("#b .tile").forEach(tippe); for(const ch of wort) tippe([...st.querySelectorAll("#tray .tile")].find(t => t.textContent === ch)); tippe(st.querySelector("#go")); }
A.art({ id: "hoerwort", fach: "deutsch", titel: "Gehörtes Wort aus Buchstaben legen", klang: "chime",
  en: { title: "Build a heard word from letters", does: "hears a word and lays it with letter tiles." },
  beispiel: [{ w: "Zelt", syl: ["Zelt"] }, { w: "Blume", syl: ["Blu", "me"] }, { w: "Hose", syl: ["Ho", "se"] }],
  mount(st, it, G){ G.say("n", it.bitte || "Hör gut zu und leg das Wort mit den Buchstaben."); G.sprich(it.w);
    st.innerHTML = `<div class="scene"><button class="btn ghost" id="hear">🔊 Nochmal hören</button><div class="built" id="b"></div><div class="hintline" id="h"></div><div class="row" id="tray"></div><button class="btn" id="go">Fertig</button></div>`;
    const b = G.$("#b"), tray = G.$("#tray");
    shuffle([...it.w, ...shuffle("aeinrst".split("").filter(c => !it.w.toLowerCase().includes(c))).slice(0, 2)]).forEach(ch => { const d = document.createElement("div"); d.className = "tile"; d.textContent = ch; tray.appendChild(d);
      d.onclick = () => { if(G.locked) return; (d.parentElement === tray ? b : tray).appendChild(d); G.klang("pop"); }; });
    G.$("#hear").onclick = () => G.sprich(it.w);
    G.$("#go").onclick = () => { if(G.locked) return; const w = [...b.querySelectorAll(".tile")].map(t => t.textContent).join(""); if(!w) return;
      if(w === it.w) G.solved(); else { G.miss(`Ich lese: ${w}.`); setTimeout(() => { if(b.isConnected) G.sprich(it.w); }, 1600); } }; },
  hint(r, it, G){ if(r === 1) return "Sprich das Wort langsam und hör auf jeden Laut.";
    const h = G.$("#h");
    if(r === 2){ h.textContent = it.syl.map(s => "_ ".repeat(s.length).trim()).join("  |  "); return `Das Wort hat ${it.w.length} Buchstaben${it.syl.length > 1 ? " und " + it.syl.length + " Silben" : ""}.`; }
    h.textContent = it.w; setTimeout(() => { h.textContent = ""; }, 3000); return "Schau genau hin und merk es dir. Dann leg du es."; },
  praise: () => "Du hast Laut für Laut gelegt.",
  probe: { falsch: (st, it) => lege(st, [...st.querySelectorAll(".tile")].map(t => t.textContent).find(c => c !== it.w[0])), richtig: (st, it) => lege(st, it.w) } });

// Nachspuren: nie daneben. Ist die Spur weit weg, zeigt die Katze den Strich einmal vor; danach zählt jede Spur.
function spure(st, punkte){
  const cv = st.querySelector("#cv"), b = cv.getBoundingClientRect(), p = q => ({ x: b.left + q.x / 100 * b.width, y: b.top + q.y / 100 * b.height });
  zeig(cv, "pointerdown", p(punkte[0])); for(const q of punkte.slice(1)) zeig(cv, "pointermove", p(q)); zeig(cv, "pointerup", p(punkte[punkte.length - 1])); tippe(st.querySelector("#go"));
}
A.art({ id: "spuren", fach: "deutsch", titel: "Buchstaben nachspuren (ohne Bewertung)", klang: "chime", nieFalsch: true,
  en: { title: "Trace letters (never graded)", does: "traces a pale letter with her finger. Nothing is ever wrong: if the trace is far off, the cat shows the stroke once, then any trace counts." },
  beispiel: [{ l: "a", d: "M68,40 C58,24 26,28 26,58 C26,86 58,90 68,66 M68,34 L68,90" }, { l: "e", d: "M28,58 L72,58 C72,30 30,28 28,58 C26,88 60,92 74,78" }, { l: "h", d: "M34,10 L34,90 M34,62 C40,40 68,40 68,60 L68,90" }],
  mount(st, it, G){ G.say("n", it.bitte || `Fahr das ${it.l} mit dem Finger nach. Fang am Punkt an.`);
    st.innerHTML = `<div class="scene"><div class="trace"><div class="lines" style="top:40%"></div><div class="lines" style="top:90%"></div>
      <svg viewBox="0 0 100 100"><path d="${it.d}" class="guide" id="gp"/><path d="${it.d}" class="anim" id="ap"/><circle id="sd" r="4" fill="#8e5bd6"/></svg><canvas id="cv"></canvas></div>
      <div class="row"><button class="btn ghost" id="clr">Neu anfangen</button><button class="btn" id="go">Fertig</button></div></div>`;
    const gp = G.$("#gp"), p0 = gp.getPointAtLength(0); G.$("#sd").setAttribute("cx", p0.x); G.$("#sd").setAttribute("cy", p0.y);
    const cv = G.$("#cv"), dpr = devicePixelRatio || 1; cv.width = 320 * dpr; cv.height = 320 * dpr; const ctx = cv.getContext("2d"); ctx.scale(cv.width / 100, cv.height / 100);
    ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#2b2140";
    const pts = G.ref.pts = []; let down = false, last = null;
    const pos = e => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width * 100, y: (e.clientY - b.top) / b.height * 100 }; };
    cv.addEventListener("pointerdown", e => { if(G.locked) return; down = true; try{ cv.setPointerCapture(e.pointerId); }catch(x){} last = pos(e); pts.push(last); });
    cv.addEventListener("pointermove", e => { if(!down) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); pts.push(p); last = p; });
    cv.addEventListener("pointerup", () => down = false);
    const clear = G.ref.clear = () => { ctx.clearRect(0, 0, 100, 100); pts.length = 0; }; G.$("#clr").onclick = clear;
    G.$("#go").onclick = async () => { if(G.locked || pts.length < 5) return;
      // sehr lockere Prüfung: halbwegs auf der Spur und halbwegs ganz nachgefahren
      const off = document.createElement("canvas").getContext("2d"), p2 = new Path2D(it.d); off.lineWidth = 18;
      const inFrac = pts.filter(p => off.isPointInStroke(p2, p.x, p.y)).length / pts.length;
      const L = gp.getTotalLength(); let cov = 0; for(let i = 0; i <= 40; i++){ const q = gp.getPointAtLength(L * i / 40); if(pts.some(p => Math.hypot(p.x - q.x, p.y - q.y) < 10)) cov++; }
      if((inFrac >= .5 && cov / 41 >= .5) || G.ref.replayed){ G.solved(); return; }
      G.ref.replayed = true; G.say("c", "Schau, so geht der Strich."); const ap = G.$("#ap"); ap.style.transition = "none"; ap.style.opacity = 1; ap.style.strokeDasharray = L; ap.style.strokeDashoffset = L; ap.getBoundingClientRect();
      ap.style.transition = "stroke-dashoffset 2.2s linear"; ap.style.strokeDashoffset = 0; await sleep(2600); if(!ap.isConnected) return; ap.style.opacity = 0; clear(); G.say("c", "Jetzt du."); }; },
  hint(){ return null; }, praise: it => `Du hast das ${it.l} ganz nachgefahren.`,
  // falsch = Gekritzel in der Ecke (die Katze zeigt den Strich), richtig = die Spur entlang
  probe: { falsch: st => spure(st, [...Array(8)].map((_, i) => ({ x: 4 + i, y: 96 - i % 2 }))),
    richtig: st => { const gp = st.querySelector("#gp"), L = gp.getTotalLength(); spure(st, [...Array(61)].map((_, i) => gp.getPointAtLength(L * i / 60))); } } });

const MINA = ["Mina ist eine lila Katze.", "Sie wohnt bei Azra am Westpark.", "Am liebsten schläft Mina auf dem Bücherregal.", "Wenn es regnet, schaut sie aus dem Fenster."];
A.art({ id: "textfrage", fach: "deutsch", titel: "Kurzer Text, eine Frage", klang: "chime",
  en: { title: "Short text + a question", does: "reads a short text and taps the answer to a question about it." },
  beispiel: [{ text: MINA, q: "Wo schläft Mina am liebsten?", o: ["auf dem Bücherregal", "im Bett", "im Park", "im Korb"], a: 0, s: 2 },
    { text: MINA, q: "Was macht Mina, wenn es regnet?", o: ["Sie schläft.", "Sie schaut aus dem Fenster.", "Sie geht in den Park.", "Sie spielt mit Wolle."], a: 1, s: 3 },
    { text: MINA, q: "Welche Farbe hat Mina?", o: ["schwarz", "weiß", "lila", "grau"], a: 2, s: 0 },
    { text: ["Liebe Azra,", "ich lade dich zu meinem Fest ein.", "Wir feiern im Café.", "Dein Otto"], q: "Was fehlt noch in Ottos Einladung?", s: 2,
      o: ["wann das Fest ist", "wo das Fest ist", "wer einlädt", "was gefeiert wird"], a: 0,
      warum: ["", "Wo das Fest ist, steht schon da: im Café.", "Wer einlädt, steht schon da: Otto.", "Was gefeiert wird, steht schon da: ein Fest."],
      hilfe: ["Frag dich: Wer, was, wann und wo?", "Hier steht, wo gefeiert wird.", "Wo, wer und was stehen schon da, eins fehlt noch."], lob: "Du hast an Wer, Was, Wann und Wo gedacht." }],
  mount(st, it, G){ G.say("n", it.bitte || it.q);
    st.innerHTML = `<div class="scene"><div class="text" id="t">${it.text.map((s, i) => `<span data-i="${i}">${s}</span>`).join(" ")}</div><div class="big" style="font-size:26px">${it.q}</div><div class="row" id="o"></div></div>`;
    const o = G.$("#o");
    shuffle(it.o.map((x, i) => [x, i])).forEach(([x, i]) => { const b = document.createElement("button"); b.className = "ans"; b.textContent = x; b.dataset.i = i; o.appendChild(b);
      b.onclick = () => { if(G.locked) return; i === it.a ? G.solved() : G.miss(it.warum ? it.warum[i] : `„${x}“ – das steht so nicht im Text.`); }; }); },
  // warum (optional): ein Satz je Antwort für den Fall, dass sie sie tippt; hilfe: drei eigene Hilfesätze
  hint(r, it, G){ const H = it.hilfe || ["Such die Stelle im Text. Die Antwort steht darin.", "Hier ist die Stelle.", "Ich lese dir die Stelle vor. Tipp dann die Antwort."];
    if(r === 1) return H[0];
    G.$(`#t span[data-i="${it.s}"]`).classList.add("hl"); if(r === 2) return H[1];
    G.sprich(it.text[it.s]); return H[2]; },
  praise: it => it.lob || "Du hast im Text nachgeschaut.",
  probe: { falsch: (st, it) => tippe(st.querySelector(`.ans[data-i="${it.a === 0 ? 1 : 0}"]`)), richtig: (st, it) => tippe(st.querySelector(`.ans[data-i="${it.a}"]`)) } });

A.art({ id: "hoeren", fach: "deutsch", titel: "Zuhören und antworten", klang: "chime",
  en: { title: "Listen, then answer", does: "hears a short spoken message (no text on screen) and taps the picture that answers the question. Uses the browser's German voice." },
  beispiel: [{ msg: ["Hallo Azra!", "Lotte kommt heute um drei Uhr.", "Sie bringt einen Kuchen mit."], s: 2, q: "Was bringt Lotte mit?", o: [["🎂", "einen Kuchen"], ["🌷", "eine Blume"], ["📚", "ein Buch"]] },
    { msg: ["Liebe Azra!", "Morgen gehen wir zusammen zum See.", "Nimm bitte deine Gummistiefel mit."], s: 2, q: "Was soll Azra mitnehmen?", o: [["🥾", "Gummistiefel"], ["☂️", "einen Schirm"], ["🎣", "eine Angel"]] },
    { msg: ["Hallo Azra!", "Mila hat ihre Brille verloren.", "Sie liegt bestimmt im Garten."], s: 2, q: "Wo liegt Milas Brille bestimmt?", o: [["🌻", "im Garten"], ["☕", "im Café"], ["📮", "bei der Post"]] }],
  mount(st, it, G){ G.say("n", it.bitte || "Hier ist eine Nachricht für dich. Hör gut zu.");
    st.innerHTML = `<div class="scene"><div class="big" style="font-size:70px">📨</div><button class="btn ghost" id="again">🔊 Nochmal hören</button><div class="text" id="t" hidden></div>
      <div class="big" style="font-size:28px">${it.q}</div><div class="opts drei" id="o"></div></div>`;
    const play = G.ref.play = () => { G.sprich(it.msg.join(" ")); G.sprich(it.q); }; play();
    G.$("#again").onclick = play;
    G.$("#o").innerHTML = shuffle(it.o.map((o, i) => [...o, i])).map(([e, n, i]) => `<button class="opt bild" data-i="${i}">${e}<span>${n}</span></button>`).join("");
    G.$$(".opt").forEach(b => b.onclick = () => { if(G.locked) return; const i = +b.dataset.i; i === 0 ? G.solved() : G.miss(`${it.o[i][1]}? Davon kam in der Nachricht nichts vor.`); }); },
  hint(r, it, G){ const t = G.$("#t"), spaeter = (ms, fn) => setTimeout(() => { if(t.isConnected) fn(); }, ms);
    if(r === 1){ spaeter(2500, G.ref.play); return "Hör dir die Nachricht nochmal an."; }
    if(r === 2){ spaeter(2500, () => G.sprich(it.msg[it.s])); return "Hör auf diesen Satz."; }
    t.hidden = false; t.textContent = it.msg[it.s]; spaeter(3000, () => G.sprich(it.msg[it.s])); return "Hier steht der Satz. Lies mit und tipp das Bild."; },
  praise: () => "Du hast genau zugehört.",
  probe: { falsch: st => tippe(st.querySelector('.opt[data-i="1"]')), richtig: st => tippe(st.querySelector('.opt[data-i="0"]')) } });

// Lesen und Malen: Bild mit Haus, Baum, Blumen und Ball, oder {karte} = Gitter, auf dem sie Felder abgeht und eins anmalt
const FARBEN = { rot: ["#e5534b", "rot"], blau: ["#4a7fd6", "blau"], gruen: ["#5cb85c", "grün"], gelb: ["#f5d142", "gelb"], lila: ["#9b6ad6", "lila"] };
const NAMEN = { ball: "Der Ball", dach: "Das Dach", tuer: "Die Tür", haus: "Das Haus", baum: "Der Baum", blume1: "Die Blume neben dem Haus", blume2: "Die Blume am Baum" };
const HAUSBILD = `<svg viewBox="0 0 520 290" class="paint" id="p"><rect x="0" y="262" width="520" height="28" fill="#a8d08d"/>
  <rect class="o" data-o="haus" x="60" y="130" width="150" height="132" fill="#fff"/><polygon class="o" data-o="dach" points="45,132 135,60 225,132" fill="#fff"/>
  <rect class="o" data-o="tuer" x="115" y="196" width="40" height="66" fill="#fff"/>
  <rect x="380" y="170" width="20" height="92" fill="#8a6a4f"/><circle class="o" data-o="baum" cx="390" cy="135" r="55" fill="#fff"/>
  <line x1="248" y1="262" x2="248" y2="220" stroke="#4f9a3d" stroke-width="4"/><circle class="o" data-o="blume1" cx="248" cy="208" r="15" fill="#fff"/>
  <line x1="470" y1="262" x2="470" y2="220" stroke="#4f9a3d" stroke-width="4"/><circle class="o" data-o="blume2" cx="470" cy="208" r="15" fill="#fff"/>
  <circle class="o" data-o="ball" cx="310" cy="244" r="18" fill="#fff"/></svg>`;
function karteSVG({ w, h, start, dinge = {} }){ const Z = 76; let s = `<svg viewBox="0 0 ${w * Z + 8} ${h * Z + 8}" class="paint karte" id="p">`;
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const k = `${x},${y}`, e = start[0] === x && start[1] === y ? "🧒" : dinge[k];
    s += `<rect class="o" data-o="${k}" x="${4 + x * Z}" y="${4 + y * Z}" width="${Z}" height="${Z}" fill="#fff"/>${e ? `<text x="${4 + x * Z + Z / 2}" y="${4 + y * Z + Z / 2 + 14}" font-size="40" text-anchor="middle">${e}</text>` : ""}`; }
  return s + "</svg>"; }
async function malAn(st, it, falsch){
  const stift = c => tippe(st.querySelector(`#pal button[data-c="${c}"]`)), feld = k => st.querySelector(`.o[data-o="${k}"]`), g0 = Object.keys(it.goal)[0];
  if(falsch){
    if(it.keep.length){ stift("rot"); tippe(feld(it.keep[0])); }
    else if(it.goal[g0] === "*"){ stift("rot"); tippe([...st.querySelectorAll(".o")].find(o => !(o.dataset.o in it.goal))); }
    else { stift(Object.keys(FARBEN).find(c => c !== it.goal[g0])); tippe(feld(g0)); }
  } else {
    stift(""); st.querySelectorAll(".o").forEach(o => { if(o.getAttribute("fill") !== "#fff") tippe(o); });
    for(const [k, c] of Object.entries(it.goal)){ stift(c === "*" ? "rot" : c); tippe(feld(k)); }
  }
  tippe(st.querySelector("#go"));
}
A.art({ id: "lesenmalen", fach: "deutsch", titel: "Lesen und Malen", klang: "paper",
  en: { title: "Read and colour", does: "reads an instruction and colours the right thing in a picture (colouring other things is allowed), or walks squares on a map grid and colours the square she ends on." },
  beispiel: [{ s: "Mal den Ball rot an.", goal: { ball: "rot" }, keep: [], k: ["Ball", "rot"] },
    { s: "Mal die Blume neben dem Haus gelb an.", goal: { blume1: "gelb" }, keep: ["blume2"], k: ["Blume", "neben dem Haus", "gelb"] },
    { s: "Mal das Dach blau und die Tür grün an.", goal: { dach: "blau", tuer: "gruen" }, keep: [], k: ["Dach", "blau", "Tür", "grün"] },
    { karte: { w: 6, h: 4, start: [1, 2], dinge: { "0,0": "🏠", "4,0": "🌳", "5,3": "🌷" } }, s: "Geh 2 Felder nach rechts und 1 Feld nach oben. Mal das Feld an, auf dem du dann stehst.",
      goal: { "3,1": "*" }, keep: [], k: ["2 Felder nach rechts", "1 Feld nach oben"] },
    { karte: { w: 6, h: 4, start: [4, 3], dinge: { "0,0": "🏠", "4,0": "🌳", "2,3": "🌷" } }, s: "Geh 3 Felder nach links und 2 Felder nach oben. Mal das Feld blau an, auf dem du dann stehst.",
      goal: { "1,1": "blau" }, keep: [], k: ["3 Felder nach links", "2 Felder nach oben", "blau"] }],
  mount(st, it, G){ G.say("n", it.bitte || "Lies den Auftrag und mal das Bild an.");
    st.innerHTML = `<div class="scene"><div class="sentence" id="s">${markKeys(it.s, it.k)}</div>${it.karte ? karteSVG(it.karte) : HAUSBILD}
      <div class="pal" id="pal">${Object.entries(FARBEN).map(([k, [c]]) => `<button data-c="${k}" style="background:${c}"></button>`).join("")}<button data-c="" style="background:#fff">🧽</button></div>
      <button class="btn" id="go">Fertig</button></div>`;
    const fill = G.ref.fill = {}; let pen = "rot";
    const pal = () => G.$$("#pal button").forEach(b => b.classList.toggle("on", b.dataset.c === pen)); pal();
    G.$$("#pal button").forEach(b => b.onclick = () => { pen = b.dataset.c; pal(); });
    G.$$(".o").forEach(o => o.onclick = () => { if(G.locked) return; const k = o.dataset.o; if(pen) fill[k] = pen; else delete fill[k]; o.setAttribute("fill", pen ? FARBEN[pen][0] : "#fff"); G.klang("pop"); });
    const name = k => it.karte ? "Das Feld" : NAMEN[k];
    G.$("#go").onclick = () => { if(G.locked) return;
      const kept = it.keep.find(k => fill[k]); if(kept) return G.miss(`${NAMEN[kept]} ist jetzt ${FARBEN[fill[kept]][1]}.`);
      if(it.karte && Object.keys(fill).some(k => !(k in it.goal))) return G.miss("Es sind mehr Felder angemalt, als im Auftrag steht.");
      const wrong = Object.keys(it.goal).find(k => fill[k] && it.goal[k] !== "*" && fill[k] !== it.goal[k]); if(wrong) return G.miss(`${name(wrong)} ist jetzt ${FARBEN[fill[wrong]][1]}.`);
      if(Object.keys(it.goal).some(k => !fill[k])) return G.miss("Im Auftrag steht noch etwas, das noch nicht angemalt ist.");
      G.solved(); }; },
  hint(r, it, G){ if(r === 1) return "Lies den Auftrag nochmal Wort für Wort.";
    G.$$("#s .k").forEach(k => k.classList.add("hl")); if(r === 2) return "Auf diese Wörter kommt es an.";
    G.sprich(it.s); G.$$(".o").forEach(o => o.classList.toggle("glow", o.dataset.o in it.goal)); return "Ich lese dir den Auftrag vor. Mal du das Leuchtende an."; },
  thanks: () => "Schön bunt!", praise: () => "Du hast den ganzen Auftrag gelesen, bevor du gemalt hast.",
  probe: { falsch: (st, it) => malAn(st, it, true), richtig: (st, it) => malAn(st, it, false) } });

A.art({ id: "fehler", fach: "deutsch", titel: "Abschreibfehler finden", klang: "paper",
  en: { title: "Find the copying mistake", does: "compares a model sentence with Emil's copy and taps the one word that is spelled differently." },
  beispiel: [{ v: "Die Blume ist rot.", c: "Die Blumme ist rot." }, { v: "Wir spielen heute im Park.", c: "Wir spilen heute im Park." }, { v: "Mein Hund heißt Bello.", c: "Mein Hunt heißt Bello." }],
  mount(st, it, G){ G.say("n", it.bitte || "Ich habe deinen Brief abgeschrieben. Ein Wort habe ich anders geschrieben als in der Vorlage. Findest du es?");
    const vw = it.v.split(" "), cw = it.c.split(" "); G.ref.x = cw.findIndex((w, i) => w !== vw[i]);
    st.innerHTML = `<div class="scene"><div class="small muted">Vorlage</div><div class="copy v" id="v">${vw.map((w, i) => `<span data-i="${i}">${w}</span>`).join(" ")}</div>
      <div class="small muted">Emils Abschrift</div><div class="copy" id="c">${cw.map((w, i) => `<span data-i="${i}">${w}</span>`).join(" ")}</div><div class="hintline" id="h"></div></div>`;
    G.$$("#c span").forEach(sp => sp.onclick = () => { if(G.locked) return; const i = +sp.dataset.i;
      if(i === G.ref.x){ sp.classList.add("x"); G.$("#h").textContent = sauber(vw[i]); G.solved(); } else G.miss(`„${sauber(sp.textContent)}“ steht genauso in der Vorlage.`); }); },
  hint(r, it, G){ if(r === 1) return "Vergleich Wort für Wort: oben, dann unten.";
    const n = it.c.split(" ").length, half = Math.ceil(n / 2), first = G.ref.x < half;
    if(r === 2){ ["#v", "#c"].forEach(s => G.$$(s + " span").forEach((sp, i) => sp.classList.toggle("dim", (i < half) !== first))); return "In diesem Teil steckt es."; }
    G.$$(".copy span").forEach(sp => sp.classList.remove("dim")); const v = G.$("#v"), c = G.$("#c");
    nacheinander(v, G.ref.x, 600, i => [v, c].forEach(el => el.querySelector(`span[data-i="${i}"]`).classList.add("hl")));
    return "Ich vergleiche mit dir. Das nächste Wort vergleichst du."; },
  thanks: () => "Danke! Jetzt schreibe ich es richtig.", praise: () => "Du hast Wort für Wort verglichen.",
  probe: { falsch: (st, it, G) => tippe(st.querySelector(`#c span[data-i="${G.ref.x === 0 ? 1 : 0}"]`)), richtig: (st, it, G) => tippe(st.querySelector(`#c span[data-i="${G.ref.x}"]`)) } });

A.art({ id: "paare", fach: "deutsch", titel: "Paare finden", klang: "pop",
  en: { title: "Match pairs", does: "taps a card on the left and its partner on the right: word–picture, singular–plural, or sum–result. All cards are face up." },
  beispiel: [{ k: "Wort und Bild", l: ["Hund", "Baum", "Mond", "Schuh"], r: ["🐶", "🌳", "🌙", "👟"], rn: ["Das ist ein Hund.", "Das ist ein Baum.", "Das ist der Mond.", "Das ist ein Schuh."], h1: "Lies das Wort leise und such das passende Bild." },
    { k: "eins und viele", l: ["der Ball", "das Haus", "die Maus", "der Baum"], r: ["die Bälle", "die Häuser", "die Mäuse", "die Bäume"], rn: ["Das sind viele Bälle.", "Das sind viele Häuser.", "Das sind viele Mäuse.", "Das sind viele Bäume."], h1: "Sag: ein Ball, zwei … Wie heißt es, wenn es viele sind?" },
    { k: "Aufgabe und Ergebnis", l: ["3 · 4", "6 + 7", "20 − 5", "2 · 9"], r: ["12", "13", "15", "18"], rn: null, h1: "Rechne die Aufgabe links und such das Ergebnis rechts." }],
  mount(st, it, G){ G.say("n", it.bitte || `Leg immer zwei zusammen, die zusammengehören: ${it.k}.`);
    st.innerHTML = `<div class="scene"><div class="pairs"><div id="L" class="spalte"></div><div id="R" class="spalte"></div></div></div>`;
    const done = G.ref.done = new Set(), Lc = G.$("#L"), Rc = G.$("#R"); let sel = null;
    it.l.forEach((t, i) => { const d = document.createElement("div"); d.className = "pc"; d.textContent = t; d.dataset.i = i; Lc.appendChild(d);
      d.onclick = () => { if(G.locked || done.has(i)) return; sel = i; G.ref.last = i; Lc.querySelectorAll(".pc").forEach(x => x.classList.toggle("sel", x === d)); }; });
    shuffle(it.r.map((t, i) => [t, i])).forEach(([t, i]) => { const d = document.createElement("div"); d.className = "pc"; d.textContent = t; d.dataset.i = i; Rc.appendChild(d);
      d.onclick = () => { if(G.locked || done.has(i)) return; if(sel == null) return G.say("n", "Tipp zuerst links ein Kärtchen an.");
        if(i !== sel) return G.miss(it.rn ? it.rn[i] : `${t} kommt bei einer anderen Aufgabe heraus.`);
        done.add(i); [Lc.querySelector(`.pc[data-i="${i}"]`), d].forEach(x => { x.classList.remove("sel", "glow"); x.classList.add("done"); x.dataset.n = done.size; });
        sel = null; G.klang("pop"); G.$$(".pc.dim").forEach(x => x.classList.remove("dim")); if(done.size === it.l.length) G.solved(); }; }); },
  hint(r, it, G){ if(r === 1) return it.h1; const p = G.ref.last ?? it.l.findIndex((_, i) => !G.ref.done.has(i));
    if(r === 2){ const open = G.$$("#R .pc").filter(x => !x.classList.contains("done") && +x.dataset.i !== p); open.slice(0, Math.ceil(open.length / 2)).forEach(x => x.classList.add("dim")); return "Die hellen Kärtchen passen nicht dazu."; }
    [G.$(`#L .pc[data-i="${p}"]`), G.$(`#R .pc[data-i="${p}"]`)].forEach(x => x.classList.add("glow")); return `Diese zwei gehören zusammen. Tipp du erst „${it.l[p]}“, dann das andere leuchtende Kärtchen.`; },
  thanks: () => "Danke! Jetzt liegt alles ordentlich zusammen.", praise: () => "Du hast bei jedem Kärtchen genau überlegt.",
  probe: { falsch: st => { tippe(st.querySelector('#L .pc[data-i="0"]')); tippe(st.querySelector('#R .pc[data-i="1"]')); },
    richtig: (st, it) => it.l.forEach((_, i) => { tippe(st.querySelector(`#L .pc[data-i="${i}"]`)); tippe(st.querySelector(`#R .pc[data-i="${i}"]`)); }) } });

// ==================== HSU ====================
const TONNEN = { papier: ["🟦 Papier", "Die Papiertonne nimmt Papier und Pappe."], bio: ["🟫 Bio", "Die Biotonne nimmt Essensreste und Pflanzen."],
  wert: ["🟨 Wertstoff (Plastik, Dosen)", "Die Wertstoffinsel nimmt Plastik und Dosen."], rest: ["⬛ Restmüll", "In den Restmüll kommt, was nirgends sonst hinpasst."] };
A.art({ id: "muell", fach: "hsu", titel: "In die richtige Tonne sortieren", klang: "pop",
  en: { title: "Sort into bins", does: "drags each thing into the right Munich bin (paper, bio, recycling, rest)." },
  beispiel: [{ t: [["🍌", "Bananenschale", "bio", "aus der Natur"], ["📰", "Zeitung", "papier", "aus Papier"], ["🥤", "Plastikbecher", "wert", "aus Plastik"], ["🥫", "Dose", "wert", "aus Metall"], ["📦", "Karton", "papier", "aus Pappe"], ["🍎", "Apfelrest", "bio", "aus der Natur"], ["🩹", "Pflaster", "rest", "schmutzig, gemischt"]] }],
  // koerbe (optional, HSU-Themen): eigene Körbe {key: [Name, Satz bei einem Fehler]} statt der Münchner Tonnen
  mount(st, it, G){ G.say("n", it.bitte || "Hilfst du mir beim Aufräumen? Was kommt in welche Tonne?"); const K = it.koerbe || TONNEN;
    st.innerHTML = `<div class="scene"><div class="items" id="src"></div><div class="bins">${Object.entries(K).map(([k, [n]]) => `<div class="zone bin" data-b="${k}"><b>${n}</b><div class="items"></div></div>`).join("")}</div></div>`;
    const src = G.$("#src");
    shuffle(it.t).forEach(([e, n, b, m]) => { const d = document.createElement("div"); d.className = "thing"; d.dataset.n = n; d.innerHTML = `<span class="te">${e}</span>${n}<span class="tm" hidden>${m}</span>`; src.appendChild(d);
      G.draggable(d, { onTap: () => G.sprich(n), onDrop: z => { if(!z || !z.dataset.b) return; G.ref.last = { n, b };
        if(z.dataset.b === b){ z.querySelector(".items").appendChild(d); G.$$(".bin").forEach(x => x.classList.remove("glow")); G.klang("pop"); if(!src.querySelector(".thing")) G.solved(); } else G.miss(K[z.dataset.b][1]); } }); }); },
  hint(r, it, G){ if(r === 1) return it.h1 || "Woraus ist das gemacht?";
    if(r === 2){ G.$$(".tm").forEach(m => m.hidden = false); return it.koerbe ? "Unter jedem Bild steht jetzt ein Tipp." : "Unter jedem Ding steht jetzt, woraus es ist."; }
    const l = G.ref.last; if(!l) return null; G.$$(".bin").forEach(x => x.classList.toggle("glow", x.dataset.b === l.b)); return it.koerbe ? `„${l.n}“ gehört in den leuchtenden Korb. Zieh du es hinein.` : `Für ${l.n} ist es die leuchtende Tonne. Zieh du es hinein.`; },
  thanks: it => it.dank || (it.koerbe ? "Danke! Jetzt ist alles richtig sortiert." : "Danke! Jetzt ist alles aufgeräumt."), praise: it => it.lob || "Du hast bei jedem Ding überlegt, woraus es ist.",
  probe: { falsch: (st, it) => sortiere(st, ".thing", ".bin", "b", d => it.t.find(x => x[1] === d.dataset.n)[2], true),
    richtig: (st, it) => sortiere(st, ".thing", ".bin", "b", d => it.t.find(x => x[1] === d.dataset.n)[2], false) } });

// Was passt nicht dazu? (Ticket 35): vier Bildkarten, drei gehören zusammen. Hilfe: was die drei gemeinsam haben (tipp),
// dann legt die Katze eine passende Karte weg; tippen muss Azra selbst.
A.art({ id: "raus", fach: "hsu", titel: "Was passt nicht dazu?", klang: "pop",
  en: { title: "Odd one out", does: "sees four picture cards and taps the one that does not belong with the other three." },
  beispiel: [{ c: [["🐝", "Biene"], ["🦋", "Schmetterling"], ["🐞", "Marienkäfer"], ["🐟", "Fisch"]], x: 3, tipp: "Drei sind Insekten mit sechs Beinen." },
    { c: [["🌧️", "Regen"], ["☀️", "Sonne"], ["❄️", "Schnee"], ["🧊", "Hagel"]], x: 1, tipp: "Drei fallen vom Himmel." }],
  mount(st, it, G){ G.say("n", it.bitte || "Drei passen zusammen, eins nicht. Tipp auf das, was nicht dazupasst.");
    st.innerHTML = `<div class="scene"><div class="row raus">${shuffle(it.c.map((c, i) => [...c, i])).map(([e, n, i]) => `<button class="opt bild rk" data-i="${i}">${e}<span>${n}</span></button>`).join("")}</div></div>`;
    G.$$(".rk").forEach(b => b.onclick = () => { if(G.locked || b.disabled) return;
      if(+b.dataset.i === it.x){ b.classList.add("x"); G.solved(); } else G.miss(`${it.c[+b.dataset.i][1]} passt gut zu den anderen.`); }); },
  hint(r, it, G){ if(r === 1) return "Schau dir alle vier an. Was haben drei davon gemeinsam?";
    if(r === 2) return it.tipp;
    if(G.ref.weg) return "Drei Karten sind noch da. Welche passt nicht zu den anderen?"; // nur eine Karte weg, nie die Antwort
    const weg = G.ref.weg = G.$$(".rk").find(b => +b.dataset.i !== it.x); weg.disabled = true; weg.classList.add("dim");
    return "Das hier passt sicher dazu, ich lege es weg. Welche von den dreien passt nicht?"; },
  praise: () => "Du hast überlegt, was drei gemeinsam haben.",
  probe: { falsch: (st, it) => tippe(st.querySelector(`.rk:not([data-i="${it.x}"]):not([disabled])`)), richtig: (st, it) => tippe(st.querySelector(`.rk[data-i="${it.x}"]`)) } });

A.art({ id: "beschriften", fach: "hsu", titel: "Bild beschriften", klang: "pop",
  en: { title: "Label a picture", does: "drags word cards to the right parts of a plant (blossom, leaf, stem, root)." },
  beispiel: [{ z: [["bluete", "Blüte", 8, 20, "bunt, duftet"], ["blatt", "Blatt", 210, 170, "grün und flach"], ["stengel", "Stängel", 8, 200, "trägt die Blüte"], ["wurzel", "Wurzel", 210, 310, "steckt in der Erde"]] }],
  mount(st, it, G){ G.say("n", it.bitte || "Weißt du, wie die Teile meiner Blume heißen? Zieh die Wörter an ihren Platz.");
    st.innerHTML = `<div class="scene"><div class="plant"><svg viewBox="0 0 340 380" width="340" height="380"><rect x="0" y="285" width="340" height="95" fill="#c9a985"/>
      <path d="M170,290 L150,340 M170,290 L175,350 M170,290 L195,335 M150,340 L140,360 M195,335 L205,355" stroke="#7a5a3a" stroke-width="5" fill="none"/>
      <path d="M170,290 L170,95" stroke="#4f9a3d" stroke-width="9"/><path d="M170,200 C200,170 240,175 250,190 C230,210 195,215 170,205Z" fill="#6cbf4a"/>
      ${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="170" cy="62" rx="16" ry="34" fill="#c58be8" transform="rotate(${a} 170 90)"/>`).join("")}<circle cx="170" cy="90" r="18" fill="#ffd34d"/></svg>
      ${it.z.map(([k, , x, y, d]) => `<div class="zone pz" data-z="${k}" style="left:${x}px;top:${y}px"><span class="pd" hidden>${d}</span></div>`).join("")}</div><div class="row" id="src"></div></div>`;
    const src = G.$("#src");
    shuffle(it.z).forEach(([k, n]) => { const d = document.createElement("div"); d.className = "lbl2"; d.textContent = n; d.dataset.k = k; src.appendChild(d);
      G.draggable(d, { onTap: () => G.sprich(n), onDrop: z => { if(!z || !z.dataset.z) return; G.ref.last = { k, n };
        if(z.dataset.z === k){ z.appendChild(d); z.classList.remove("glow"); G.klang("pop"); if(!src.querySelector(".lbl2")) G.solved(); }
        else G.miss(`Dieser Teil ist ${it.z.find(q => q[0] === z.dataset.z)[4]}.`); } }); }); },
  hint(r, it, G){ if(r === 1) return "Schau, wo das Teil an der Pflanze sitzt.";
    if(r === 2){ G.$$(".pd").forEach(p => p.hidden = false); return "An jeder Stelle steht jetzt, wie der Teil ist."; }
    const l = G.ref.last; if(!l) return null; G.$$(".pz").forEach(z => z.classList.toggle("glow", z.dataset.z === l.k)); return `${l.n} gehört an die leuchtende Stelle. Zieh du es hin.`; },
  praise: () => "Du hast genau hingeschaut, wo jeder Teil sitzt.",
  probe: { falsch: st => sortiere(st, ".lbl2", ".pz", "z", d => d.dataset.k, true), richtig: st => sortiere(st, ".lbl2", ".pz", "z", d => d.dataset.k, false) } });

// Reihenfolge legen: Karte für Feld s ziehen; eine verdrängte Karte geht zurück
function ordne(st, folge){ folge.forEach((i, s) => { const slot = st.querySelector(`.slot[data-s="${s}"]`), c = st.querySelector(`.pcard[data-i="${i}"]`); if(c.parentElement !== slot) ziehe(c, slot); }); tippe(st.querySelector("#go")); }
A.art({ id: "reihenfolge", fach: "hsu", titel: "Bilder in die richtige Reihenfolge", klang: "chime",
  en: { title: "Put in order", does: "drags picture cards into the slots 1 to 4 (growth, times of day, steps)." },
  beispiel: [{ q: "Wie wächst eine Sonnenblume?", c: [["🌰", "Samen"], ["🌱", "Keimling"], ["🌿", "Pflanze mit Blättern"], ["🌻", "Blüte"]] }, { q: "Wie geht ein Tag?", c: [["🌅", "Morgen"], ["☀️", "Mittag"], ["🌇", "Abend"], ["🌙", "Nacht"]] }],
  mount(st, it, G){ G.say("n", it.bitte || `${it.q} Leg die Bilder der Reihe nach.`);
    st.innerHTML = `<div class="scene"><div class="slots">${[1, 2, 3, 4].map(n => `<div class="zone slot" data-s="${n - 1}"><span class="sn">${n}</span></div>`).join("")}</div><div class="row" id="src"></div><button class="btn" id="go">Fertig</button></div>`;
    const src = G.$("#src"); G.ref.cards = {};
    shuffle(it.c.map((c, i) => [...c, i])).forEach(([e, n, i]) => { const d = document.createElement("div"); d.className = "pcard"; d.dataset.i = i; d.innerHTML = `<span class="pe">${e}</span>${n}`; src.appendChild(d); G.ref.cards[i] = d;
      G.draggable(d, { onTap: () => { if(d.dataset.lock) return; src.appendChild(d); }, onDrop: z => { if(!z || d.dataset.lock) return;
        if(z.dataset.s){ const o = z.querySelector(".pcard"); if(o){ if(o.dataset.lock) return; src.appendChild(o); } z.appendChild(d); G.klang("pop"); } else if(z === src) src.appendChild(d); } }); });
    src.classList.add("zone", "ablage");
    G.$("#go").onclick = () => { if(G.locked) return; const seq = G.$$(".slot").map(s => s.querySelector(".pcard")); if(seq.some(x => !x)) return G.say("n", "Leg erst alle vier Bilder hin.");
      seq.every((c, i) => +c.dataset.i === i) ? G.solved() : G.miss(`So erzählt es deine Reihe: ${seq.map(c => it.c[+c.dataset.i][1]).join(", ")}.`); }; },
  hint(r, it, G){ if(r === 1) return it.anfang || "Was kommt ganz am Anfang?";
    if(r === 2){ const s0 = G.$('.slot[data-s="0"]'), o = s0.querySelector(".pcard"), c = G.ref.cards[0]; if(o && o !== c) G.$("#src").appendChild(o); s0.appendChild(c); c.dataset.lock = 1; return `Am Anfang steht: ${it.c[0][1]}. Wie geht es weiter?`; }
    Object.values(G.ref.cards).forEach(c => { c.dataset.n = +c.dataset.i + 1; }); return "Die Zahlen zeigen dir die Reihenfolge. Leg du die Bilder hin."; },
  praise: it => it.lob || "Du hast dir überlegt, was zuerst passiert.",
  probe: { falsch: st => ordne(st, [0, 2, 1, 3]), richtig: st => ordne(st, [0, 1, 2, 3]) } });
})();
