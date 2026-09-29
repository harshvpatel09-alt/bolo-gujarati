/* Bolo — course index and session builders (lessons, review, mistakes, script, home). */

const Course = (() => {
  const lessons = [], byId = {}, items = {}, units = [];
  const mform = (v) => (v && typeof v === 'object' ? v.m : v);

  function addItem(kind, x, ls) {
    const id = kind + ':' + GU.norm(mform(x.guG || x.gu));
    if (!items[id]) items[id] = Object.assign({}, x, { id, kind, lesson: ls ? ls.id : null, level: ls ? ls.level : 0 });
    x.id = id;
    return items[id];
  }
  COURSE.forEach((lv) => lv.units.forEach((u) => {
    u.level = lv.n; units.push(u);
    u.lessons.forEach((ls) => {
      ls.level = lv.n; ls.unit = u.id; ls.idx = lessons.length;
      lessons.push(ls); byId[ls.id] = ls;
      ls.words.forEach((w) => addItem('w', w, ls));
      ls.sents.forEach((x) => addItem('s', x, ls));
    });
  }));
  HOME.forEach((h) => { h.item = addItem('h', { gu: h.n[0], tr: h.n[1], en: h.en, note: h.note, home: h.id }, null); h.item.level = 5; });

  const gu = (it) => R(it.guG || it.gu);
  const tr = (it) => R(it.tr);
  const status = (ls) => {
    const rec = Store.s.lessons[ls.id];
    if (rec && rec.done) return 'done';
    const prev = lessons[ls.idx - 1];
    if (!prev || (Store.s.lessons[prev.id] || {}).done) return 'open';
    return 'locked';
  };
  const current = () => lessons.find((l) => status(l) !== 'done') || lessons[lessons.length - 1];
  const levelOf = (n) => COURSE.find((l) => l.n === n);
  const levelProgress = (n) => { const ls = lessons.filter((l) => l.level === n); return ls.filter((l) => status(l) === 'done').length / ls.length; };
  const unitProgress = (u) => u.lessons.filter((l) => status(l) === 'done').length / u.lessons.length;

  /* Every Gujarati string the app can play, in both gender forms (used to pre-make audio). */
  function audioTexts() {
    const texts = new Set();
    const add = (v) => { if (!v) return; if (typeof v === 'object') { add(v.m); add(v.f); } else texts.add(String(v).replace(/\|/g, '')); };
    const addWithTokens = (v) => { add(v); [].concat(typeof v === 'object' && v ? [v.m, v.f] : [v]).forEach((x) => GU.tokens(x).forEach(add)); };
    Object.values(items).forEach((i) => addWithTokens(i.guG || i.gu));
    COURSE.forEach((l) => l.units.forEach((u) => u.lessons.forEach((ls) => {
      if (ls.grammar) {
        (ls.grammar.examples || []).forEach((e) => add(e[0]));
        (ls.grammar.drills || []).forEach((d) => { (d.o || []).forEach(add); if (d.t === 'fill') add(d.gu.replace('___', d.a)); });
      }
      if (ls.talk) { add(ls.talk.gu); ls.talk.o.forEach((o) => addWithTokens(o[0])); }
      if (ls.read) ls.read.lines.forEach((x) => add(x[0]));
    })));
    HOME.forEach((h) => ['t', 'n', 'c'].forEach((k) => add(h[k][0])));
    SCENARIOS.forEach((sc) => sc.turns.forEach((t) => { if (t.npc) add(t.npc[0]); if (t.o) t.o.forEach((o) => add(o[0])); }));
    SCRIPT.forEach((u) => u.letters.forEach((x) => add(x[2])));
    PLACEMENT.forEach((p) => { add(p.audio); if (/[\u0A80-\u0AFF]/.test(p.prompt || '')) add(p.prompt); p.o.forEach((o) => { if (/[\u0A80-\u0AFF]/.test(o)) add(o); }); });
    add('કેમ છો?'); add('નમસ્તે, તમે કેમ છો?'); add('તમે કેમ છો?');
    return [...texts].filter((t) => /[\u0A80-\u0AFF]/.test(t));
  }

  return { lessons, byId, items, units, gu, tr, status, current, levelOf, levelProgress, unitProgress, audioTexts };
})();

