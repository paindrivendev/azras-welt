/* Tagesplan von Azras Welt: reine Funktionen ohne DOM. Regeln: PLAN.md "A day", Ticket 03.
   Ein Tag hat drei Einladungen in beliebiger Reihenfolge: Lese-Zeit (Bücherregal), Mathe-Zeit und Extra-Zeit
   (Deutsch, Deutsch, HSU nach Spieltagen). Jede Zeit findet an einem Ort statt; der Ort eines neuen Schritts zuerst.
   inhalt (aus den Schritt-Inhalten, Ticket 06): { steps: {id: {home, arten: [...]}}, orte: {ort: [arten]} }.
   Ein Block: {kind, fach, neu, zuerst, ort, ueben: [ids], wiederholen: [ids], leicht: [ids], n, leer}.
   zuerst: der neue Schritt ist aus dem Kapitel, das die Klasse gerade hat; die Katze zeigt ihn, bevor Azra probiert. */
(function(root){
"use strict";
const L = typeof module !== "undefined" && module.exports ? require("./lernen.js") : root.LERNEN;
const EXTRA = ["deutsch", "deutsch", "hsu"];
// Extra-Zeit nach gespielten Tagen vor heute: wer einen Tag nicht spielt, verschiebt nichts.
function extraFach(played, today){ return EXTRA[new Set(played.filter(d => d < today)).size % 3]; }
// Kann der Schritt an diesem Ort gefragt werden? Zuhause immer, sonst wenn eine seiner Aufgabenarten dort passt.
// Offline-Schritte nie: die haken die Eltern ab.
function passt(inhalt, id, ort){ const c = inhalt.steps[id]; if(!c || c.offline) return false;
  return c.home === ort || (c.arten || []).some(a => (inhalt.orte[ort] || []).includes(a)); }
const laeuft = r => r && !r.mastered && (r.stage === "try" || r.stage === "teach");
const imUeben = r => r && !r.mastered && r.stage === "practice";
// Gemeisterte Schritte, die an diesem Ort leicht gehen (höchste Stufe zuerst): für die Zugabe nach einem Fehler.
function leichte(ids, steps, inhalt, ort){
  return ids.filter(id => steps[id] && steps[id].mastered && passt(inhalt, id, ort)).sort((a, b) => steps[b].rung - steps[a].rung); }
// Aufgaben pro Block nach ihrer Zeit pro Aufgabe (lernen.js): Mathe-Zeit wie "math", Extra-Zeit und freies Spiel wie "extra".
const groesse = (kind, zeiten) => L.blockSize(kind === "mathe" ? "math" : "extra", (zeiten || {})[kind] || []);
const faellig = (r, today) => r && r.mastered && r.rung < L.POOL && r.due && r.due <= today;
function block(kind, fach, neu, ort, ids, steps, inhalt, today, zeiten, zuerst){
  const n = groesse(kind, zeiten);
  if(!ort) return { kind, fach, neu: null, zuerst: false, ort: null, ueben: [], wiederholen: [], leicht: [], n, leer: true };
  const ueben = ids.filter(id => id !== neu && imUeben(steps[id]) && passt(inhalt, id, ort));
  const wiederholen = L.dueReviews(steps, ids.filter(id => passt(inhalt, id, ort)), today);
  return { kind, fach, neu, zuerst: !!(neu && zuerst), ort, ueben, wiederholen, leicht: leichte(ids, steps, inhalt, ort), n,
    leer: !neu && !ueben.length && !wiederholen.length };
}
// Ein Block eines Fachs. Neu ist ein angefangener Schritt (Probe/Zeigen) oder der nächste aus chooseNew; nur Schritte
// mit Inhalt und offenem Zuhause fangen neu an, eine Voraussetzung ohne beides lässt ihren Schritt warten. Ein heute
// schon angefangener Schritt des Fachs zählt als neu für heute (auch nach Neuladen). Ohne neuen Schritt: der offene
// Ort, an dem die meisten Übe- und heute fälligen Schritte gehen (der Pool zieht nicht); gleich viele → der am
// längsten nicht besuchte, dann der, wo die meisten zu Hause sind.
// Nächste Stunde (o.naechste[kind]: beiseitegelegte Schritte): ohne diese planen, als wäre für das Fach ein neuer Tag.
function fachBlock(kind, fach, skills, steps, inhalt, o){
  const nx = (o.naechste || {})[kind], ohne = nx || [], ids = skills.filter(s => s.subject === fach && !ohne.includes(s.id)).map(s => s.id), f = (o.fest || {})[kind];
  // Schreibschrift wird nachgespurt, nie vorher gezeigt (wie bei buchen)
  const zuerst = id => { const sk = skills.find(s => s.id === id), c = id && inhalt.steps[id];
    return !!sk && !!c && !(c.arten || []).includes("spuren") && L.place(sk, o.classAt, o.today) >= 0; };
  if(f && f.ort){ const neu = ids.includes(f.neu) ? f.neu : null; // heute schon festgelegt (ohne Übersprungenes)
    return block(kind, fach, neu, f.ort, ids, steps, inhalt, o.today, o.zeiten, zuerst(neu)); }
  const anbietbar = s => !ohne.includes(s.id) && !!(inhalt.steps[s.id] && !inhalt.steps[s.id].offline && o.offen.includes(inhalt.steps[s.id].home));
  let neu = ids.find(id => laeuft(steps[id]) && inhalt.steps[id] && o.offen.includes(inhalt.steps[id].home)) || null;
  const heuteNeu = nx ? 0 : Math.max((o.newToday || {})[kind] || 0, ids.filter(id => steps[id] && steps[id].started === o.today).length);
  if(!neu) neu = L.chooseNew(skills, steps, { subject: fach, classAt: o.classAt, today: o.today, newToday: heuteNeu, offer: anbietbar });
  if(neu) return block(kind, fach, neu, inhalt.steps[neu].home, ids, steps, inhalt, o.today, o.zeiten, zuerst(neu));
  const offen = ids.filter(id => imUeben(steps[id]) || faellig(steps[id], o.today));
  const orte = [...new Set([...Object.keys(inhalt.orte), ...ids.map(id => inhalt.steps[id] && inhalt.steps[id].home).filter(Boolean)])]
    .filter(ort => o.offen.includes(ort));
  const z = o.zuletzt || {}, score = ort => offen.filter(id => passt(inhalt, id, ort)).length;
  const daheim = ort => offen.filter(id => inhalt.steps[id] && inhalt.steps[id].home === ort).length;
  const best = orte.filter(score).sort((a, b) => score(b) - score(a) || (z[a] || "").localeCompare(z[b] || "") || daheim(b) - daheim(a))[0];
  return block(kind, fach, null, best || null, ids, steps, inhalt, o.today, o.zeiten);
}
// Der Plan für heute. o: {classAt, today, played (Spieltage), offen (offene Orte), newToday: {mathe, extra},
// zuletzt: {ort: datum}, zeiten: {mathe: [{date, seconds}], extra: [...]} (Zeit pro Aufgabe für die Blockgröße),
// fest: {mathe: {ort, neu}, extra: {...}} (der heutige Plan, einmal festgelegt, damit Brief und Ort den Tag über bleiben)}
function planen(skills, steps, inhalt, o){
  return { lesen: { kind: "lesen", ort: "regal" },
    mathe: fachBlock("mathe", "mathe", skills, steps, inhalt, o),
    extra: fachBlock("extra", extraFach(o.played || [], o.today), skills, steps, inhalt, o) };
}
// Freies Spiel nach dem Plan: Üben und fällige Wiederholungen an diesem Ort, nie ein neuer Schritt.
function frei(skills, steps, inhalt, ort, today, zeiten){
  return block("frei", null, null, ort, skills.map(s => s.id), steps, inhalt, today, zeiten && { frei: zeiten.extra });
}
// Die nächste Aufgabe eines Blocks oder null. done: [{id, alone, rolle, skip}] der Aufgaben in diesem Block, wie naechste
// sie gegeben hat; ein übersprungener Schritt kommt in diesem Block nicht wieder. Erst die zwei Probe-Aufgaben des neuen Schritts (auch wenn er noch nicht angelegt ist; nach dem
// ersten Fehler zeigt die Katze), dann Üben mit versteckten Wiederholungen dazwischen. Endet der Block mit einer
// Aufgabe, die nicht allein ging, kommen bis zu 2 leichte dazu: ein gemeisterter Schritt, der hier passt, sonst einer,
// der in diesem Block allein ging; nie einer, der hier gerade nicht allein ging.
function naechste(b, steps, done){
  if(b.leer) return null;
  const neu = b.neu && steps[b.neu], last = done[done.length - 1];
  if(neu && neu.stage === "teach") return { id: b.neu, rolle: "zeigen" };
  if(b.neu && b.zuerst && (!neu || (neu.stage === "try" && !neu.tries))) return { id: b.neu, rolle: "zeigen" }; // Stoff der Klasse: erst zeigen
  const zugabe = () => {
    if(!last || last.alone || last.skip || done.filter(r => r.rolle === "zugabe").length >= 2) return null;
    const daneben = new Set(done.filter(r => !r.alone).map(r => r.id)), ok = id => !daneben.has(id);
    const leicht = (b.leicht || []).find(id => steps[id] && steps[id].mastered && ok(id));
    if(leicht) return { id: leicht, rolle: "zugabe" };
    const gut = id => done.filter(r => r.id === id && r.alone).length;
    const allein = [...new Set(done.filter(r => r.alone).map(r => r.id))].filter(ok).sort((x, y) => gut(y) - gut(x));
    return allein.length ? { id: allein[0], rolle: "zugabe" } : null;
  };
  if(done.length >= b.n) return zugabe();
  const probe = b.neu && (!neu || neu.stage === "try") ? { id: b.neu, rolle: "probe" } : null, skipped = id => done.some(r => r.skip && r.id === id);
  if(probe && !skipped(b.neu)) return probe;
  const ids = done.map(r => r.id), offen = b.wiederholen.filter(id => !ids.includes(id));
  if(offen.length && !(last && b.wiederholen.includes(last.id))) return { id: offen[0], rolle: "wdh" };
  // Übersprungenes kommt in dieser Zeit nicht wieder; ist nichts anderes übrig, endet die Zeit (Rückmeldung der Eltern)
  const ueb = [...(b.neu && imUeben(neu) ? [b.neu] : []), ...b.ueben].filter(id => !skipped(id));
  if(!ueb.length) return offen.length ? { id: offen[0], rolle: "wdh" } : zugabe();
  // Ein Schritt bekommt erst seine Aufgaben für einen guten Tag, dann der nächste; danach abwechselnd
  // gezählt wird nur Üben: die Probe-Aufgaben zählen nicht für den guten Tag (L.answer bucht sie nicht in days)
  const n = id => done.filter(r => r.id === id && r.rolle !== "probe").length, voll = ueb.find(id => n(id) < L.GUT_N);
  return { id: voll || ueb.reduce((a, c) => n(c) < n(a) ? c : a), rolle: "ueben" };
}
// Einladungen für die offenen Zeiten: der Brief des Tages lädt zur Zeit mit dem neuen Schritt ein (sonst zur ersten
// Zeit mit Arbeit), die Katze zu den anderen. Fertige und leere Zeiten fallen weg. briefOrte (optional): nur dort
// wohnt jemand, der schreibt; eine Zeit in ihrem Zimmer lädt die Katze ein. verschoben (optional): Zeiten, die sie mit
// "Alles später" weggelegt hat; sie warten am Ende, nach dem Lesen (spaeter: true).
function einladungen(plan, fertig, briefOrte, verschoben){
  const schreibt = b => !briefOrte || briefOrte.includes(b.ort);
  const alle = ["mathe", "extra"].map(k => plan[k]).filter(b => !b.leer), brief = alle.find(b => b.neu && schreibt(b)) || alle.find(schreibt);
  const zeiten = alle.filter(b => !fertig.includes(b.kind)); // der Brief des Tages wandert nicht weiter
  const out = zeiten.map(b => ({ kind: b.kind, ort: b.ort, von: b === brief ? "brief" : "katze" }));
  out.sort((a, b) => (a.von === "brief" ? 0 : 1) - (b.von === "brief" ? 0 : 1));
  if(!fertig.includes("lesen")) out.push({ kind: "lesen", ort: plan.lesen.ort, von: "katze" });
  const spaeter = new Set(verschoben || []);
  return [...out.filter(e => !spaeter.has(e.kind)), ...out.filter(e => spaeter.has(e.kind)).map(e => ({ ...e, spaeter: true }))];
}
// Ein Ergebnis in den Schritt buchen. Schreibschrift (spuren) zählt nachgespurte Tage und ist nie daneben, ohne Probe
// und Zeigen. schon: beide Probe-Aufgaben allein ("Oh, das kannst du ja schon!"); lernen: erster Fehler in der Probe.
function buchen(r, today, alone, art){
  if(art === "spuren") return { r: L.traced({ ...r, stage: r && r.mastered ? r.stage : "practice" }, today), schon: false, lernen: false };
  const n = L.answer(r, today, alone), probe = r && !r.mastered && r.stage === "try";
  return { r: n, schon: probe && n.stage === "practice", lernen: probe && n.stage === "teach" };
}
// Schwierigkeit einer Aufgabe im Schritt: Probe 0, gemeistert 2, sonst nach den früheren Übungstagen (heute zählt nicht).
function stufe(r, rolle, today){
  if(rolle === "probe" || !r) return 0; if(r.mastered) return 2;
  return Math.min(2, Object.keys(r.days || {}).filter(d => d !== today).length);
}
// Die Schritte, die sie lernen kann: ein übersprungener Schritt ist für immer weg, bis die Eltern ihn zurückholen
// (ausgelassen: Schritt → Datum). Ein späterer Schritt, der ihn voraussetzt, wartet dann nicht mehr auf ihn.
function lernbar(skills, ausgelassen){ return skills.filter(s => !ausgelassen[s.id]); }
// Spieltag: der echte Tag, oder der Tag, den die Eltern mit "Start next day" begonnen haben, solange er später ist.
function spielDatum(echt, spielTag){ return spielTag && spielTag > echt ? spielTag : echt; }
// Heute nicht mehr dran: fertig, vom Fach her weggelassen ("Heute kein Deutsch") oder alles, wenn sie heute nur spielt (Ticket 20).
function vorbei(h){ return [...h.fertig, ...h.weg, ...(h.spielen === true ? ["mathe", "extra", "lesen"] : [])]; }
const T = { spielDatum, extraFach, buchen, stufe, passt, planen, frei, naechste, einladungen, lernbar, vorbei };
if(typeof module !== "undefined" && module.exports) module.exports = T; else root.TAG = T;
})(this);
