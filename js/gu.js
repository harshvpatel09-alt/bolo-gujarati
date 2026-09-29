/* Bolo — Gujarati text utilities: normalizing, comparing, transliteration input, diagnosis. */

const GU = (() => {
  const PUNCT = /[?.!,।|\-–—"'“”‘’:;…()]/g;
  const ZW = /[‌‍]/g;

  const norm = (s) => String(s || '').normalize('NFC').replace(ZW, '').replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
  const tokens = (s) => { const n = norm(s); return n ? n.split(' ') : []; };
  // Long/short vowel and nasal-insensitive form, for "close enough" spelling.
  const loose = (s) => norm(s).replace(/ઈ/g, 'ઇ').replace(/ઊ/g, 'ઉ').replace(/ી/g, 'િ').replace(/ૂ/g, 'ુ').replace(/[ંઁ]/g, '').replace(/ૅ/g, 'ે').replace(/ૉ/g, 'ો');
  const hasGu = (s) => /[઀-૿]/.test(s || '');
  const hasDeva = (s) => /[ऀ-ॿ]/.test(s || '');

  // Gujarati ↔ Devanagari share a parallel Unicode layout (offset 0x180).
  const toDeva = (s) => String(s).replace(/[ઁ-૯]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x180));
  const fromDeva = (s) => String(s).replace(/[ँ-९]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x180));

  function lev(a, b) {
    a = [...a]; b = [...b];
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  const sim = (a, b) => { const L = Math.max([...a].length, [...b].length); return L ? 1 - lev(a, b) / L : 1; };

  const normLatin = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z\s]/g, ' ').replace(/h+/g, 'h').replace(/aa/g, 'a').replace(/ee|ii/g, 'i').replace(/oo|uu/g, 'u').replace(/w/g, 'v').replace(/ph/g, 'f')
    .replace(/([bcdgjkpt])h/g, '$1').replace(/m\b/g, '').replace(/\s+/g, ' ').trim();

  /* ── Phonetic (Latin → Gujarati) input ── */
  const PH_V = [['aa', 'ા', 'આ'], ['ai', 'ૈ', 'ઐ'], ['au', 'ૌ', 'ઔ'], ['ee', 'ી', 'ઈ'], ['ii', 'ી', 'ઈ'], ['oo', 'ૂ', 'ઊ'], ['uu', 'ૂ', 'ઊ'],
    ['ā', 'ા', 'આ'], ['ī', 'ી', 'ઈ'], ['ū', 'ૂ', 'ઊ'], ['A', 'ા', 'આ'], ['I', 'ી', 'ઈ'], ['U', 'ૂ', 'ઊ'], ['R', 'ૃ', 'ઋ'],
    ['a', '', 'અ'], ['i', 'િ', 'ઇ'], ['u', 'ુ', 'ઉ'], ['e', 'ે', 'એ'], ['o', 'ો', 'ઓ'], ['E', 'ૅ', 'ઍ'], ['O', 'ૉ', 'ઑ']];
  const PH_C = [['ksh', 'ક્ષ'], ['chh', 'છ'], ['Th', 'ઠ'], ['Dh', 'ઢ'], ['Sh', 'ષ'], ['kh', 'ખ'], ['gh', 'ઘ'], ['ch', 'ચ'], ['jh', 'ઝ'], ['th', 'થ'], ['dh', 'ધ'],
    ['ph', 'ફ'], ['bh', 'ભ'], ['sh', 'શ'], ['gn', 'જ્ઞ'], ['ṭh', 'ઠ'], ['ḍh', 'ઢ'], ['ṭ', 'ટ'], ['ḍ', 'ડ'], ['ṇ', 'ણ'], ['ḷ', 'ળ'],
    ['T', 'ટ'], ['D', 'ડ'], ['N', 'ણ'], ['L', 'ળ'], ['k', 'ક'], ['g', 'ગ'], ['c', 'ચ'], ['j', 'જ'], ['z', 'ઝ'], ['t', 'ત'], ['d', 'દ'], ['n', 'ન'],
    ['p', 'પ'], ['f', 'ફ'], ['b', 'બ'], ['m', 'મ'], ['y', 'ય'], ['r', 'ર'], ['l', 'લ'], ['v', 'વ'], ['w', 'વ'], ['s', 'સ'], ['h', 'હ'], ['x', 'ક્ષ'], ['q', 'ક']];
  const match = (list, s, i) => {
    for (const row of list) if (s.startsWith(row[0], i)) return row;
    const lower = s[i] && s[i].toLowerCase();
    if (lower && lower !== s[i] && !'TDNLSRAIUEO'.includes(s[i])) for (const row of list) if (row[0] === lower) return row;
    return null;
  };
  function phonetic(s) {
    let out = '', i = 0, pend = false;
    while (i < s.length) {
      const ch = s[i];
      if (ch === 'M' || ch === '~' || ch === 'ṁ') { out += 'ં'; pend = false; i++; continue; }
      const c = match(PH_C, s, i);
      if (c) { if (pend) out += '્'; out += c[1]; pend = true; i += c[0].length; continue; }
      const v = match(PH_V, s, i);
      if (v) { out += pend ? v[1] : v[2]; pend = false; i += v[0].length; continue; }
      out += ch; pend = false; i++;
    }
    return out;
  }

  /* ── Comparing a typed/tiled answer ── */
  function check(given, answers) {
    const list = (Array.isArray(answers) ? answers : [answers]).filter(Boolean);
    const g = norm(given);
    for (const a of list) if (norm(a) === g) return { ok: true, exact: true };
    for (const a of list) if (loose(a) === loose(g)) return { ok: true, exact: false, spelling: norm(a) };
    return { ok: false };
  }
  function checkLatin(given, trs) {
    const g = normLatin(given);
    for (const t of trs) if (g && sim(g, normLatin(t)) >= 0.85) return true;
    return false;
  }

  /* ── Scoring speech-recognition output against a target ── */
  function scoreSpeech(target, alts) {
    const tt = tokens(target);
    let best = null;
    for (const alt of alts) {
      let text = alt.t || '';
      if (hasDeva(text)) text = fromDeva(text);
      const ht = tokens(text);
      let j = 0, ok = 0, close = 0;
      const words = tt.map((w) => {
        let bestK = -1, bestS = 0;
        for (let k = j; k < ht.length; k++) { const sc = sim(loose(w), loose(ht[k])); if (sc > bestS) { bestS = sc; bestK = k; } }
        if (bestS >= 0.8) { ok++; j = bestK + 1; return { w, st: 'ok' }; }
        if (bestS >= 0.5) { close++; j = bestK + 1; return { w, st: 'close', heard: ht[bestK] }; }
        return { w, st: 'miss' };
      });
      const wordScore = tt.length ? (ok + close * 0.5) / tt.length : 0;
      const charSim = sim(loose(target).replace(/ /g, ''), loose(text).replace(/ /g, ''));
      const score = Math.round(100 * (0.65 * wordScore + 0.35 * charSim));
      if (!best || score > best.score) best = { score, heard: text, words, conf: alt.c, latin: !hasGu(text) && !!text };
    }
    return best || { score: 0, heard: '', words: tt.map((w) => ({ w, st: 'miss' })) };
  }

  /* Pronunciation hints for a Gujarati word, from the sounds it contains. */
  const SOUND_TIPS = [
    [/[ટઠડઢણળ]/, 'Has a curled-back sound (ટ ઠ ડ ઢ ણ ળ): curl your tongue tip back to the roof of your mouth.'],
    [/[તથદધ]/, 'Has a soft dental sound (ત થ દ ધ): touch your tongue to the back of your top teeth.'],
    [/[ખઘછઝઠઢથધભ]/, 'Has a breathy sound (kh, gh, chh, th, dh, bh): let a puff of air out with it.'],
    [/[ંઁ]/, 'Has a nasal vowel (ં): hum lightly through your nose — no full “n”.'],
    [/વ/, 'વ sits between English v and w — lips barely touch.'],
  ];
  const soundTips = (word) => SOUND_TIPS.filter(([re]) => re.test(word)).map(([, t]) => t);

  /* Diagnose why an answer was wrong → { tag, why, remember } */
  const TAGS = {
    'word-order': { label: 'Word order', why: 'Gujarati puts the verb at the end: Subject → Object → Verb.', remember: 'Find the verb (the word before છે/છું/છો) and put it last.' },
    agreement: { label: 'Gender agreement', why: 'The ending must match the noun’s gender: -ો masculine, -ી feminine, -ું neuter.', remember: 'Learn each noun with an adjective: ઠંડી ચા, ઠંડું પાણી.' },
    'verb-ending': { label: 'Verb endings', why: 'The verb ending changes with the subject: હું -ઉં છું, તમે -ઓ છો, એ -ે છે.', remember: 'Listen for the vowel right before છ.' },
    respect: { label: 'Respect (તું / તમે)', why: 'Elders and strangers get તમે and the -ો forms. તું is for siblings and friends.', remember: 'When in doubt, choose the respectful form.' },
    ergative: { label: 'Past tense with મેં', why: 'Past actions with an object use મેં (not હું), and the verb matches the object.', remember: 'મેં ખાધું — never હું ખાધું.' },
    dative: { label: '“To me” verbs', why: 'Feelings, likes and needs use મને: મને ભૂખ લાગી છે, મને ગમે છે.', remember: 'If it happens *to* you, start with મને.' },
    negation: { label: 'Negation', why: 'નથી for present, નહીં after past forms, ન for “don’t”.', remember: 'Commands → ન. Present → નથી.' },
    postposition: { label: 'Postpositions', why: 'Endings like -માં, -એ, -નો/-ની/-નું attach to the noun and can change it.', remember: 'રસોડું → રસોડામાં; -નો/-ની/-નું match the thing owned.' },
    tense: { label: 'Tense', why: 'The verb form tells you the time: -ઈશ/-શે future, -યો/-યું past.', remember: 'Find the verb ending first, then decide the time.' },
    gender: { label: 'Your gender forms', why: 'Some past forms use the speaker’s gender: ગયો (man) / ગઈ (woman).', remember: 'Only “moving” verbs in the past do this.' },
    pronoun: { label: 'Pronouns', why: 'આપણે includes the listener, અમે does not.', remember: 'Is the listener coming too? Then આપણે.' },
    vocabulary: { label: 'Vocabulary', why: 'This word’s meaning got mixed up.', remember: 'Say it aloud in a sentence three times.' },
    listening: { label: 'Listening', why: 'The sounds were hard to separate at speed.', remember: 'Replay slowly, then at normal speed. Shadow it out loud.' },
    pronunciation: { label: 'Pronunciation', why: 'The recognizer didn’t catch some words.', remember: 'Slow down, and say each syllable fully.' },
    spelling: { label: 'Spelling', why: 'Close — a vowel length or nasal mark was off.', remember: 'ી (long) vs િ (short), ૂ vs ુ.' },
    reading: { label: 'Reading', why: 'The Gujarati text was misread.', remember: 'Read syllable by syllable before guessing the meaning.' },
    'missing-word': { label: 'Missing words', why: 'Part of the sentence was left out.', remember: 'Count the words in the English and make sure each has a partner.' },
  };
  function diagnose(given, expected, hint) {
    if (hint && TAGS[hint]) return hint;
    const g = tokens(given), e = tokens(expected);
    if (g.length && g.length === e.length && [...g].sort().join() === [...e].sort().join()) return 'word-order';
    if (e.includes('મેં') && g.includes('હું')) return 'ergative';
    if ((e.includes('તમે') && g.includes('તું')) || (e.includes('તું') && g.includes('તમે'))) return 'respect';
    if (e.includes('મને') && g.includes('હું')) return 'dative';
    if (g.length < e.length) return 'missing-word';
    if (g.length === e.length) {
      const diffs = e.map((w, i) => [w, g[i]]).filter(([a, b]) => a !== b);
      if (diffs.length === 1) {
        const [a, b] = diffs[0];
        if (b && a.slice(0, 2) === b.slice(0, 2)) return /છ/.test(a) || /[ઉઓે]ં?$/.test(a) ? 'verb-ending' : 'agreement';
      }
    }
    return 'vocabulary';
  }

  const KEYS = {
    vowels: ['અ', 'આ', 'ઇ', 'ઈ', 'ઉ', 'ઊ', 'એ', 'ઐ', 'ઓ', 'ઔ', 'ઋ'],
    matras: ['ા', 'િ', 'ી', 'ુ', 'ૂ', 'ે', 'ૈ', 'ો', 'ૌ', 'ં', '્', 'ૃ'],
    cons: [['ક', 'ખ', 'ગ', 'ઘ', 'ચ', 'છ', 'જ', 'ઝ'], ['ટ', 'ઠ', 'ડ', 'ઢ', 'ણ', 'ત', 'થ', 'દ', 'ધ', 'ન'], ['પ', 'ફ', 'બ', 'ભ', 'મ', 'ય', 'ર', 'લ', 'વ'], ['શ', 'ષ', 'સ', 'હ', 'ળ', 'ક્ષ', 'જ્ઞ']],
  };

  const DIGITS = '૦૧૨૩૪૫૬૭૮૯';
  const num = (n) => String(n).replace(/\d/g, (d) => DIGITS[d]);

  return { norm, tokens, loose, hasGu, toDeva, fromDeva, lev, sim, normLatin, phonetic, check, checkLatin, scoreSpeech, soundTips, diagnose, TAGS, KEYS, num };
})();