const Engine = (() => {
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickN = (a, n) => shuffle(a).slice(0, n);
  const uniq = (a) => [...new Set(a)];
  const allItems = () => Object.values(Course.items);
  const pool = (kind, level) => allItems().filter((i) => i.kind === kind && Math.abs(i.level - level) <= 1);

  function distractEn(item, n = 3) {
    const cands = uniq(pool(item.kind === 'h' ? 's' : item.kind, item.level || 1).filter((i) => i.id !== item.id).map((i) => i.en).filter((e) => e !== item.en));
    return pickN(cands, n);
  }
  function distractGu(item, n = 3) {
    const g = Course.gu(item);
    const cands = uniq(pool(item.kind === 'h' ? 's' : item.kind, item.level || 1).filter((i) => i.id !== item.id).map((i) => Course.gu(i)).filter((x) => GU.norm(x) !== GU.norm(g)));
    return pickN(cands, n);
  }
  function bankFor(item, extra = 3) {
    const toks = GU.tokens(Course.gu(item));
    const others = uniq(pool('s', item.level || 1).filter((i) => i.id !== item.id).flatMap((i) => GU.tokens(Course.gu(i)))).filter((t) => !toks.includes(t));
    return shuffle([...toks, ...pickN(others, Math.min(extra, Math.max(2, 6 - toks.length)))]);
  }

  /* Exercise constructors */
  const X = {
    intro: (item) => ({ t: 'intro', item, skill: null }),
    gu2en: (item, noTr) => ({ t: 'mcq', mode: 'gu2en', item, noTr, opts: shuffle([item.en, ...distractEn(item)]), answer: item.en, skill: noTr ? 'reading' : 'vocab' }),
    en2gu: (item) => ({ t: 'mcq', mode: 'en2gu', item, opts: shuffle([Course.gu(item), ...distractGu(item)]), answer: Course.gu(item), skill: 'reading' }),
    listenPick: (item) => ({ t: 'listen', mode: 'pick', item, opts: shuffle([item.en, ...distractEn(item)]), answer: item.en, skill: 'listening' }),
    listenBuild: (item) => ({ t: 'listen', mode: 'build', item, bank: bankFor(item, 2), skill: 'listening' }),
    build: (item) => ({ t: 'build', item, bank: bankFor(item), skill: 'grammar' }),
    speak: (item, from = 'en') => ({ t: 'speak', item, from, skill: 'speaking' }),
    type: (item) => ({ t: 'type', item, skill: 'writing' }),
    match: (list) => ({ t: 'match', pairs: list.slice(0, 5), skill: 'vocab' }),
    fill(item, focusGu) {
      const toks = GU.tokens(Course.gu(item));
      if (toks.length < 2) return null;
      let idx = toks.findIndex((t) => focusGu && focusGu.some((f) => GU.norm(f) === t));
      if (idx < 0) idx = toks.map((t, i) => [t, i]).filter(([t]) => t.length > 1).sort((a, b) => b[0].length - a[0].length)[0][1];
      const ans = toks[idx];
      const others = uniq(pool('s', item.level).flatMap((i) => GU.tokens(Course.gu(i)))).filter((t) => t !== ans && !toks.includes(t));
      const near = others.filter((t) => t.slice(0, 1) === ans.slice(0, 1));
      const opts = shuffle([ans, ...pickN(near.length >= 2 ? near : others, 2)]);
      return { t: 'fill', item, toks, idx, answer: ans, opts, skill: 'grammar' };
    },
  };

  /* Pick an exercise that trains a given skill on an item. */
  function forSkill(skill, item) {
    const isS = item.kind !== 'w';
    switch (skill) {
      case 'speaking': return X.speak(item, Math.random() < 0.5 ? 'en' : 'gu');
      case 'listening': return isS && Math.random() < 0.5 ? X.listenBuild(item) : X.listenPick(item);
      case 'reading': return X.gu2en(item, true);
      case 'writing': return isS && GU.tokens(Course.gu(item)).length > 4 ? X.build(item) : X.type(item);
      case 'grammar': return isS ? X.build(item) : X.en2gu(item);
      default: return Math.random() < 0.5 ? X.gu2en(item) : X.en2gu(item);
    }
  }

  function dueItems(n, exclude = new Set()) {
    const now = Date.now();
    const recs = Object.entries(Store.s.srs).filter(([id]) => Course.items[id] && !exclude.has(id));
    const recentMiss = new Set(Store.s.mistakes.filter((m) => !m.fixed).slice(0, 40).map((m) => m.item));
    const score = ([id, r]) => {
      const overdue = Math.max(0, (now - r.d) / Store.DAY);
      return (r.d <= now ? 2 : 0) + Math.min(overdue, 7) * 0.4 + r.l * 1.2 + (r.ok === false ? 3 : 0) + (recentMiss.has(id) ? 2 : 0) - Math.min(r.i, 30) * 0.05 + Math.random() * 0.4;
    };
    return recs.map((e) => [e[0], score(e)]).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => Course.items[id]);
  }
  const dueCount = () => Object.values(Store.s.srs).filter((r) => r.d <= Date.now()).length;

  /* ── Lesson ── */
  function buildLesson(ls) {
    const steps = [];
    const words = ls.words.map((w) => Course.items[w.id]);
    const sents = ls.sents.map((x) => Course.items[x.id]);
    const known = (it) => ['familiar', 'mastered'].includes(Store.itemState(it.id));
    const fresh = words.filter((w) => !known(w));
    const tuned = [];

    // 1. SEE → UNDERSTAND: new words, each followed quickly by a check
    fresh.forEach((w, i) => {
      steps.push(X.intro(w));
      if (i % 2 === 1) steps.push(X.gu2en(fresh[i - 1]), X.speak(w, 'gu'));
    });
    if (fresh.length % 2 === 1) steps.push(X.en2gu(fresh[fresh.length - 1]));
    if (words.length >= 4) steps.push(X.match(shuffle(words)));
    if (fresh.length < words.length) tuned.push(`${words.length - fresh.length} word${words.length - fresh.length > 1 ? 's' : ''} you already know — skipped the intro`);

    // 2. Grammar: explain → recognize → use
    if (ls.grammar) {
      steps.push({ t: 'grammar', g: ls.grammar, skill: null });
      (ls.grammar.drills || []).forEach((d) => steps.push({ t: d.t === 'fill' ? 'drill-fill' : 'drill-pick', d, skill: 'grammar', item: sents[0] }));
    }

    // 3. PRACTICE → LISTEN → SPEAK with the lesson's sentences
    const [s0, s1, s2, s3, s4] = sents;
    if (s0) steps.push(X.listenPick(s0));
    if (s1) steps.push(X.build(s1));
    if (s0) steps.push(X.speak(s0, 'en'));
    const f = s2 && X.fill(s2, ls.words.map((w) => R(w.guG || w.gu)));
    if (f) steps.push(f);
    if (s3) steps.push(X.listenBuild(s3));
    if (s4) steps.push(X.gu2en(s4, true));
    const shortOne = sents.find((x) => GU.tokens(Course.gu(x)).length <= 3) || words[0];
    steps.push(X.type(shortOne));

    // 4. READ + USE IN CONVERSATION
    if (ls.read) steps.push({ t: 'read', read: ls.read, skill: 'reading' });
    if (ls.talk) steps.push({ t: 'talk', talk: ls.talk, skill: 'grammar' });

    // 5. Adaptive: extra practice in the learner's weakest skill
    const weak = (ls.focus && ls.focus[0]) || Store.weakest()[0];
    const sk = Store.skill(weak);
    if (Store.s.skills[weak] && sk.a >= 6) {
      pickN(sents, 2).forEach((it) => steps.push(forSkill(weak, it)));
      tuned.push(`+2 ${weak} exercises (your weakest skill right now)`);
    }

    // 6. REVIEW older material that's due
    const due = dueItems(3, new Set([...words, ...sents].map((i) => i.id))).filter((i) => i.lesson !== ls.id);
    due.forEach((it) => steps.push(forSkill(Store.weakest(['speaking', 'listening', 'reading', 'vocab'])[Math.random() < 0.5 ? 0 : 1], it)));
    if (due.length) tuned.push(`${due.length} review item${due.length > 1 ? 's' : ''} from earlier lessons`);

    // 7. Always end by speaking a full sentence
    const last = sents[sents.length - 1] || words[0];
    steps.push(X.speak(last, 'en'));

    // Keep lessons in the 5–15 minute window: trim lower-priority practice first.
    let out = steps.filter(Boolean);
    const MAX = 22;
    const trimOrder = [(s) => s.t === 'mcq' && s.noTr && s.item === s4, (s) => s.t === 'listen' && s.mode === 'build' && s.item === s3, (s) => s.t === 'type', (s) => s.t === 'match' && fresh.length < 3, (s) => s.t === 'mcq' && s.mode === 'en2gu'];
    for (const f of trimOrder) { if (out.length <= MAX) break; const i = out.findIndex(f); if (i >= 0) out.splice(i, 1); }
    while (out.length > MAX) { const i = out.findIndex((s, j) => j > 0 && s.item && due.includes(s.item)); if (i < 0) break; out.splice(i, 1); }
    return { steps: out, tuned };
  }

  /* ── Smart review ── */
  function buildReview(focus) {
    const items = dueItems(12);
    if (!items.length) return { steps: [], tuned: [] };
    const weak = Store.weakest(['speaking', 'listening', 'reading', 'writing', 'vocab', 'grammar']);
    // Weighted pick: weaker skills (and ones with little data) come up more often, but every skill appears.
    const weight = (k) => { const sk = Store.skill(k); return 1 + 2.2 * (1 - sk.ema) + (sk.a < 8 ? 0.6 : 0) + (k === 'speaking' ? 0.4 : 0); };
    let last = null;
    const steps = items.map((it) => {
      if (focus) return forSkill(focus, it);
      const ks = (it.kind === 'w' ? ['vocab', 'reading', 'listening', 'speaking', 'writing'] : ['grammar', 'listening', 'speaking', 'reading', 'writing']).filter((k) => k !== last);
      const ws = ks.map(weight), tot = ws.reduce((a, b) => a + b, 0);
      let r = Math.random() * tot, k = ks[0];
      for (let j = 0; j < ks.length; j++) { r -= ws[j]; if (r <= 0) { k = ks[j]; break; } }
      last = k;
      return forSkill(k, it);
    });
    const tuned = focus ? [`Focused on ${focus}`] : [`Weighted toward ${weak[0]} and ${weak[1]} — your two weakest skills`];
    return { steps, tuned };
  }
  function buildSkill(skill) {
    const seen = Object.keys(Store.s.srs).map((id) => Course.items[id]).filter(Boolean);
    const base = seen.length >= 6 ? seen : Course.lessons.slice(0, Math.max(2, Course.current().idx + 1)).flatMap((l) => [...l.words, ...l.sents].map((x) => Course.items[x.id]));
    const cands = skill === 'listening' || skill === 'speaking' ? base.filter((i) => i.kind !== 'w' || Math.random() < 0.3) : base;
    return { steps: pickN(cands.length ? cands : base, 10).map((it) => forSkill(skill, it)), tuned: [`${skill[0].toUpperCase() + skill.slice(1)} practice from words you’ve met`] };
  }
  function buildMistakes() {
    const open = Store.s.mistakes.filter((m) => !m.fixed && Course.items[m.item]);
    const ids = uniq(open.map((m) => m.item)).slice(0, 10);
    const steps = ids.map((id) => {
      const m = open.find((x) => x.item === id);
      const it = Course.items[id];
      return forSkill(m.skill || 'grammar', it);
    });
    // Mistakes without a vocabulary item (conversation replies, grammar choices): redo as a choice.
    const loose = Store.s.mistakes.filter((m) => !m.fixed && !Course.items[m.item] && m.expected && m.given && GU.norm(m.given) !== GU.norm(m.expected));
    const seen = new Set();
    loose.filter((m) => !seen.has(m.expected) && seen.add(m.expected)).slice(0, Math.max(2, 12 - steps.length)).forEach((m) => {
      const a = Math.random() < 0.5 ? 0 : 1;
      const o = a === 0 ? [m.expected, m.given] : [m.given, m.expected];
      steps.push({ t: 'drill-pick', d: { q: m.prompt ? `${m.prompt} — which is right?` : 'Which is right?', o, a, why: m.why || '', tag: m.tag }, skill: m.skill || 'grammar', mistakeRef: m });
    });
    return { steps: shuffle(steps), tuned: ['Every item here is one you got wrong before'] };
  }
  function buildUnitTest(unit) {
    const its = unit.lessons.flatMap((l) => [...l.words, ...l.sents].map((x) => Course.items[x.id]));
    const kinds = ['vocab', 'reading', 'listening', 'grammar', 'speaking'];
    return { steps: pickN(its, 10).map((it, i) => forSkill(kinds[i % kinds.length], it)), tuned: ['Score 80% or more to skip this unit'] };
  }
  function buildHome(list) {
    const steps = [];
    list.forEach((h) => {
      steps.push({ t: 'register', h, skill: 'grammar' });
      steps.push(X.speak(h.item, 'en'));
    });
    return { steps, tuned: [] };
  }
  function buildScript(unit) {
    const L = unit.letters;
    const steps = [];
    const seg = (w) => (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter('gu', { granularity: 'grapheme' }).segment(w)].map((x) => x.segment) : [...w]);
    L.forEach((l, i) => {
      steps.push({ t: 'letter', l, unit, skill: null });
      if (i % 2 === 1 || i === L.length - 1) {
        const target = L[i];
        steps.push({ t: 'glyph', mode: 'sound2glyph', l: target, opts: shuffle([target[0], ...pickN(L.filter((x) => x !== target).map((x) => x[0]), Math.min(3, L.length - 1))]), answer: target[0], skill: 'reading' });
      }
    });
    pickN(L, Math.min(3, L.length)).forEach((l) => steps.push({ t: 'glyph', mode: 'glyph2sound', l, opts: shuffle([l[1], ...pickN(L.filter((x) => x !== l).map((x) => x[1]), Math.min(3, L.length - 1))]), answer: l[1], skill: 'reading' }));
    if (unit.kind !== 'numeral') pickN(L, Math.min(3, L.length)).forEach((l) => {
      const parts = seg(l[2]);
      if (parts.length > 1) steps.push({ t: 'spell', l, parts, bank: shuffle(parts), skill: 'writing' });
      steps.push({ t: 'glyph', mode: 'word', l, opts: shuffle([l[4], ...pickN(SCRIPT.flatMap((u) => u.letters).filter((x) => x[4] !== l[4]).map((x) => x[4]), 3)]), answer: l[4], skill: 'reading' });
    });
    return { steps, tuned: [] };
  }

  return { buildLesson, buildReview, buildSkill, buildMistakes, buildUnitTest, buildHome, buildScript, dueItems, dueCount, shuffle, pickN, X };
})();
