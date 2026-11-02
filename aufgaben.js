/* Aufgabenarten von Azras Welt: der Ablauf einer Aufgabenreihe (rein, getestet) und der Rahmen, in den jede Art
   (arten.js) sich einhängt. Regeln: PLAN.md "Mistakes and praise": nie "falsch", Hilfe-Leiter der Katze erst nach dem
   ersten Versuch (Hinweis → Teilhilfe → gemeinsam, den letzten Schritt macht Azra), "allein gelöst" = beim ersten
   Versuch richtig, höchstens 2 Lob-Sätze pro Aktivität, nach 3 Aufgaben nacheinander nicht allein lässt das Spiel nach.

   Eine Art (AUFGABEN.art({...})):
     id, fach ("mathe" | "deutsch" | "hsu"), titel (Deutsch), en: {title, does} (Elternseite), klang (Name in KLANG),
     binary (true = nur 2 Antworten, keine Hilfe-Leiter), beispiel: [Aufgaben] (Beispieldaten aus dem Prototyp),
     mount(st, it, G)          baut die Aufgabe in st und sagt die Bitte mit G.say("n", …)
     hint(rung, it, G)         Hilfe-Stufe 1–3, gibt den Satz der Katze zurück
     praise(it, G), thanks(it, G)   leiser Lob-Satz der Katze / Dank des Nachbarn (optional)
     nieFalsch (true = wird nie als daneben gewertet, z. B. Nachspuren)
     probe: {falsch(st, it, G), richtig(st, it, G)}   bedient die Aufgabe wie ein Finger (nur für den Rauchtest)
   G (pro Aufgabe): say(wer, text) mit wer "n" (Nachbar) oder "c" (Katze), sprich(text) (nur vorlesen, ohne Blase,
   z. B. das Wort beim Hördiktat), miss(reaktion), solved(), ref (Notizen der Art für diese Aufgabe), locked, rung,
   $(sel), $$(sel), klang(name), draggable(el, {onDrop, onTap}). */
(function(root){
"use strict";
// ---------- Ablauf (rein) ----------
function neu(n){ return { n, i: 0, tries: 0, row: 0, praised: 0, skips: 0, results: [] }; }
function daneben(s, binary){ const t = { ...s, tries: s.tries + 1 }; return { s: t, rung: binary ? 0 : Math.min(t.tries, 3) }; }
// ohneLob: bei 2 Antworten geht es nach einer falschen weiter (dann kein Lob)
function geschafft(s, { ohneLob = false } = {}){
  const alone = s.tries === 0, last = s.i === s.n - 1, row = alone ? 0 : s.row + 1;
  const praise = !ohneLob && row < 3 && s.praised < 2 && (s.i === 1 || last); // lässt das Spiel nach, sagt die Katze das statt Lob
  const t = { ...s, row, skips: 0, praised: s.praised + (praise ? 1 : 0), results: [...s.results, { alone, tries: s.tries }] };
  return { s: t, alone, praise, easeOff: row >= 3, last };
}
// Übersprungen: ohne Satz über einen Fehler, die nächste Aufgabe kommt; beendet die Reihe nie (der Aufrufer legt den
// Schritt für immer weg, Ticket 18).
function ausgelassen(s){
  const t = { ...s, skips: s.skips + 1, results: [...s.results, { alone: false, tries: s.tries, skip: true }] };
  return { s: t, alone: false, praise: false, ende: false, last: s.i === s.n - 1 };
}
function weiter(s){ return { ...s, i: s.i + 1, tries: 0 }; }
const A = { neu, daneben, geschafft, ausgelassen, weiter };
if(typeof module !== "undefined" && module.exports){ module.exports = A; return; }

// ---------- Rahmen im Browser ----------
const arten = {};
A.arten = arten;
A.art = def => { arten[def.id] = def; };
let AC; const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
function tone(f, d, type = "sine", vol = .12, when = 0){ try{ const c = ac(), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, c.currentTime + when); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + when + d); o.connect(g).connect(c.destination); o.start(c.currentTime + when); o.stop(c.currentTime + when + d + .05); }catch(e){} }
function noise(d, vol = .08){ try{ const c = ac(), b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), x = b.getChannelData(0); for(let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1200; g.gain.value = vol; s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(); }catch(e){} }
// Welt-Klänge statt Lob-Worten
const KLANG = { plop(){ tone(260, .14, "sine", .06); }, pop(){ tone(620, .07, "sine", .06); }, clink(){ tone(1900, .18, "triangle", .07); tone(2500, .22, "triangle", .05, .07); },
  splash(){ noise(.45); }, chime(){ tone(880, .3, "sine", .06); tone(1320, .35, "sine", .04, .12); }, paper(){ noise(.15, .05); } };
