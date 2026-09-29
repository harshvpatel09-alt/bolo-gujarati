/* Bolo — persistent learner state, spaced repetition, skills, streaks, mistakes. */

const Store = (() => {
  const KEY = 'bolo.v1';
  const DAY = 86400000;
  const DEF = () => ({
    v: 1,
    profile: { name: '', why: [], background: '', form: 'm', goal: 30, onboarded: false, level: 1, placement: null, created: Date.now() },
    settings: { translit: 'auto', voiceURI: '', rate: 1, sound: true, apiKey: '', model: 'claude-opus-5-5', theme: 'system', quietUntil: 0 },
    lessons: {}, xp: { total: 0, days: {} }, streak: { count: 0, last: null, best: 0 },
    srs: {}, skills: {}, mistakes: [], ach: {}, script: {}, convo: {}, home: {},
    stats: { spoken: 0, fixed: 0, sessions: 0 }, last: { route: '#/home' },
  });
  const merge = (a, b) => {
    for (const k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) merge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  };
  function load() { try { const raw = localStorage.getItem(KEY); if (raw) return merge(DEF(), JSON.parse(raw)); } catch (e) {} return DEF(); }
  let s = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };

  const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const today = () => dayKey();
  const yesterday = () => dayKey(Date.now() - DAY);

  /* ── XP, goal, streak ── */
  function addXP(n) {
    s.xp.total += n;
    s.xp.days[today()] = (s.xp.days[today()] || 0) + n;
    touchStreak();
    save();
  }
  function touchStreak() {
    const t = today();
    if (s.streak.last === t) return;
    s.streak.count = s.streak.last === yesterday() ? s.streak.count + 1 : 1;
    s.streak.last = t;
    s.streak.best = Math.max(s.streak.best, s.streak.count);
  }
  const streakNow = () => (s.streak.last === today() || s.streak.last === yesterday() ? s.streak.count : 0);
  const todayXP = () => s.xp.days[today()] || 0;
  const goalPct = () => Math.min(1, todayXP() / (s.profile.goal || 30));

  /* ── Spaced repetition (SM-2 flavoured) ── */
  function srsUpdate(id, ok, q = 1) {
    if (!id) return;
    const r = s.srs[id] || (s.srs[id] = { e: 2.4, i: 0, d: 0, r: 0, l: 0, c: 0, w: 0, t: 0, ok: null });
    const now = Date.now();
    if (ok) {
      r.c++; r.r++;
      r.i = r.i < 1 ? (q < 1 ? 0.5 : 1) : r.i < 3 ? 3 : Math.round(r.i * r.e * (q < 1 ? 0.7 : 1));
      r.e = Math.min(3, r.e + (q < 1 ? 0 : 0.05));
      r.d = now + r.i * DAY; r.ok = true;
    } else {
      r.w++; r.l++; r.r = 0; r.i = 0; r.e = Math.max(1.3, r.e - 0.2);
      r.d = now + 10 * 60000; r.ok = false;
    }
    r.t = now;
    return r;
  }
  function seedKnown(id, days = 7) {
    if (s.srs[id]) return;
    s.srs[id] = { e: 2.5, i: days, d: Date.now() + Math.random() * days * DAY, r: 2, l: 0, c: 2, w: 0, t: Date.now(), ok: true, seeded: true };
  }
  function itemState(id) {
    const r = s.srs[id];
    if (!r) return 'new';
    if (r.ok === false || (r.d < Date.now() - DAY && r.i < 21)) return 'review';
    if (r.i >= 21) return 'mastered';
    if (r.i >= 4) return 'familiar';
    return 'learning';
  }
  const strength = (id) => { const r = s.srs[id]; if (!r) return 0; if (r.ok === false) return 0.15; return Math.min(1, 0.25 + Math.log2(1 + r.i) / 5.5); };

  /* ── Skills ── */
  const SKILLS = ['speaking', 'listening', 'reading', 'writing', 'vocab', 'grammar'];
  function skillHit(k, ok, weight = 1) {
    if (!k) return;
    const sk = s.skills[k] || (s.skills[k] = { a: 0, ok: 0, ema: 0.5 });
    sk.a++; if (ok) sk.ok++;
    const alpha = Math.max(0.07, 1 / (sk.a + 1)) * weight;
    sk.ema = sk.ema * (1 - alpha) + (ok ? 1 : 0) * alpha;
  }
  const skill = (k) => s.skills[k] || { a: 0, ok: 0, ema: 0.5 };
  function weakest(list = ['speaking', 'listening', 'reading', 'writing']) {
    const score = (k) => { const sk = skill(k); return sk.ema - (sk.a < 8 ? 0.15 : 0) - (k === 'speaking' && s.profile.why.includes('family') ? 0.05 : 0); };
    return [...list].sort((a, b) => score(a) - score(b));
  }

  /* ── Mistakes ── */
  function addMistake(m) {
    s.mistakes.unshift(Object.assign({ t: Date.now(), fixed: false }, m));
    if (s.mistakes.length > 300) s.mistakes.length = 300;
  }
  function fixMistakes(itemId) {
    let n = 0;
    s.mistakes.forEach((m) => { if (m.item === itemId && !m.fixed) { m.fixed = true; n++; } });
    if (n) s.stats.fixed += n;
  }

  /* ── Achievements ── */
  function checkAch(extra = {}) {
    const has = (id) => s.ach[id];
    const unlocked = [];
    const give = (id) => { if (!has(id)) { s.ach[id] = Date.now(); unlocked.push(id); } };
    if (Object.values(s.lessons).some((l) => l.done && !l.tested)) give('first');
    if (s.stats.spoken >= 10) give('spoke10');
    if (s.stats.spoken >= 100) give('spoke100');
    if (streakNow() >= 3) give('streak3');
    if (streakNow() >= 7) give('streak7');
    if (Object.keys(s.srs).filter((id) => ['familiar', 'mastered'].includes(itemState(id))).length >= 50) give('words50');
    if (Object.values(s.convo).some((c) => c.done)) give('convo1');
    if (s.convo['ba-call'] && s.convo['ba-call'].done) give('baCall');
    if (Object.values(s.script).some((c) => c.done)) give('script1');
    if (s.stats.fixed >= 10) give('fixer');
    if (s.profile.level >= 2) give('level2');
    if (Object.keys(s.home).length >= 10) give('home10');
    save();
    return unlocked;
  }

  function reset() { s = DEF(); save(); }
  function exportJSON() { return JSON.stringify(s, null, 2); }
  function importJSON(txt) { s = merge(DEF(), JSON.parse(txt)); save(); }

  return {
    get s() { return s; }, save, today, dayKey, DAY,
    addXP, streakNow, todayXP, goalPct,
    srsUpdate, seedKnown, itemState, strength,
    SKILLS, skillHit, skill, weakest,
    addMistake, fixMistakes, checkAch, reset, exportJSON, importJSON,
  };
})();

/* Resolve a gender-variant value for the learner. */
const R = (v) => (v && typeof v === 'object' && 'm' in v ? v[Store.s.profile.form === 'f' ? 'f' : 'm'] : v);
