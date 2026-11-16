/* Kawan English — asisten belajar bahasa Inggris (PWA) */
(function () {
  "use strict";
  const L = window.LEVELS;
  const $app = document.getElementById("app");
  const KEY = "kawanEnglish.v1";
  const SKILLS = {
    reading: { name: "Reading", id: "Membaca", ic: "📖", cls: "t-read", color: "var(--read)" },
    listening: { name: "Listening", id: "Menyimak", ic: "🎧", cls: "t-listen", color: "var(--listen)" },
    speaking: { name: "Speaking", id: "Berbicara", ic: "🎤", cls: "t-speak", color: "var(--speak)" },
    writing: { name: "Writing", id: "Menulis", ic: "✍️", cls: "t-write", color: "var(--write)" }
  };

  /* ---------- Penyimpanan ---------- */
  const defState = { level: "A1", xp: 0, streak: 0, lastDay: null, done: {}, vocab: {}, rate: 0.9, journal: {}, placed: false };
  let S;
  try { S = Object.assign({}, defState, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { S = Object.assign({}, defState); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  const today = () => new Date().toISOString().slice(0, 10);
  function addXP(n) {
    S.xp += n;
    const t = today();
    if (S.lastDay !== t) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      S.streak = S.lastDay === y ? S.streak + 1 : 1;
      S.lastDay = t;
    }
    save();
  }
  function mark(key) { if (!S.done[key]) { S.done[key] = 1; save(); } }
  const lvl = () => L.find(x => x.id === S.level) || L[0];

  /* ---------- Util ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const CONTR = { "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is", "it's": "it is", "we're": "we are", "they're": "they are", "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have", "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will", "we'll": "we will", "they'll": "they will", "i'd": "i would", "you'd": "you would", "he'd": "he would", "she'd": "she would", "we'd": "we would", "they'd": "they would", "don't": "do not", "doesn't": "does not", "didn't": "did not", "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not", "haven't": "have not", "hasn't": "has not", "hadn't": "had not", "won't": "will not", "wouldn't": "would not", "can't": "cannot", "cannot": "cannot", "couldn't": "could not", "shouldn't": "should not", "there's": "there is", "that's": "that is", "what's": "what is", "let's": "let us" };
  function words(s) {
    s = String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9'\s-]/g, " ").replace(/-/g, " ");
    const out = [];
    s.split(/\s+/).filter(Boolean).forEach(w => {
      w = w.replace(/^'+|'+$/g, "");
      if (!w) return;
      (CONTR[w] || w).split(" ").forEach(x => out.push(x));
    });
    const NUM = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
    const SPELL = { practise: "practice", colour: "color", behaviour: "behavior", favourite: "favorite", labour: "labor", honour: "honor", neighbour: "neighbor", centre: "center", theatre: "theater", organised: "organized", organise: "organize", overgeneralise: "overgeneralize", prioritise: "prioritize", apologising: "apologizing", realise: "realize", ok: "okay" };
    return out.map(w => /^\d+$/.test(w) && +w <= 20 ? NUM[+w] : (SPELL[w] || w.replace(/-organised$/, "-organized")));
  }
  // LCS kata: kembalikan indeks kata target yang cocok
  function lcsMatch(target, said) {
    const n = target.length, m = said.length;
    const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      d[i][j] = target[i] === said[j] ? 1 + d[i + 1][j + 1] : Math.max(d[i + 1][j], d[i][j + 1]);
    const hit = new Set(); let i = 0, j = 0;
    while (i < n && j < m) {
      if (target[i] === said[j]) { hit.add(i); i++; j++; }
      else if (d[i + 1][j] >= d[i][j + 1]) i++; else j++;
    }
    return hit;
  }
  function similarity(a, b) { // a,b array kata
    if (!a.length && !b.length) return 1;
    const h = lcsMatch(a, b).size;
    return (2 * h) / (a.length + b.length);
  }
  function diffHTML(targetText, said) {
    const raw = targetText.split(/\s+/);
    const tw = raw.map(w => words(w).join(" "));
    const flat = [], owner = [];
    tw.forEach((w, k) => w.split(" ").filter(Boolean).forEach(x => { flat.push(x); owner.push(k); }));
    const hit = lcsMatch(flat, said);
    const okRaw = raw.map((_, k) => { const idx = owner.map((o, q) => o === k ? q : -1).filter(q => q >= 0); return idx.length && idx.every(q => hit.has(q)); });
    const score = flat.length ? Math.round(100 * hit.size / flat.length) : 0;
    return { html: raw.map((w, k) => `<span class="${okRaw[k] ? "hit" : "miss"}">${esc(w)}</span>`).join(" "), score };
  }

  /* ---------- Suara (TTS) ---------- */
  const synth = window.speechSynthesis;
  let voice = null;
  function pickVoice() {
    if (!synth) return;
    const vs = synth.getVoices();
    voice = vs.find(v => /en[-_]US/i.test(v.lang) && /google/i.test(v.name)) || vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /en[-_]GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
  function speak(text, rate, onend) {
    if (!synth) { toast("Perangkat ini belum mendukung suara. Coba pakai Chrome."); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; if (voice) u.voice = voice;
    u.rate = rate || S.rate;
    if (onend) u.onend = onend;
    synth.speak(u);
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  /* ---------- Navigasi ---------- */
  let stack = [];
  function go(view, params, replace) {
    if (synth) synth.cancel();
    const entry = { view, params: params || {} };
    if (replace && stack.length) stack[stack.length - 1] = entry; else { stack.push(entry); try { history.pushState({ d: stack.length }, ""); } catch (e) { } }
    render();
  }
  function back() { if (stack.length > 1) { history.back(); } }
  window.addEventListener("popstate", () => {
    if (synth) synth.cancel();
    if (stack.length > 1) { stack.pop(); render(); }
  });
  const cur = () => stack[stack.length - 1];

  function shell(title, body, opts) {
    opts = opts || {};
    const root = stack.length <= 1 || opts.root;
    const tab = opts.tab || "";
    $app.innerHTML = `
      <header class="top">
        ${root ? "" : `<button class="back" data-act="back" aria-label="Kembali">←</button>`}
        <h1 class="${root ? "serif" : ""}">${title}</h1>
        <span class="pill">🔥 ${S.streak} · ⭐ ${S.xp}</span>
      </header>
      <main>${body}</main>
      <nav class="bottom"><div class="in">
        ${[["home", "🏠", "Beranda"], ["vocab", "🃏", "Kosakata"], ["progress", "📈", "Progres"], ["help", "💡", "Bantuan"]].map(([v, i, n]) =>
          `<button data-tab="${v}" class="${tab === v ? "on" : ""}"><span>${i}</span>${n}</button>`).join("")}
      </div></nav>`;
    $app.querySelectorAll("[data-act=back]").forEach(b => b.onclick = back);
    $app.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { if (synth) synth.cancel(); stack = [{ view: b.dataset.tab, params: {} }]; render(); });
    window.scrollTo(0, 0);
  }
  function on(sel, fn) { $app.querySelectorAll(sel).forEach(el => el.addEventListener("click", e => fn(el, e))); }

  /* ---------- Progres skill ---------- */
  function skillItems(lv, sk) {
    if (sk === "reading") return lv.reading.length;
    if (sk === "listening") return lv.listening.length;
    if (sk === "speaking") return lv.speaking.length;
    if (sk === "writing") return lv.writing.translate.length + lv.writing.arrange.length + lv.writing.grammar.length + 1;
    return 0;
  }
  function skillDone(lv, sk) { return Object.keys(S.done).filter(k => k.startsWith(lv.id + ":" + sk + ":")).length; }
  function pct(lv, sk) { const t = skillItems(lv, sk); return t ? Math.min(100, Math.round(100 * skillDone(lv, sk) / t)) : 0; }

  /* ---------- Beranda ---------- */
  function vHome() {
    const lv = lvl();
    const all = L.flatMap(x => x.speaking.map(s => s));
    const dayIdx = Math.floor(Date.now() / 864e5) % all.length;
    const sod = all[dayIdx];
    const due = dueCards(lv).length;
    shell("Kawan English", `
      <div class="card hero">
        <div class="k">Level ${lv.id} · ${lv.name}</div>
        <h2 class="serif">Halo! Siap latihan hari ini?</h2>
        <p>${esc(lv.desc)}</p>
        <div class="stats">
          <div class="stat"><b>🔥 ${S.streak}</b>hari beruntun</div>
          <div class="stat"><b>⭐ ${S.xp}</b>poin XP</div>
          <div class="stat"><b>🃏 ${due}</b>kata perlu diulang</div>
        </div>
      </div>
      <div class="levels">${L.map(x => `<button class="lv ${x.id === S.level ? "on" : ""}" data-lv="${x.id}"><b>${x.id}</b><span>${x.name}</span></button>`).join("")}</div>
      <div class="grid">
        ${Object.entries(SKILLS).map(([k, s]) => `
          <button class="tile ${s.cls}" data-sk="${k}">
            <span class="ic">${s.ic}</span>
            <span><b>${s.name}</b><small>${s.id} · ${pct(lv, k)}%</small><span class="bar"><i style="width:${pct(lv, k)}%"></i></span></span>
          </button>`).join("")}
      </div>
      <button class="list-btn" data-go="vocab"><span class="ic">🃏</span><span><b>Kartu Kosakata</b><small>${lv.vocab.length} kata level ${lv.id} · sistem ulang berkala</small></span><span class="chev">›</span></button>
      ${!S.placed ? `<button class="list-btn" data-go="placement"><span class="ic">🎯</span><span><b>Tes Penempatan</b><small>10 soal singkat untuk menentukan levelmu</small></span><span class="chev">›</span></button>` : ""}
      <div class="sec-title">Kalimat hari ini</div>
      <div class="card">
        <div class="serif" style="font-size:21px">${esc(sod[0])}</div>
        <div class="muted" style="margin-top:4px">${esc(sod[1])}</div>
        <div class="btns"><button class="btn soft" data-sod>🔊 Dengarkan</button></div>
      </div>
      ${S.placed ? `<button class="list-btn" data-go="placement"><span class="ic">🎯</span><span><b>Ulangi Tes Penempatan</b><small>Cek apakah kamu sudah naik level</small></span><span class="chev">›</span></button>` : ""}
    `, { root: true, tab: "home" });
    on("[data-lv]", el => { S.level = el.dataset.lv; save(); render(); });
    on("[data-sk]", el => go(el.dataset.sk));
    on("[data-go]", el => go(el.dataset.go));
    on("[data-sod]", () => speak(sod[0]));
  }

  /* ---------- Reading ---------- */
  function vReading() {
    const lv = lvl();
    shell("📖 Reading · " + lv.id, `
      <p class="muted">Baca teks, ketuk <b style="color:var(--read)">kata bergaris</b> untuk melihat artinya, atau ketuk kata lain untuk mendengar pengucapannya.</p>
      ${lv.reading.map((r, i) => `
        <button class="list-btn" data-i="${i}"><span class="ic" style="background:#e3f3f1">📄</span>
          <span><b>${esc(r.title)}</b><small>${r.text.split(/\s+/).length} kata · ${r.questions.length} soal</small></span>
          ${S.done[lv.id + ":reading:" + i] ? `<span class="done-dot">✓</span>` : `<span class="chev">›</span>`}
        </button>`).join("")}
    `);
    on("[data-i]", el => go("passage", { i: +el.dataset.i }));
  }
  function tokenizePassage(text, gloss) {
    const keys = Object.keys(gloss).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = keys.length ? new RegExp("\\b(" + keys.join("|") + ")\\b", "gi") : null;
    const parts = []; let last = 0, m;
    if (re) while ((m = re.exec(text))) { parts.push({ t: text.slice(last, m.index) }); parts.push({ g: m[0] }); last = m.index + m[0].length; }
    parts.push({ t: text.slice(last) });
    return parts.map(p => {
      if (p.g) return `<button class="gl" data-g="${esc(p.g)}">${esc(p.g)}</button>`;
      return p.t.split(/(\s+)/).map(w => /\w/.test(w) ? `<span class="w" data-w="${esc(w.replace(/[^\w'-]/g, ""))}">${esc(w)}</span>` : esc(w)).join("");
    }).join("");
  }
  function sheet(html) {
    const bg = document.createElement("div"); bg.className = "sheet-bg";
    bg.innerHTML = `<div class="sheet">${html}</div>`;
    bg.onclick = e => { if (e.target === bg) bg.remove(); };
    document.body.appendChild(bg);
    return bg;
  }
  function vPassage(p) {
    const lv = lvl(); const r = lv.reading[p.i];
    const key = lv.id + ":reading:" + p.i;
    const ans = {};
    shell(esc(r.title), `
      <div class="card"><span class="tag">Level ${lv.id}</span>
        <div class="passage" style="margin-top:10px">${tokenizePassage(r.text, r.glossary)}</div>
        <div class="btns"><button class="btn soft" data-read>🔊 Bacakan</button><button class="btn ghost" data-stop>⏹ Berhenti</button></div>
      </div>
      <div class="sec-title">Pertanyaan pemahaman</div>
      ${r.questions.map((q, qi) => `
        <div class="card q" data-q="${qi}"><p>${qi + 1}. ${esc(q.q)}</p>
          ${q.o.map((o, oi) => `<button class="opt" data-qi="${qi}" data-oi="${oi}">${esc(o)}</button>`).join("")}
          <div class="fbx"></div>
        </div>`).join("")}
      <div id="sum"></div>
    `);
    on("[data-read]", () => speak(r.text));
    on("[data-stop]", () => synth && synth.cancel());
    on(".gl", el => {
      const k = Object.keys(r.glossary).find(x => x.toLowerCase() === el.dataset.g.toLowerCase());
      const b = sheet(`<div class="serif" style="font-size:28px">${esc(el.dataset.g)}</div>
        <div style="font-size:20px;font-weight:700;color:var(--read);margin:6px 0 14px">${esc(r.glossary[k] || "")}</div>
        <div class="btns"><button class="btn soft" data-say>🔊 Dengarkan</button><button class="btn" data-close>Tutup</button></div>`);
      b.querySelector("[data-say]").onclick = () => speak(el.dataset.g, 0.8);
      b.querySelector("[data-close]").onclick = () => b.remove();
    });
    on(".w", el => speak(el.dataset.w, 0.8));
    on(".opt", el => {
      const qi = +el.dataset.qi, oi = +el.dataset.oi, q = r.questions[qi];
      if (ans[qi] !== undefined) return;
      ans[qi] = oi === q.a;
      const box = $app.querySelector(`[data-q="${qi}"]`);
      box.querySelectorAll(".opt").forEach((b, k) => { if (k === q.a) b.classList.add("right"); else if (k === oi) b.classList.add("wrong"); });
      box.querySelector(".fbx").innerHTML = `<div class="fb ${ans[qi] ? "ok" : "no"}">${ans[qi] ? "✅ Benar!" : "❌ Kurang tepat."} ${esc(q.e)}</div>`;
      if (ans[qi]) addXP(10);
      if (Object.keys(ans).length === r.questions.length) {
        const c = Object.values(ans).filter(Boolean).length;
        mark(key);
        $app.querySelector("#sum").innerHTML = `<div class="card center"><div class="score">${c}/${r.questions.length}</div>
          <p>${c === r.questions.length ? "Sempurna! Pemahamanmu sangat baik." : "Bagus! Baca ulang bagian yang salah, lalu coba lagi."}</p>
          <div class="btns"><button class="btn ghost" data-again>Ulangi</button>${p.i + 1 < lv.reading.length ? `<button class="btn" data-next>Teks berikutnya →</button>` : `<button class="btn" data-home>Selesai</button>`}</div></div>`;
        on("[data-again]", () => go("passage", { i: p.i }, true));
        on("[data-next]", () => go("passage", { i: p.i + 1 }, true));
        on("[data-home]", back);
      }
    });
  }

  /* ---------- Listening ---------- */
  function rateBar() {
    return `<div class="rates">${[[0.7, "Pelan"], [0.9, "Normal"], [1.05, "Cepat"]].map(([r, n]) => `<button data-rate="${r}" class="${Math.abs(S.rate - r) < .01 ? "on" : ""}">${n}</button>`).join("")}</div>`;
  }
  function bindRate() { on("[data-rate]", el => { S.rate = +el.dataset.rate; save(); $app.querySelectorAll("[data-rate]").forEach(b => b.classList.toggle("on", b === el)); }); }
  function vListening(p) {
    const lv = lvl(); const i = p.i || 0; const it = lv.listening[i];
    const key = lv.id + ":listening:" + i;
    const isDict = !it.q;
    let plays = 0;
    shell("🎧 Listening · " + lv.id, `
      <div class="row small muted" style="justify-content:space-between"><span>Soal ${i + 1} dari ${lv.listening.length}</span><span>${isDict ? "Dikte" : "Pemahaman"}</span></div>
      <div class="prog" style="margin:8px 0 14px"><i style="width:${100 * (i) / lv.listening.length}%"></i></div>
      <div class="card center">
        <p style="margin-top:0">${isDict ? "Dengarkan, lalu <b>tulis kalimat</b> yang kamu dengar." : "Dengarkan, lalu <b>jawab pertanyaannya</b>."}</p>
        <button class="big-play" data-play aria-label="Putar">▶</button>
        ${rateBar()}
        <div class="small muted" id="plays">Boleh diputar berulang kali.</div>
      </div>
      <div class="card">
        ${isDict ? `<input type="text" id="dict" placeholder="Ketik yang kamu dengar..." autocomplete="off" autocapitalize="sentences">
          <div class="btns"><button class="btn" data-check>Periksa</button></div>`
        : `<p style="font-weight:700;margin-top:0">${esc(it.q)}</p>${it.o.map((o, oi) => `<button class="opt" data-oi="${oi}">${esc(o)}</button>`).join("")}`}
        <div id="res"></div>
      </div>
    `);
    bindRate();
    on("[data-play]", () => { plays++; speak(it.say); $app.querySelector("#plays").textContent = "Diputar " + plays + "×"; });
    function finish(ok, extra) {
      if (ok) addXP(plays <= 2 ? 15 : 10);
      mark(key);
      $app.querySelector("#res").innerHTML = `${extra || ""}
        <div class="fb info"><b>Transkrip:</b> ${esc(it.say)}</div>
        <div class="btns">${i + 1 < lv.listening.length ? `<button class="btn" data-next>Lanjut →</button>` : `<button class="btn" data-fin>Selesai 🎉</button>`}</div>`;
      on("[data-next]", () => go("listening", { i: i + 1 }, true));
      on("[data-fin]", () => { toast("Latihan listening level " + lv.id + " selesai!"); back(); });
    }
    if (isDict) {
      on("[data-check]", el => {
        const v = $app.querySelector("#dict").value.trim();
        if (!v) { toast("Tulis dulu yang kamu dengar."); return; }
        if (!plays) { toast("Putar audionya dulu ya."); return; }
        el.disabled = true;
        const d = diffHTML(it.say, words(v));
        finish(d.score >= 90, `<div class="fb ${d.score >= 90 ? "ok" : "no"}">${d.score >= 90 ? "✅ Hebat!" : "Hampir!"} Ketepatan ${d.score}%. Kata merah = terlewat/salah.</div><div class="words" style="margin-top:8px">${d.html}</div>`);
      });
    } else {
      let answered = false;
      on(".opt", el => {
        if (answered) return;
        if (!plays) { toast("Putar audionya dulu ya."); return; }
        answered = true;
        const oi = +el.dataset.oi;
        $app.querySelectorAll(".opt").forEach((b, k) => { if (k === it.a) b.classList.add("right"); else if (k === oi) b.classList.add("wrong"); });
        finish(oi === it.a, `<div class="fb ${oi === it.a ? "ok" : "no"}">${oi === it.a ? "✅ Benar!" : "❌ Jawaban yang tepat: " + esc(it.o[it.a])}</div>`);
      });
    }
  }

  /* ---------- Speaking ---------- */
  function vSpeaking(p) {
    const lv = lvl(); const i = p.i || 0; const it = lv.speaking[i];
    const key = lv.id + ":speaking:" + i;
    shell("🎤 Speaking · " + lv.id, `
      <div class="row small muted" style="justify-content:space-between"><span>Kalimat ${i + 1} dari ${lv.speaking.length}</span><span>${SR ? "Mikrofon aktif" : "Mode ketik suara"}</span></div>
      <div class="prog" style="margin:8px 0 14px"><i style="width:${100 * i / lv.speaking.length}%"></i></div>
      <div class="card">
        <div class="serif" style="font-size:24px;line-height:1.3">${esc(it[0])}</div>
        <div class="muted" style="margin-top:6px">${esc(it[1])}</div>
        <div class="fb info" style="margin-top:12px">💡 ${esc(it[2])}</div>
        <div class="btns"><button class="btn soft" data-model>🔊 Contoh</button><button class="btn soft" data-slow>🐢 Pelan</button></div>
      </div>
      <div class="card center">
        ${SR ? `<p style="margin-top:0">Ketuk mikrofon, lalu ucapkan kalimat di atas.</p>
          <button class="mic" data-mic aria-label="Rekam">🎙</button>
          <div class="small muted" id="st">Siap merekam</div>`
        : `<p style="margin-top:0">Browser ini belum mendukung pengenalan suara langsung. Ketuk kotak di bawah, lalu tekan <b>ikon mikrofon di keyboard</b> (Gboard) dan ucapkan kalimatnya dalam bahasa Inggris.</p>
          <input type="text" id="typed" placeholder="Hasil ucapanmu muncul di sini..." autocomplete="off">
          <div class="btns"><button class="btn" data-checktyped>Nilai ucapanku</button></div>`}
        <div id="res" style="text-align:left"></div>
      </div>
    `);
    on("[data-model]", () => speak(it[0], 0.9));
    on("[data-slow]", () => speak(it[0], 0.65));
    let best = 0;
    function grade(alts) {
      let top = null;
      alts.forEach(a => { const d = diffHTML(it[0], words(a)); if (!top || d.score > top.score) top = Object.assign(d, { said: a }); });
      const s = top.score;
      if (s > best) { if (s >= 80 && best < 80) addXP(15); best = s; }
      mark(key);
      const msg = s >= 90 ? "🌟 Luar biasa! Pengucapanmu jelas." : s >= 70 ? "👍 Bagus! Perhatikan kata berwarna merah." : "💪 Coba lagi pelan-pelan. Dengarkan contohnya dulu.";
      $app.querySelector("#res").innerHTML = `
        <div class="center"><div class="score" style="color:${s >= 70 ? "var(--ok)" : "var(--speak)"}">${s}%</div><div>${msg}</div></div>
        <div class="words" style="margin-top:12px">${top.html}</div>
        <div class="small muted" style="margin-top:6px">Terdengar: “${esc(top.said)}”</div>
        <div class="btns">${i + 1 < lv.speaking.length ? `<button class="btn" data-next>Kalimat berikutnya →</button>` : `<button class="btn" data-fin>Selesai 🎉</button>`}</div>`;
      on("[data-next]", () => go("speaking", { i: i + 1 }, true));
      on("[data-fin]", () => { toast("Latihan speaking level " + lv.id + " selesai!"); back(); });
    }
    if (SR) {
      let rec = null;
      on("[data-mic]", el => {
        if (rec) { rec.stop(); return; }
        if (synth) synth.cancel();
        rec = new SR(); rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 4;
        const st = $app.querySelector("#st");
        rec.onstart = () => { el.classList.add("rec"); st.textContent = "Mendengarkan... ketuk lagi untuk berhenti"; };
        rec.onresult = e => { const r = e.results[0]; const alts = []; for (let k = 0; k < r.length; k++) alts.push(r[k].transcript); grade(alts); };
        rec.onerror = e => { st.textContent = e.error === "not-allowed" ? "Izin mikrofon ditolak. Aktifkan di pengaturan browser." : e.error === "no-speech" ? "Suara tidak terdengar. Coba lagi lebih dekat." : e.error === "network" ? "Pengenalan suara butuh internet." : "Gagal merekam (" + e.error + ")."; };
        rec.onend = () => { el.classList.remove("rec"); rec = null; if (st.textContent.startsWith("Mendengarkan")) st.textContent = "Siap merekam"; };
        try { rec.start(); } catch (err) { st.textContent = "Tidak bisa memulai mikrofon."; rec = null; }
      });
    } else {
      on("[data-checktyped]", () => { const v = $app.querySelector("#typed").value.trim(); if (!v) { toast("Ucapkan kalimatnya dulu lewat mikrofon keyboard."); return; } grade([v]); });
    }
  }

  /* ---------- Writing ---------- */
  function vWriting() {
    const lv = lvl(); const w = lv.writing;
    const c = (sk, n) => Array.from({ length: n }, (_, k) => S.done[lv.id + ":writing:" + sk + k] ? 1 : 0).reduce((a, b) => a + b, 0);
    shell("✍️ Writing · " + lv.id, `
      <button class="list-btn" data-m="translate"><span class="ic" style="background:#efeafb">🔁</span><span><b>Terjemahkan</b><small>Indonesia → Inggris · ${c("t", w.translate.length)}/${w.translate.length}</small></span><span class="chev">›</span></button>
      <button class="list-btn" data-m="arrange"><span class="ic" style="background:#efeafb">🧩</span><span><b>Susun Kalimat</b><small>Urutkan kata dengan benar · ${c("a", w.arrange.length)}/${w.arrange.length}</small></span><span class="chev">›</span></button>
      <button class="list-btn" data-m="grammar"><span class="ic" style="background:#efeafb">🔧</span><span><b>Tata Bahasa</b><small>Isi bagian kosong · ${c("g", w.grammar.length)}/${w.grammar.length}</small></span><span class="chev">›</span></button>
      <button class="list-btn" data-m="journal"><span class="ic" style="background:#efeafb">📝</span><span><b>Jurnal Menulis</b><small>Tulis bebas + cek otomatis</small></span>${S.done[lv.id + ":writing:j0"] ? `<span class="done-dot">✓</span>` : `<span class="chev">›</span>`}</button>
    `);
    on("[data-m]", el => go("w_" + el.dataset.m, { i: 0 }));
  }
  function wHeader(i, n, label) {
    return `<div class="row small muted" style="justify-content:space-between"><span>${label} ${i + 1} dari ${n}</span></div><div class="prog" style="margin:8px 0 14px"><i style="width:${100 * i / n}%"></i></div>`;
  }
  function nextBtns(i, n, view) {
    return `<div class="btns">${i + 1 < n ? `<button class="btn" data-next>Lanjut →</button>` : `<button class="btn" data-fin>Selesai 🎉</button>`}</div>`;
  }
  function bindNext(i, view) {
    on("[data-next]", () => go(view, { i: i + 1 }, true));
    on("[data-fin]", () => { toast("Bagian ini selesai. Mantap!"); back(); });
  }
  function vTranslate(p) {
    const lv = lvl(); const arr = lv.writing.translate; const i = p.i; const it = arr[i];
    let tries = 0;
    shell("🔁 Terjemahkan", `${wHeader(i, arr.length, "Kalimat")}
      <div class="card"><div class="small muted">Terjemahkan ke bahasa Inggris:</div>
        <div class="serif" style="font-size:22px;margin:6px 0 14px">${esc(it.id)}</div>
        <textarea id="ans" rows="3" placeholder="Tulis terjemahanmu..." autocapitalize="sentences"></textarea>
        <div class="btns"><button class="btn ghost" data-hint>💡 Petunjuk</button><button class="btn" data-check>Periksa</button></div>
        <div id="res"></div></div>`);
    on("[data-hint]", () => { $app.querySelector("#res").innerHTML = `<div class="fb info">💡 ${esc(it.h)}</div>`; });
    on("[data-check]", el => {
      const v = $app.querySelector("#ans").value.trim(); if (!v) { toast("Tulis jawabanmu dulu."); return; }
      tries++;
      const vw = words(v);
      let best = null;
      it.a.forEach(a => { const s = similarity(words(a), vw); if (!best || s > best.s) best = { a, s }; });
      const res = $app.querySelector("#res");
      if (best.s >= 0.999) {
        if (tries === 1) addXP(15); else addXP(5);
        mark(lv.id + ":writing:t" + i);
        el.disabled = true;
        res.innerHTML = `<div class="fb ok">✅ Tepat sekali!${it.a.length > 1 ? `<br><span class="small">Alternatif lain: ${esc(it.a.filter(x => words(x).join(" ") !== vw.join(" ")).slice(0, 2).join(" / "))}</span>` : ""}</div>${nextBtns(i, arr.length)}`;
        bindNext(i, "w_translate");
      } else if (best.s >= 0.75) {
        const d = diffHTML(best.a, vw), mine = diffHTML(v, words(best.a));
        res.innerHTML = `<div class="fb no">Hampir benar! Kata merah adalah bagian yang berbeda.</div>
          <div class="small muted" style="margin-top:10px">Jawabanmu:</div><div class="words">${mine.html}</div>
          <div class="small muted" style="margin-top:6px">Jawaban yang tepat:</div><div class="words">${d.html}</div>
          <div class="btns"><button class="btn ghost" data-retry>Perbaiki</button><button class="btn" data-accept>Saya paham, lanjut</button></div>`;
        on("[data-retry]", () => { res.innerHTML = ""; $app.querySelector("#ans").focus(); });
        on("[data-accept]", () => { mark(lv.id + ":writing:t" + i); i + 1 < arr.length ? go("w_translate", { i: i + 1 }, true) : back(); });
      } else {
        res.innerHTML = `<div class="fb no">Belum tepat. ${tries < 2 ? "Coba lagi, atau lihat petunjuk." : `Contoh jawaban: <b>${esc(it.a[0])}</b>`}</div>${tries >= 2 ? nextBtns(i, arr.length) : ""}`;
        if (tries >= 2) { mark(lv.id + ":writing:t" + i); bindNext(i, "w_translate"); }
      }
    });
  }
  function vArrange(p) {
    const lv = lvl(); const arr = lv.writing.arrange; const i = p.i; const target = arr[i];
    const tw = target.split(" ");
    let pool = shuffle(tw); let guard = 0;
    while (pool.join(" ") === target && guard++ < 10) pool = shuffle(tw);
    const picked = [];
    shell("🧩 Susun Kalimat", `${wHeader(i, arr.length, "Soal")}
      <div class="card"><div class="small muted">Ketuk kata sesuai urutan yang benar:</div>
        <div class="chips" id="ansz" style="margin:10px 0"></div>
        <div class="chips" id="pool" style="border-style:solid;background:transparent"></div>
        <div class="btns"><button class="btn ghost" data-reset>↺ Ulang</button><button class="btn" data-check>Periksa</button></div>
        <div id="res"></div></div>`);
    function draw() {
      $app.querySelector("#ansz").innerHTML = picked.map((k, j) => `<button class="chip" data-un="${j}">${esc(pool[k])}</button>`).join("") || `<span class="muted small">Jawabanmu muncul di sini</span>`;
      $app.querySelector("#pool").innerHTML = pool.map((w, k) => `<button class="chip ${picked.includes(k) ? "used" : ""}" data-pk="${k}">${esc(w)}</button>`).join("");
      $app.querySelectorAll("[data-pk]").forEach(b => b.onclick = () => { const k = +b.dataset.pk; if (!picked.includes(k)) { picked.push(k); draw(); } });
      $app.querySelectorAll("[data-un]").forEach(b => b.onclick = () => { picked.splice(+b.dataset.un, 1); draw(); });
    }
    draw();
    on("[data-reset]", () => { picked.length = 0; draw(); $app.querySelector("#res").innerHTML = ""; });
    on("[data-check]", () => {
      if (picked.length < pool.length) { toast("Gunakan semua kata dulu."); return; }
      const ans = picked.map(k => pool[k]).join(" ");
      const ok = ans.toLowerCase() === target.toLowerCase();
      const res = $app.querySelector("#res");
      if (ok) {
        addXP(10); mark(lv.id + ":writing:a" + i);
        res.innerHTML = `<div class="fb ok">✅ Benar! <b>${esc(target)}.</b> <button class="btn soft" style="padding:6px 10px;margin-left:6px" data-say>🔊</button></div>${nextBtns(i, arr.length)}`;
        on("[data-say]", () => speak(target)); bindNext(i, "w_arrange");
      } else {
        res.innerHTML = `<div class="fb no">Urutannya belum tepat. Coba ulang ya.</div><div class="btns"><button class="btn ghost" data-show>Lihat jawaban</button></div>`;
        on("[data-show]", () => { mark(lv.id + ":writing:a" + i); res.innerHTML = `<div class="fb info">Jawaban: <b>${esc(target)}.</b></div>${nextBtns(i, arr.length)}`; bindNext(i, "w_arrange"); });
      }
    });
  }
  function vGrammar(p) {
    const lv = lvl(); const arr = lv.writing.grammar; const i = p.i; const it = arr[i];
    shell("🔧 Tata Bahasa", `${wHeader(i, arr.length, "Soal")}
      <div class="card"><div class="small muted">Pilih jawaban yang tepat untuk mengisi bagian kosong:</div>
        <div class="serif" style="font-size:22px;margin:8px 0 14px">${esc(it.q).replace("___", "<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>")}</div>
        ${it.o.map((o, oi) => `<button class="opt" data-oi="${oi}">${esc(o)}</button>`).join("")}
        <div id="res"></div></div>`);
    let done = false;
    on(".opt", el => {
      if (done) return; done = true;
      const oi = +el.dataset.oi; const ok = oi === it.a;
      $app.querySelectorAll(".opt").forEach((b, k) => { if (k === it.a) b.classList.add("right"); else if (k === oi) b.classList.add("wrong"); });
      if (ok) addXP(10);
      mark(lv.id + ":writing:g" + i);
      const full = it.q.replace("___", it.o[it.a]);
      $app.querySelector("#res").innerHTML = `<div class="fb ${ok ? "ok" : "no"}">${ok ? "✅ Benar!" : "❌ Kurang tepat."} ${esc(it.e)}<br><b>${esc(full)}</b></div>${nextBtns(i, arr.length)}`;
      bindNext(i, "w_grammar");
    });
  }

  /* ---------- Pemeriksa tulisan (berbasis aturan) ---------- */
  const RULES = [
    [/\bi am agree\b/i, "“I am agree” → <b>I agree</b>. 'agree' sudah kata kerja, tidak perlu 'am'."],
    [/\bi am (?:very )?like\b/i, "“I am like” → <b>I like</b>."],
    [/\b(?:you|we|they) (?:is|was)\b|\bi is\b/i, "Periksa to be: I <b>am</b>, you/we/they <b>are/were</b>."],
    [/\bpeople is\b/i, "“people is” → <b>people are</b> (people = jamak)."],
    [/\b(?:he|she|it) don't\b/i, "He/she/it → <b>doesn't</b>, bukan don't."],
    [/\binformations\b/i, "“informations” → <b>information</b> (tidak bisa dijamakkan)."],
    [/\badvices\b/i, "“advices” → <b>advice</b> (tidak bisa dijamakkan)."],
    [/\bequipments\b/i, "“equipments” → <b>equipment</b>."],
    [/\bdiscuss about\b/i, "“discuss about” → <b>discuss</b> (tanpa 'about')."],
    [/\bmore (?:better|worse|bigger|easier|faster|cheaper|smaller)\b/i, "Jangan gabung 'more' dengan bentuk -er: cukup <b>better / bigger</b>, dst."],
    [/\bthe most best\b/i, "“the most best” → <b>the best</b>."],
    [/\bexplain me\b/i, "“explain me” → <b>explain to me</b>."],
    [/\bdepend of\b/i, "“depend of” → <b>depend on</b>."],
    [/\bmarried with\b/i, "“married with” → <b>married to</b>."],
    [/\b(?:i|we|they|you) very (?:like|love|enjoy)\b/i, "“very like” → <b>really like</b> / like ... very much."],
    [/\bcan to\b/i, "Setelah can/must/will langsung kata kerja dasar: <b>can go</b>, bukan can to go."],
    [/\bsince \d+ (?:years?|months?|days?|weeks?)\b/i, "Untuk durasi pakai <b>for</b>: for 3 years. 'since' untuk titik waktu: since 2020."],
    [/\bin the other hand\b/i, "“in the other hand” → <b>on the other hand</b>."],
    [/\bmake a homework\b|\bdo a mistake\b/i, "Kolokasi: <b>do homework</b>, <b>make a mistake</b>."],
    [/\bboth of us is\b|\beach of (?:us|them) are\b/i, "Periksa kesesuaian: both … <b>are</b>, each … <b>is</b>."]
  ];
  const AN_EXC = /^(?:uni|use|usa|usu|ute|euro|eu|one|once|ufo)/i;
  const LINKERS = ["however", "although", "because", "therefore", "moreover", "in addition", "for example", "for instance", "on the other hand", "furthermore", "as a result", "in conclusion", "nevertheless", "while", "whereas", "firstly", "finally"];
  function checkText(t) {
    const issues = [];
    const sentences = t.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    if (/\bi\b/.test(t.replace(/\bi\.e\./g, ""))) issues.push("Kata ganti <b>I</b> (saya) selalu huruf besar.");
    if (sentences.some(s => /^[a-z]/.test(s))) issues.push("Awali setiap kalimat dengan <b>huruf besar</b>.");
    if (t.trim() && !/[.!?]["')]?$/.test(t.trim())) issues.push("Akhiri tulisan dengan <b>tanda baca</b> (titik, tanda tanya, atau seru).");
    if (/ {2,}/.test(t)) issues.push("Ada <b>spasi ganda</b>. Cukup satu spasi antar kata.");
    if (/\s[,.]/.test(t)) issues.push("Jangan beri spasi <b>sebelum</b> koma atau titik.");
    RULES.forEach(([re, msg]) => { if (re.test(t)) issues.push(msg); });
    // a / an
    (t.match(/\ba [aeiou]\w*/gi) || []).forEach(m => { const w = m.split(" ")[1]; if (!AN_EXC.test(w)) issues.push(`“${esc(m)}” → <b>an ${esc(w)}</b> (sebelum bunyi vokal).`); });
    (t.match(/\ban [bcdfgjklmnpqrstvwxyz]\w*/gi) || []).forEach(m => { const w = m.split(" ")[1]; if (!/^h(?:our|onest|onor|onour|eir)/i.test(w) && !/^[A-Z]{2,}/.test(w)) issues.push(`“${esc(m)}” → <b>a ${esc(w)}</b> (sebelum bunyi konsonan).`); });
    // he/she/it + verb dasar
    const toks = t.toLowerCase().match(/[a-z']+/g) || [];
    const AUX = new Set(["does", "did", "can", "could", "will", "would", "should", "shall", "may", "might", "must", "let", "make", "help", "to", "not"]);
    const BASE = new Set(["have", "go", "want", "like", "make", "eat", "study", "work", "live", "need", "play", "come", "say", "know", "think", "watch", "read", "write", "love", "teach", "drink", "get", "take", "do"]);
    for (let k = 0; k + 1 < toks.length; k++) {
      if (["he", "she", "it"].includes(toks[k]) && BASE.has(toks[k + 1]) && !(k > 0 && AUX.has(toks[k - 1]))) { issues.push(`“${toks[k]} ${toks[k + 1]}” → kata kerja untuk he/she/it biasanya diberi <b>-s/-es</b> (${toks[k]} ${({ have: "has", do: "does", go: "goes", study: "studies", watch: "watches", teach: "teaches" })[toks[k + 1]] || toks[k + 1] + "s"}), kecuali dalam bentuk lampau/pertanyaan.`); break; }
    }
    const wc = toks.length;
    const avg = sentences.length ? Math.round(wc / sentences.length) : 0;
    const used = LINKERS.filter(x => new RegExp("\\b" + x + "\\b", "i").test(t));
    const uniq = new Set(toks).size;
    return { issues: [...new Set(issues)], wc, sc: sentences.length, avg, used, variety: wc ? Math.round(100 * uniq / wc) : 0 };
  }
  function vJournal() {
    const lv = lvl(); const j = lv.journal;
    const draft = S.journal[lv.id] || "";
    shell("📝 Jurnal Menulis", `
      <div class="card"><span class="tag">Level ${lv.id} · min. ${j.min} kata</span>
        <p style="font-weight:700">${esc(j.prompt)}</p>
        <textarea id="jt" rows="9" placeholder="Tulis dalam bahasa Inggris...">${esc(draft)}</textarea>
        <div class="small muted" id="wc" style="margin-top:6px"></div>
        <div class="btns"><button class="btn" data-check>Cek tulisanku</button><button class="btn soft" data-say>🔊 Dengarkan</button></div>
      </div>
      <div id="res"></div>`);
    const ta = $app.querySelector("#jt");
    const upd = () => { const n = (ta.value.match(/[A-Za-z']+/g) || []).length; $app.querySelector("#wc").textContent = n + " / " + j.min + " kata"; S.journal[lv.id] = ta.value; save(); };
    ta.addEventListener("input", upd); upd();
    on("[data-say]", () => ta.value.trim() && speak(ta.value));
    on("[data-check]", () => {
      const t = ta.value.trim(); if (!t) { toast("Tulis dulu jurnalmu."); return; }
      const r = checkText(t);
      const enough = r.wc >= j.min;
      if (enough && !S.done[lv.id + ":writing:j0"]) { addXP(30); mark(lv.id + ":writing:j0"); }
      const tips = [];
      if (!enough) tips.push(`Tulisanmu ${r.wc} kata. Tambahkan detail, contoh, atau alasan sampai minimal ${j.min} kata.`);
      if (r.avg > 28) tips.push("Rata-rata kalimat cukup panjang (" + r.avg + " kata). Pecah sebagian kalimat agar lebih jelas.");
      if (r.sc >= 3 && r.avg < 7 && lv.id !== "A1") tips.push("Kalimatmu pendek-pendek. Gabungkan dengan <b>and, but, because, although</b>.");
      if (lv.id >= "B1" && r.used.length < 2) tips.push("Gunakan lebih banyak kata penghubung, misalnya <b>however, moreover, for example, as a result</b>.");
      if (r.variety < 45 && r.wc > 40) tips.push("Banyak kata diulang. Coba variasikan dengan sinonim.");
      const prompt = `Tolong periksa tulisan bahasa Inggris saya (level ${lv.id}). Jelaskan kesalahan grammar, pilihan kata, dan struktur dalam bahasa Indonesia, lalu beri versi perbaikannya.\n\nTopik: ${j.prompt}\n\nTulisan saya:\n${t}`;
      $app.querySelector("#res").innerHTML = `
        <div class="card">
          <div class="kv"><span>Jumlah kata</span><b>${r.wc}${enough ? " ✅" : ""}</b></div>
          <div class="kv"><span>Jumlah kalimat</span><b>${r.sc}</b></div>
          <div class="kv"><span>Rata-rata kata/kalimat</span><b>${r.avg}</b></div>
          <div class="kv"><span>Kata penghubung dipakai</span><b>${r.used.length ? esc(r.used.join(", ")) : "—"}</b></div>
        </div>
        <div class="sec-title">Temuan otomatis (${r.issues.length})</div>
        ${r.issues.length ? r.issues.map(x => `<div class="issue">${x}</div>`).join("") : `<div class="fb ok">✅ Tidak ada kesalahan umum yang terdeteksi.</div>`}
        ${tips.length ? `<div class="sec-title">Saran pengembangan</div>${tips.map(x => `<div class="fb info" style="margin-bottom:8px">${x}</div>`).join("")}` : ""}
        <div class="card" style="margin-top:14px"><b>Mau koreksi lebih dalam?</b><p class="small muted" style="margin:4px 0 0">Pemeriksa ini mendeteksi kesalahan umum. Untuk koreksi lengkap, salin tulisan beserta perintahnya lalu tempel ke Claude.</p>
          <div class="btns"><button class="btn soft" data-copy>📋 Salin untuk dicek AI</button></div></div>`;
      on("[data-copy]", () => {
        (navigator.clipboard ? navigator.clipboard.writeText(prompt) : Promise.reject()).then(() => toast("Tersalin! Tempel di aplikasi Claude."), () => {
          const b = sheet(`<b>Salin teks ini:</b><textarea rows="8" style="margin-top:8px">${esc(prompt)}</textarea><div class="btns"><button class="btn" data-close>Tutup</button></div>`);
          b.querySelector("[data-close]").onclick = () => b.remove();
        });
      });
    });
  }

  /* ---------- Kosakata (Leitner) ---------- */
  const INTERVAL = [0, 1, 3, 7, 16, 35];
  function cardState(lvId, k) { return S.vocab[lvId + ":" + k] || { box: 0, due: 0 }; }
  function dueCards(lv) { const now = Date.now(); return lv.vocab.map((_, k) => k).filter(k => cardState(lv.id, k).due <= now); }
  function vVocab() {
    const lv = lvl();
    const due = dueCards(lv);
    const mastered = lv.vocab.filter((_, k) => cardState(lv.id, k).box >= 3).length;
    shell("🃏 Kosakata · " + lv.id, `
      <div class="levels">${L.map(x => `<button class="lv ${x.id === S.level ? "on" : ""}" data-lv="${x.id}"><b>${x.id}</b><span>${x.name}</span></button>`).join("")}</div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><b>Dikuasai</b><span>${mastered}/${lv.vocab.length}</span></div>
        <div class="prog" style="margin-top:8px"><i style="width:${100 * mastered / lv.vocab.length}%;background:var(--vocab)"></i></div>
        <p class="small muted">Kartu yang kamu jawab “Hafal” akan muncul lagi beberapa hari kemudian (1, 3, 7, 16 hari) agar masuk ke ingatan jangka panjang.</p>
        <button class="btn block" data-study ${due.length ? "" : "disabled"}>${due.length ? `Mulai ulang ${due.length} kartu` : "Semua kartu sudah diulang hari ini 🎉"}</button>
      </div>
      <div class="sec-title">Daftar kata</div>
      ${lv.vocab.map((v, k) => `<div class="card" style="padding:12px 14px;margin-bottom:8px"><div class="row"><div style="flex:1"><b>${esc(v[0])}</b> <span class="muted">— ${esc(v[1])}</span><div class="small muted"><i>${esc(v[2])}</i></div></div><button class="btn soft" style="padding:8px 12px" data-say="${k}">🔊</button></div></div>`).join("")}
    `, { tab: "vocab", root: true });
    on("[data-lv]", el => { S.level = el.dataset.lv; save(); render(); });
    on("[data-say]", el => speak(lv.vocab[+el.dataset.say][0], 0.85));
    on("[data-study]", () => go("study", { q: shuffle(due) }));
  }
  function vStudy(p) {
    const lv = lvl(); const q = p.q; const pos = p.pos || 0;
    if (pos >= q.length) {
      shell("🃏 Selesai", `<div class="card center"><div style="font-size:54px">🎉</div><h2 class="serif">Sesi selesai!</h2><p>Kamu sudah mengulang ${q.length} kartu.</p><button class="btn block" data-b>Kembali</button></div>`);
      on("[data-b]", back); return;
    }
    const k = q[pos]; const v = lv.vocab[k];
    shell("🃏 Kartu " + (pos + 1) + "/" + q.length, `
      <div class="prog" style="margin-bottom:14px"><i style="width:${100 * pos / q.length}%;background:var(--vocab)"></i></div>
      <div class="card flash" data-flip>
        <div class="word serif">${esc(v[0])}</div>
        <div id="back" style="display:none"><div class="mean">${esc(v[1])}</div><div class="ex">${esc(v[2])}</div></div>
        <div class="small muted" id="hint" style="margin-top:16px">Ketuk kartu untuk melihat arti</div>
      </div>
      <div class="btns"><button class="btn soft" data-say>🔊 Dengarkan</button></div>
      <div class="btns" id="judge" style="display:none"><button class="btn ghost" data-r="0">😕 Belum hafal</button><button class="btn" data-r="1" style="background:var(--ok)">😄 Hafal</button></div>
    `);
    speak(v[0], 0.85);
    on("[data-say]", () => speak(v[0] + ". " + v[2], 0.85));
    on("[data-flip]", () => { $app.querySelector("#back").style.display = "block"; $app.querySelector("#hint").style.display = "none"; $app.querySelector("#judge").style.display = "flex"; });
    on("[data-r]", el => {
      const st = cardState(lv.id, k);
      if (el.dataset.r === "1") { st.box = Math.min(5, st.box + 1); st.due = Date.now() + INTERVAL[st.box] * 864e5 - 36e5; addXP(5); }
      else { st.box = 0; st.due = 0; }
      S.vocab[lv.id + ":" + k] = st; save();
      const nq = el.dataset.r === "1" ? q : q.concat([k]);
      go("study", { q: nq, pos: pos + 1 }, true);
    });
  }

  /* ---------- Tes penempatan ---------- */
  function vPlacement(p) {
    const items = L.flatMap(x => x.writing.grammar.slice(0, 2).map(g => Object.assign({ lv: x.id }, g)));
    const i = p.i || 0; const score = p.score || 0;
    if (i >= items.length) {
      const rec = score <= 3 ? "A1" : score <= 5 ? "A2" : score <= 7 ? "B1" : score <= 8 ? "B2" : "C1";
      const lv = L.find(x => x.id === rec);
      shell("🎯 Hasil Tes", `<div class="card center"><div class="small muted">Skor kamu</div><div class="score">${score}/${items.length}</div>
        <p>Level yang disarankan:</p><h2 class="serif" style="font-size:34px">${rec} · ${lv.name}</h2><p class="muted">${esc(lv.desc)}</p>
        <button class="btn block" data-set>Mulai belajar di level ${rec}</button></div>
        <p class="small muted">Tes ini hanya perkiraan dari tata bahasa. Kamu bebas pindah level kapan saja di Beranda.</p>`);
      on("[data-set]", () => { S.level = rec; S.placed = true; save(); stack = []; go("home"); });
      return;
    }
    const it = items[i];
    shell("🎯 Tes Penempatan", `${wHeader(i, items.length, "Soal")}
      <div class="card"><div class="serif" style="font-size:22px;margin-bottom:14px">${esc(it.q).replace("___", "<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>")}</div>
      ${it.o.map((o, oi) => `<button class="opt" data-oi="${oi}">${esc(o)}</button>`).join("")}
      <button class="btn ghost block" style="margin-top:6px" data-skip>Saya tidak tahu</button></div>`);
    on(".opt", el => go("placement", { i: i + 1, score: score + (+el.dataset.oi === it.a ? 1 : 0) }, true));
    on("[data-skip]", () => go("placement", { i: i + 1, score }, true));
  }

  /* ---------- Progres ---------- */
  function vProgress() {
    const totalWords = L.reduce((a, x) => a + x.vocab.length, 0);
    const mastered = Object.values(S.vocab).filter(v => v.box >= 3).length;
    shell("📈 Progres", `
      <div class="card hero"><div class="k">Ringkasan</div><h2 class="serif">⭐ ${S.xp} XP</h2>
        <div class="stats"><div class="stat"><b>🔥 ${S.streak}</b>hari beruntun</div><div class="stat"><b>🃏 ${mastered}/${totalWords}</b>kata dikuasai</div></div></div>
      ${L.map(lv => `<div class="card"><div class="row" style="justify-content:space-between"><b>${lv.id} · ${lv.name}</b>${lv.id === S.level ? `<span class="tag">Aktif</span>` : ""}</div>
        ${Object.entries(SKILLS).map(([k, s]) => `<div style="margin-top:10px"><div class="row small" style="justify-content:space-between"><span>${s.ic} ${s.name}</span><span>${pct(lv, k)}%</span></div><div class="prog" style="margin-top:4px"><i style="width:${pct(lv, k)}%;background:${s.color}"></i></div></div>`).join("")}
      </div>`).join("")}
      <button class="btn ghost block" data-reset>Hapus semua progres</button>
    `, { tab: "progress", root: true });
    on("[data-reset]", () => {
      const b = sheet(`<b>Hapus semua progres?</b><p class="muted">XP, streak, kosakata, dan jurnal akan hilang dari HP ini.</p><div class="btns"><button class="btn ghost" data-no>Batal</button><button class="btn" style="background:var(--bad)" data-yes>Hapus</button></div>`);
      b.querySelector("[data-no]").onclick = () => b.remove();
      b.querySelector("[data-yes]").onclick = () => { S = Object.assign({}, defState); save(); b.remove(); render(); };
    });
  }

  /* ---------- Bantuan ---------- */
  function vHelp() {
    shell("💡 Bantuan", `
      <div class="card"><h3>Cara belajar yang disarankan</h3>
        <ol class="steps">
          <li>Kerjakan <b>Tes Penempatan</b> untuk tahu level awal.</li>
          <li>Setiap hari: ulang <b>Kartu Kosakata</b> (5 menit), lalu pilih 1–2 skill.</li>
          <li>Selesaikan keempat skill di satu level sebelum naik ke level berikutnya.</li>
          <li>Tulis <b>Jurnal</b> seminggu sekali, lalu salin ke Claude untuk koreksi mendalam.</li>
        </ol></div>
      <div class="card"><h3>Pasang di layar utama Android</h3>
        <ol class="steps">
          <li>Buka aplikasi ini di <b>Google Chrome</b>.</li>
          <li>Ketuk menu <b>⋮</b> di kanan atas.</li>
          <li>Pilih <b>“Instal aplikasi”</b> atau <b>“Tambahkan ke layar utama”</b>.</li>
          <li>Ikon Kawan English muncul di HP dan bisa dibuka tanpa internet.</li>
        </ol>
        <p class="small muted">Catatan: latihan Speaking (pengenalan suara) butuh koneksi internet. Fitur lain bisa dipakai offline.</p>
        ${deferredPrompt ? `<button class="btn block" data-install>📲 Pasang sekarang</button>` : ""}</div>
      <div class="card"><h3>Tentang suara</h3>
        <p class="small">Suara bahasa Inggris memakai mesin suara HP. Bila suara terdengar aneh, buka <b>Setelan → Bahasa & input → Output text-to-speech</b> dan pastikan <b>Speech Services by Google</b> dengan bahasa <b>English (US)</b> terpasang.</p></div>
      <p class="small muted center">Kawan English · progres tersimpan di HP ini</p>
    `, { tab: "help", root: true });
    on("[data-install]", async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; render(); });
  }

  /* ---------- Render ---------- */
  const VIEWS = { home: vHome, reading: vReading, passage: vPassage, listening: vListening, speaking: vSpeaking, writing: vWriting, w_translate: vTranslate, w_arrange: vArrange, w_grammar: vGrammar, w_journal: vJournal, vocab: vVocab, study: vStudy, placement: vPlacement, progress: vProgress, help: vHelp };
  function render() { const c = cur(); (VIEWS[c.view] || vHome)(c.params || {}); }

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; });

  try { history.replaceState({ d: 1 }, ""); } catch (e) { }
  stack = [{ view: "home", params: {} }];
  render();

  if ("serviceWorker" in navigator && location.protocol === "https:" || location.hostname === "localhost") {
    try { navigator.serviceWorker && navigator.serviceWorker.register("sw.js").catch(() => { }); } catch (e) { }
  }
})();