A.KLANG = KLANG;
const EASE = "Magst du kurz was anderes machen?";
// Spielt eine Reihe von Aufgaben in stage: eine Art mit ihren Aufgaben, oder eine Zeit, die Aufgabe für Aufgabe fragt.
// opts: {art, items} (eine Art) oder naechste() → {art, item, zusammen} | null (nach jedem Ergebnis neu gefragt),
//   ergebnis({alone, tries, ms, art, item, zusammen}) (vor dem nächsten naechste()), sag(wer, text), sprich(text),
//   stumm() (Stimme anhalten), fertig(results, {aufgehoert}), easeOff(), hilfeNach (ms)
// Nach dem Lösen kommt die nächste Aufgabe von selbst (nach Klang und Lob). "überspringen" geht gleich zur nächsten
// (ergebnis bekommt skip: true). Bei 2 Antworten geht es auch nach einer falschen weiter.
// zusammen: die Katze geht die Aufgabe gleich mit allen Hilfe-Stufen durch, Azra macht den letzten Schritt (nach dem Zeigen).
A.spielen = function(stage, opts){
  const wait = opts.hilfeNach ?? 1300, liste = opts.items || (opts.art && arten[opts.art].beispiel) || [];
  let k = 0;
  const naechste = opts.naechste || (() => k < liste.length ? { art: opts.art, item: liste[k++] } : null);
  let cur = naechste(), s = neu(Infinity), locked = false, timer = null, stopped = false, t0 = 0;
  const spaeter = []; // Lob und Nachlassen: überleben schnelles Weiter, enden mit stop()
  const art = () => arten[cur.art];
  stage.innerHTML = `<div class="aufgabe"></div><div class="aufgabe-fuss"><button class="btn ghost skip">überspringen ⏭</button></div>`;
  const box = stage.querySelector(".aufgabe"), skip = stage.querySelector(".skip");
  const G = {
    ref: {}, get locked(){ return locked; }, get rung(){ return Math.min(s.tries, 3); },
    $: sel => box.querySelector(sel), $$: sel => [...box.querySelectorAll(sel)],
    klang: k => (KLANG[k] || KLANG.chime)(),
    say: (wer, text) => opts.sag(wer, text),
    sprich: text => { if(opts.sprich) opts.sprich(text); },
    draggable(el, { onDrop, onTap }){
      el.classList.add("tok");
      el.addEventListener("pointerdown", e => { if(locked) return; e.preventDefault(); const sx = e.clientX, sy = e.clientY; let ghost = null;
        const move = ev => { if(!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8){ ghost = el.cloneNode(true); ghost.classList.add("dragghost"); document.body.appendChild(ghost); el.classList.add("dragging"); }
          if(ghost){ ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; } };
        const up = ev => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
          if(ghost){ ghost.remove(); el.classList.remove("dragging"); const t = document.elementFromPoint(ev.clientX, ev.clientY); onDrop && onDrop(t && t.closest(".zone")); }
          else onTap && onTap(); };
        addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up); });
    },
    miss(reaktion){
      if(locked) return;
      const r = daneben(s, art().binary); s = r.s;
      KLANG.plop(); G.say("n", reaktion);
      if(art().binary){ G.ref.richtig && G.ref.richtig(); return fertigItem({ ohneLob: true, pause: 1500 + 55 * String(reaktion || "").length }); }
      if(r.rung && !hintT) nextHint();
    },
    solved(){ fertigItem({}); }
  };
  // Eine Aufgabe ist vorbei (gelöst, bei 2 Antworten daneben, oder übersprungen): buchen, dann von selbst weiter.
  function fertigItem({ ohneLob = false, pause = 0, ausgelassen: aus = false }){
    if(locked) return;
    locked = true; skip.hidden = true; clearTimeout(timer); clearTimeout(hintT); hintT = null;
    const it = cur.item, a = art(), alone = !aus && s.tries === 0 && !cur.zusammen;
    if(opts.ergebnis) opts.ergebnis({ alone, tries: s.tries, ms: Date.now() - t0, art: cur.art, item: it, zusammen: !!cur.zusammen, skip: aus });
    // nachlassen, bevor die nächste Aufgabe gefragt wird, damit die Zeit kürzer werden kann
    if(!aus && !alone && s.row + 1 >= 3 && opts.easeOff) opts.easeOff();
    const nach = naechste(); s = { ...s, n: nach ? Infinity : s.i + 1 };
    const r = aus ? A.ausgelassen(s) : geschafft(s, { ohneLob }); s = r.s;
    if(!aus && !ohneLob){ G.klang(a.klang); if(a.thanks) G.say("n", a.thanks(it, G)); }
    // eigener Zeitgeber: das Lob kommt, bevor die nächste Aufgabe es verdrängt
    if(r.praise && a.praise) spaeter.push(setTimeout(() => G.say("c", a.praise(it, G)), wait ? 1100 : 0));
    if(r.easeOff) spaeter.push(setTimeout(() => G.say("c", EASE), wait ? 1100 : 0));
    const ms = !wait ? 0 : aus ? 300 : Math.max(pause, r.praise || r.easeOff ? 3400 : 1500);
    spaeter.push(setTimeout(() => {
      if(stopped) return;
      if(r.last){ stop(); opts.fertig && opts.fertig(s.results); } else { cur = nach; s = weiter(s); start(); }
    }, ms));
  }
  skip.onclick = () => { if(!locked) fertigItem({ ausgelassen: true }); };
  // Hilfe-Stufen der Reihe nach, auch wenn zwei Fehlversuche schnell hintereinander kommen
  let shown = 0, hintT = null;
  function nextHint(){
    hintT = setTimeout(() => {
      hintT = null; if(stopped || locked) return;
      const t = art().hint(Math.min(++shown, 3), cur.item, G); if(t) G.say("c", t);
      if(shown < Math.min(s.tries, 3)) nextHint();
    }, wait);
  }
  function start(){
    clearTimeout(timer); clearTimeout(hintT); hintT = null; shown = 0; if(opts.stumm) opts.stumm(); locked = false; G.ref = {}; skip.hidden = false; box.innerHTML = "";
    art().mount(box, cur.item, G); t0 = Date.now();
    if(cur.zusammen && !art().binary){ let t = null; for(let r = 1; r <= 3; r++) t = art().hint(r, cur.item, G) || t; shown = 3; if(t) G.say("c", t); }
  }
  function stop(){ stopped = true; clearTimeout(timer); clearTimeout(hintT); spaeter.forEach(clearTimeout); }
  if(cur) start(); else { stopped = true; if(opts.fertig) setTimeout(() => opts.fertig([]), 0); }
  return { G, stop, get state(){ return s; }, get item(){ return cur && cur.item; }, get art(){ return cur && cur.art; }, box };
};
root.AUFGABEN = A;
})(this);
