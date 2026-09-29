/* Bolo — pages. Each view returns HTML and may bind events after mount. */

const Views = (() => {
  const P = () => Store.s.profile;
  const LEVEL_NAMES = Object.fromEntries(COURSE.map((l) => [l.n, l]));

  /* ─────────────── Onboarding ─────────────── */
  const OB = { step: 'welcome', why: [], background: '', form: 'm', name: '', goal: 30 };
  const WHY = [['family', 'Talk with my family', 'heart'], ['elders', 'Connect with grandparents', 'talk'], ['culture', 'Culture, festivals & faith', 'star'], ['travel', 'Visit Gujarat', 'path'], ['partner', 'My partner’s family', 'me'], ['media', 'Understand films & music', 'ear']];
  const BG = [['none', 'Brand new', 'I know almost no Gujarati'], ['hear', 'I understand some', 'I hear it at home but rarely speak'], ['basic', 'I can speak basics', 'Greetings and simple sentences'], ['conv', 'I can hold a conversation', 'I want to sound natural and fluent']];

  function onboarding() {
    const s = OB.step;
    const wrap = (inner, n) => `<div class="ob"><div class="ob-top">${n ? `<button class="icon-btn" data-ob-back type="button" aria-label="Back">${icon('back')}</button>${bar(n / 6)}` : ''}</div><div class="ob-card enter">${inner}</div></div>`;
    if (s === 'welcome') return `<div class="ob ob-welcome"><div class="ob-hero enter">
        <div class="wordmark" lang="gu">બોલો</div>
        <p class="ob-tag">Gujarati for the people you love.</p>
        <p class="ob-lede">Short daily lessons, real family phrases, and lots of speaking — built around how Gujarati is actually spoken at home.</p>
        <div class="ob-actions"><button class="btn btn-primary btn-lg" data-ob="why" type="button">Get started</button>
        <label class="btn btn-ghost" for="ob-import">I have a progress file<input id="ob-import" type="file" accept="application/json" hidden></label></div>
        <div class="ob-sample" aria-hidden="true"><span lang="gu">કેમ છો?</span><span>kem chho?</span><span>How are you?</span></div>
      </div></div>`;
    if (s === 'why') return wrap(`<h1>Why are you learning Gujarati?</h1><p class="muted">Pick all that fit — we’ll shape your lessons around them.</p>
      <div class="choice-grid">${WHY.map(([k, t, ic]) => `<button class="choice ${OB.why.includes(k) ? 'on' : ''}" data-why="${k}" type="button">${icon(ic)}<span>${t}</span></button>`).join('')}</div>
      <button class="btn btn-primary btn-lg btn-block" data-ob="bg" type="button" ${OB.why.length ? '' : 'disabled'}>Continue</button>`, 1);
    if (s === 'bg') return wrap(`<h1>How much do you know already?</h1><p class="muted">Be honest — the next step checks it anyway.</p>
      <div class="choice-list">${BG.map(([k, t, d]) => `<button class="choice-row ${OB.background === k ? 'on' : ''}" data-bg="${k}" type="button"><b>${t}</b><span>${d}</span></button>`).join('')}</div>
      <button class="btn btn-primary btn-lg btn-block" data-ob="form" type="button" ${OB.background ? '' : 'disabled'}>Continue</button>`, 2);
    if (s === 'form') return wrap(`<h1>A bit about you</h1>
      <label class="field"><span>Your name (optional)</span><input id="ob-name" value="${esc(OB.name)}" autocomplete="given-name" placeholder="e.g. Harsh"></label>
      <div class="field"><span>Which forms should we teach you?</span><p class="muted small">A few Gujarati verbs change with the speaker’s gender — “I went” is <b lang="gu">હું ગયો</b> for a man and <b lang="gu">હું ગઈ</b> for a woman.</p>
      <div class="seg-row"><button class="seg ${OB.form === 'm' ? 'on' : ''}" data-form="m" type="button"><span lang="gu">હું ગયો</span> masculine</button><button class="seg ${OB.form === 'f' ? 'on' : ''}" data-form="f" type="button"><span lang="gu">હું ગઈ</span> feminine</button></div></div>
      <button class="btn btn-primary btn-lg btn-block" data-ob="place-intro" type="button">Continue</button>`, 3);
    if (s === 'place-intro') return wrap(`<div class="ob-illo">${diya(1, 'diya-xl flicker')}</div><h1>Let’s find your level</h1>
      <p class="muted">About 16 quick questions: words, listening, reading Gujarati script, grammar, and one line to say out loud. It stops early if it gets too hard. Tap <b>I don’t know this yet</b> instead of guessing — guessing makes your lessons too hard.</p>
      <button class="btn btn-primary btn-lg btn-block" data-ob="placement" type="button">Start the check (3 min)</button>
      ${OB.background === 'none' ? `<button class="btn btn-ghost btn-block" data-ob="from-zero" type="button">Skip — start from the very beginning</button>` : ''}`, 4);
    if (s === 'result') {
      const r = OB.result;
      const lv = LEVEL_NAMES[r.level];
      return wrap(`<span class="chip">Your starting point</span>
        <div class="result-level"><span class="display" lang="gu">${esc(lv.gu)}</span><h1>Level ${r.level} · ${esc(lv.title)}</h1><p class="muted">${esc(lv.blurb)}</p></div>
        <div class="tier-list">${COURSE.slice(0, 5).map((l, i) => { const a = r.tiers[i + 1]; return `<div class="tier"><span>${esc(l.title)}</span>${a == null ? '<em>not tested</em>' : dots(a, 8)}</div>`; }).join('')}</div>
        <p class="muted">${r.skipped ? `We’ll skip ${r.skipped} lessons you already know, and bring their words back in review so nothing slips.` : 'We’ll start from the first lesson and move quickly through anything you already know.'}</p>
        <button class="btn btn-primary btn-lg btn-block" data-ob="goal" type="button">Continue</button>`, 5);
    }
    if (s === 'goal') return wrap(`<h1>Set a daily goal</h1><p class="muted">Consistency beats long sessions. You can change this any time.</p>
      <div class="choice-list">${[[15, 'Casual', '~5 min · a quick review'], [30, 'Regular', '~10–15 min · one lesson'], [50, 'Serious', '~20 min · a lesson plus speaking'], [80, 'Intense', '30+ min']].map(([x, t, d]) => `<button class="choice-row ${OB.goal === x ? 'on' : ''}" data-goal="${x}" type="button"><b>${t}</b><span>${d}</span><em>${x} XP</em></button>`).join('')}</div>
      <button class="btn btn-primary btn-lg btn-block" data-ob="finish" type="button">Start my first lesson</button>`, 6);
    return '';
  }

  function bindOnboarding(root) {
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-ob],[data-why],[data-bg],[data-form],[data-goal],[data-ob-back]');
      if (!t) return;
      if (t.dataset.why) { const k = t.dataset.why; OB.why = OB.why.includes(k) ? OB.why.filter((x) => x !== k) : [...OB.why, k]; return App.render(); }
      if (t.dataset.bg) { OB.background = t.dataset.bg; return App.render(); }
      if (t.dataset.form) { OB.form = t.dataset.form; OB.name = ($('#ob-name') || {}).value || OB.name; return App.render(); }
      if (t.dataset.goal) { OB.goal = +t.dataset.goal; return App.render(); }
      if (t.hasAttribute('data-ob-back')) { const order = ['welcome', 'why', 'bg', 'form', 'place-intro', 'result', 'goal']; OB.step = order[Math.max(0, order.indexOf(OB.step) - 1)]; return App.render(); }
      const go = t.dataset.ob;
      if (go === 'place-intro') { OB.name = ($('#ob-name') || {}).value || ''; Object.assign(P(), { name: OB.name.trim(), form: OB.form, why: OB.why, background: OB.background }); Store.save(); }
      if (go === 'placement') return runPlacement();
      if (go === 'from-zero') { applyPlacement({ level: 1, tiers: {}, skipped: 0, skills: {} }); OB.step = 'goal'; return App.render(); }
      if (go === 'finish') {
        P().goal = OB.goal; P().onboarded = true; Store.save();
        location.hash = '#/lesson/' + Course.current().id; return;
      }
      OB.step = go; App.render();
    });
    const imp = $('#ob-import', root);
    if (imp) imp.addEventListener('change', async () => { try { Store.importJSON(await imp.files[0].text()); toast('Progress restored.'); location.hash = '#/home'; App.render(); } catch (e) { toast('That file couldn’t be read as Bolo progress.'); } });
  }

  function runPlacement() {
    const steps = PLACEMENT.map((p) => ({ t: 'place', p, skill: p.skill }));
    steps.push({ t: 'place-speak', skill: 'speaking' });
    const tally = {};
    Player.start({
      title: 'Placement check', steps, quick: true, placement: true, noRetry: true, noSrs: true,
      onAnswer(st, res, S) {
        if (st.t === 'place') {
          const t = st.p.tier; tally[t] = tally[t] || { n: 0, ok: 0, total: PLACEMENT.filter((x) => x.tier === t).length };
          tally[t].n++; if (res.ok) tally[t].ok++;
          const x = tally[t];
          const lastOfTier = x.n === x.total;
          if (lastOfTier && x.ok / x.total < 0.6) { S.queue = S.queue.slice(0, S.i + 1).concat(S.queue.filter((q) => q.t === 'place-speak')); }
        }
      },
      onFinish({ acc }) {
        const S = Player.S;
        const tiers = {}; Object.entries(tally).forEach(([t, x]) => (tiers[t] = x.ok / x.total));
        let passed = 0; for (let t = 1; t <= 5; t++) { if ((tiers[t] || 0) >= 0.6) passed = t; else break; }
        const level = Math.min(6, passed + 1);
        const skills = {};
        S.results.forEach((r, i) => { const st = S.queue[i]; if (!st || !r.skill) return; const k = r.skill; skills[k] = skills[k] || { a: 0, ok: 0 }; skills[k].a++; if (r.ok) skills[k].ok++; });
        OB.result = applyPlacement({ level, tiers, skills });
        OB.step = 'result';
        return { skipSummary: true };
      },
      onDone: () => App.render(),
    });
  }

  function applyPlacement({ level, tiers, skills }) {
    let skipped = 0;
    Course.lessons.forEach((l) => {
      if (l.level < level) {
        Store.s.lessons[l.id] = { done: true, tested: true, best: 0, n: 0, t: Date.now() };
        [...l.words, ...l.sents].forEach((x) => Store.seedKnown(x.id, 3 + Math.random() * 10));
        skipped++;
      }
    });
    Object.entries(skills || {}).forEach(([k, v]) => { Store.s.skills[k] = { a: v.a, ok: v.ok, ema: 0.35 + 0.5 * (v.ok / v.a) }; });
    P().level = level; P().placement = { level, tiers, date: Date.now() };
    if (level >= 4) Store.s.settings.translit = 'auto';
    Store.save();
    return { level, tiers, skipped };
  }

  /* ─────────────── Home ─────────────── */
  function home() {
    const cur = Course.current();
    const lv = LEVEL_NAMES[cur.level];
    const unit = Course.units.find((u) => u.id === cur.unit);
    const due = Engine.dueCount();
    const open = Store.s.mistakes.filter((m) => !m.fixed).length;
    const phrase = HOME[Math.floor(Date.now() / Store.DAY) % HOME.length];
    const week = Array.from({ length: 7 }, (_, i) => { const d = Store.dayKey(Date.now() - (6 - i) * Store.DAY); return { d, on: (Store.s.xp.days[d] || 0) > 0, lbl: 'SMTWTFS'[new Date(Date.now() - (6 - i) * Store.DAY).getDay()] }; });
    const streak = Store.streakNow();
    const tags = {}; Store.s.mistakes.filter((m) => !m.fixed).forEach((m) => (tags[m.tag] = (tags[m.tag] || 0) + 1));
    const topTag = Object.entries(tags).sort((a, b) => b[1] - a[1])[0];
    const g = greeting();
    return `<div class="home">
      <section class="home-main">
        <header class="hello">
          <p class="hello-sub">${g}${P().name ? ', ' + esc(P().name) : ''}</p>
          <h1 class="display hello-gu" lang="gu"><button class="say-inline" data-say="કેમ છો?" type="button">કેમ છો?</button></h1>
          <p class="hello-tr">kem chho? · how are you?</p>
        </header>

        <article class="continue">
          <div class="continue-top"><span class="crumb">Level ${cur.level} · ${esc(lv.title)} · ${esc(unit.title)}</span><span class="mins">${cur.mins} min</span></div>
          <h2><span lang="gu" class="continue-gu">${esc(cur.gu)}</span>${esc(cur.title)}</h2>
          <p class="continue-can">${esc(cur.can)}</p>
          <ul class="inside">${cur.words.length ? `<li>${icon('words')} ${cur.words.length} words</li>` : ''}${cur.grammar ? `<li>${icon('book')} ${esc({ grammar: 'Grammar', sound: 'Pronunciation', culture: 'Culture', register: 'Register' }[cur.grammar.kind])}</li>` : ''}<li>${icon('ear')} Listen</li><li>${icon('mic')} Speak</li>${cur.talk ? `<li>${icon('talk')} Talk</li>` : ''}</ul>
          <a class="btn btn-primary btn-lg" href="#/lesson/${cur.id}">${Store.s.lessons[cur.id] ? 'Continue' : 'Start lesson'}</a>
        </article>

        <h3 class="sec-h">Quick practice</h3>
        <div class="quick">
          <button class="qp" data-go="review" type="button">${icon('refresh')}<b>Review</b><span>${due ? `${due} due` : 'All caught up'}</span></button>
          <button class="qp" data-go="skill:speaking" type="button">${icon('mic')}<b>Speak</b><span>Say it out loud</span></button>
          <button class="qp" data-go="skill:listening" type="button">${icon('ear')}<b>Listen</b><span>Train your ear</span></button>
          <a class="qp" href="#/script">${icon('script')}<b>Read</b><span>Gujarati script</span></a>
          <a class="qp" href="#/home-gujarati">${icon('heart')}<b>Home Gujarati</b><span>Family phrases</span></a>
          <a class="qp" href="#/talk">${icon('talk')}<b>Conversation</b><span>Role-play scenes</span></a>
        </div>

        <h3 class="sec-h">Course progress</h3>
        <div class="levels">${COURSE.map((l) => { const p = Course.levelProgress(l.n); return `<a class="lv-row ${l.n === cur.level ? 'cur' : ''}" href="#/path#lv${l.n}"><span class="lv-n">${GU.num(l.n)}</span><span class="lv-t"><b>${esc(l.title)}</b><span lang="gu">${esc(l.gu)}</span></span>${dots(p, 10)}<span class="lv-p">${Math.round(p * 100)}%</span></a>`; }).join('')}</div>
      </section>

      <aside class="home-side">
        <div class="card streak-card">
          <div class="streak-top">${diya(streak ? 1 : 0, streak ? 'flicker' : '')}<div><b>${streak}</b><span>day streak</span></div></div>
          <div class="week">${week.map((d) => `<span class="${d.on ? 'on' : ''}"><i></i>${d.lbl}</span>`).join('')}</div>
          <div class="goal"><div class="row between"><span>Today’s goal</span><span class="num">${Store.todayXP()} / ${P().goal} XP</span></div>${dots(Store.goalPct(), 12, 'dots-lg')}</div>
        </div>
        <div class="card pod">
          <div class="row between"><h3>Phrase of the day</h3><a class="small" href="#/home-gujarati">More</a></div>
          <p class="pod-en">${esc(phrase.en)}</p>
          ${[['Textbook', phrase.t], ['Natural', phrase.n], ['Casual', phrase.c]].map(([k, v]) => `<div class="pod-row"><span class="reg-lbl reg-${k[0].toLowerCase()}">${k}</span><button class="say-btn sm" data-say="${esc(R(v[0]))}" type="button" aria-label="Play">${icon('speaker')}</button><span lang="gu" class="gu-inline">${esc(R(v[0]))}</span></div>`).join('')}
          <p class="small muted">${esc(phrase.note)}</p>
        </div>
        <a class="card side-link" href="#/mistakes"><div>${icon('target')}</div><div><b>My mistakes</b><span>${open ? `${open} to fix${topTag ? ` · most often: ${esc((GU.TAGS[topTag[0]] || {}).label || topTag[0])}` : ''}` : 'Nothing to fix right now'}</span></div>${icon('chevron')}</a>
      </aside>
    </div>`;
  }
  function bindQuick(root) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]'); if (!b) return;
      const [k, v] = b.dataset.go.split(':');
      if (k === 'review') startReview();
      if (k === 'skill') startSkill(v);
    });
  }
  function startReview(focus) {
    const { steps, tuned } = Engine.buildReview(focus);
    if (!steps.length) return toast('Nothing to review yet — finish a lesson and come back.');
    Player.start({ title: 'Smart review', steps, tuned, xpBase: 8 });
  }
  function startSkill(skill) {
    const { steps } = Engine.buildSkill(skill);
    Player.start({ title: `${skill[0].toUpperCase() + skill.slice(1)} practice`, steps, xpBase: 6 });
  }

  /* ─────────────── Path (skill tree) ─────────────── */
  function path() {
    const cur = Course.current();
    let k = 0;
    return `<div class="path-page"><header class="page-h"><h1>Your path</h1><p class="muted">Each diya is a lesson. Light them one by one — or test out of a unit you already know.</p></header>
      ${COURSE.map((lv) => `<section class="lv" id="lv${lv.n}">
        <header class="lv-h"><span class="display lv-gu" lang="gu">${esc(lv.gu)}</span><div><h2>Level ${lv.n} · ${esc(lv.title)}</h2><p>${esc(lv.blurb)}</p></div>${dots(Course.levelProgress(lv.n), 10)}</header>
        ${lv.units.map((u) => { const up = Course.unitProgress(u); return `<div class="unit">
          <div class="unit-h"><div><h3>${esc(u.title)}</h3><span lang="gu">${esc(u.gu)}</span></div>${up < 1 ? `<button class="btn btn-ghost btn-sm" data-test="${u.id}" type="button">Test out</button>` : `<span class="chip chip-ok">${icon('check')} Done</span>`}</div>
          <ol class="trail">${u.lessons.map((l) => { const st = Course.status(l); const isCur = l.id === cur.id; const off = ['0', '38%', '62%', '38%'][k++ % 4];
            return `<li class="node ${st} ${isCur ? 'current' : ''}" style="--off:${off}"><a href="#/lesson/${l.id}" ${st === 'locked' ? 'data-locked aria-disabled="true"' : ''} aria-label="${esc(l.title)} — ${st === 'done' ? 'completed' : isCur ? 'current lesson' : st === 'locked' ? 'locked' : 'open'}">
              <span class="node-lamp">${st === 'locked' ? icon('lock') : diya(st === 'done' ? 1 : isCur ? 1 : 0, isCur ? 'flicker' : '')}</span>
              <span class="node-t"><b>${esc(l.title)}</b><span lang="gu">${esc(l.gu)}</span>${isCur ? '<em>Up next</em>' : (Store.s.lessons[l.id] || {}).tested ? '<em class="tested">Tested out</em>' : ''}</span></a></li>`; }).join('')}</ol></div>`; }).join('')}
      </section>`).join('')}</div>`;
  }
  function bindPath(root) {
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-locked]')) { e.preventDefault(); toast('Finish the lesson before this one — or use “Test out” on the unit.'); return; }
      const t = e.target.closest('[data-test]'); if (!t) return;
      const unit = Course.units.find((u) => u.id === t.dataset.test);
      const { steps } = Engine.buildUnitTest(unit);
      Player.start({ title: `Test out: ${unit.title}`, steps, noRetry: true, xpBase: 5,
        onFinish({ acc }) {
          if (acc >= 0.8) { unit.lessons.forEach((l) => { if (!(Store.s.lessons[l.id] || {}).done) Store.s.lessons[l.id] = { done: true, tested: true, best: acc, n: 0, t: Date.now() }; }); Store.save(); return { title: `You tested out of ${unit.title}!`, html: `<p class="sum-can">${icon('check')}<span>All ${unit.lessons.length} lessons marked done.</span></p>` }; }
          return { title: `${Math.round(acc * 100)}% — not quite 80%`, html: `<p class="muted">No problem — the lessons will make it stick.</p>` };
        } });
    });
  }

  /* ─────────────── Lesson preview ─────────────── */
  function lesson(id) {
    const ls = Course.byId[id]; if (!ls) return notFound();
    const st = Course.status(ls);
    const lv = LEVEL_NAMES[ls.level];
    const plan = Engine.buildLesson(ls);
    const known = (w) => ['familiar', 'mastered'].includes(Store.itemState(w.id));
    const counts = {}; plan.steps.forEach((s) => (counts[s.skill || s.t] = (counts[s.skill || s.t] || 0) + 1));
    return `<div class="lesson-page">
      <a class="back" href="#/path">${icon('back')} Path</a>
      <header class="lp-h"><span class="crumb">Level ${ls.level} · ${esc(lv.title)}</span><h1><span class="display" lang="gu">${esc(ls.gu)}</span>${esc(ls.title)}</h1><p class="lp-can">${icon('target')} ${esc(ls.can)}</p>
        <div class="lp-meta"><span>${ls.mins} min</span><span>${plan.steps.length} steps</span><span>~${15 + Math.min(counts.speaking || 0, 5)} XP</span></div></header>
      <div class="lp-grid">
        <section class="card"><h3>New words</h3><ul class="word-chips">${ls.words.map((w) => `<li class="${known(w) ? 'known' : ''}"><button class="say-btn sm" data-say="${esc(R(w.guG || w.gu))}" type="button" aria-label="Play">${icon('speaker')}</button><span lang="gu">${esc(R(w.guG || w.gu))}</span><small>${esc(w.en)}</small>${known(w) ? '<em>known</em>' : ''}</li>`).join('')}</ul></section>
        <section class="card"><h3>The flow</h3><ol class="flow">
          <li><b>See & understand</b><span>New words with audio and pronunciation</span></li>
          ${ls.grammar ? `<li><b>${esc({ grammar: 'Grammar', sound: 'Pronunciation', culture: 'Culture', register: 'Register' }[ls.grammar.kind])}</b><span>${esc(ls.grammar.title)}</span></li>` : ''}
          <li><b>Practice</b><span>Build, fill, match and type sentences</span></li>
          <li><b>Listen & speak</b><span>${counts.listening || 0} listening · ${counts.speaking || 0} speaking</span></li>
          ${ls.read ? `<li><b>Read</b><span>${esc(ls.read.title)}</span></li>` : ''}
          ${ls.talk ? `<li><b>Use it</b><span>${esc(CHARACTERS[ls.talk.who].name)}: ${esc(ls.talk.ctx)}</span></li>` : ''}
          <li><b>Review</b><span>Earlier words that are due, then one last sentence out loud</span></li></ol></section>
        ${plan.tuned.length ? `<section class="card tuned"><h3>${icon('spark')} Tuned for you</h3><ul>${plan.tuned.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
      </div>
      <div class="lp-cta"><button class="btn btn-primary btn-lg" data-start="${ls.id}" type="button" ${st === 'locked' ? 'disabled' : ''}>${st === 'done' ? 'Practice again' : 'Start lesson'}</button>${st === 'locked' ? '<p class="muted small">Finish the previous lesson first — or test out of the unit on the path.</p>' : ''}</div>
    </div>`;
  }
  function bindLesson(root) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-start]'); if (!b) return;
      startLesson(Course.byId[b.dataset.start]);
    });
  }
  function startLesson(ls) {
    const { steps, tuned } = Engine.buildLesson(ls);
    Store.s.last.lesson = ls.id; Store.save();
    Player.start({
      title: ls.title, lesson: ls, steps, tuned, xpBase: 10,
      onFinish({ acc }) {
        const prev = Store.s.lessons[ls.id] || { n: 0, best: 0 };
        Store.s.lessons[ls.id] = { done: true, best: Math.max(prev.best || 0, acc), n: (prev.n || 0) + 1, t: Date.now() };
        const nx = Course.lessons[ls.idx + 1];
        if (nx && nx.level > P().level) P().level = nx.level;
        Store.save();
        return { title: `${ls.title} complete`, cta: nx ? 'Continue' : 'Done' };
      },
      onDone: () => { location.hash = '#/home'; App.render(); },
    });
  }

  /* ─────────────── Practice hub ─────────────── */
  function practice() {
    const due = Engine.dueCount();
    const weak = Store.weakest(['speaking', 'listening', 'reading', 'writing', 'vocab', 'grammar']);
    const open = Store.s.mistakes.filter((m) => !m.fixed).length;
    const SK = { speaking: ['mic', 'Speaking', 'Say sentences out loud'], listening: ['ear', 'Listening', 'Hear it, pick it, build it'], reading: ['book', 'Reading', 'Gujarati script, no transliteration'], writing: ['keyboard', 'Writing', 'Type Gujarati'], vocab: ['words', 'Vocabulary', 'Words and meanings'], grammar: ['star', 'Grammar', 'Sentence building'] };
    return `<div class="practice"><header class="page-h"><h1>Practice</h1><p class="muted">Review is built from your own history: what’s due, what you miss, and your weakest skills.</p></header>
      <article class="card review-hero"><div><h2>Smart review</h2><p>${due ? `${due} items are due.` : 'Nothing is overdue.'} This session leans toward <b>${esc(weak[0])}</b> and <b>${esc(weak[1])}</b> — your weakest skills right now.</p></div><button class="btn btn-primary btn-lg" data-go="review" type="button">Start review</button></article>
      <h3 class="sec-h">Train one skill</h3>
      <div class="skill-grid">${Object.entries(SK).map(([k, [ic, t, d]]) => { const s = Store.skill(k); return `<button class="skill-tile" data-go="skill:${k}" type="button">${icon(ic)}<b>${t}</b><span>${d}</span>${bar(s.a ? s.ema : 0)}<small>${s.a ? Math.round(s.ema * 100) + '%' : 'no data yet'}</small></button>`; }).join('')}</div>
      <h3 class="sec-h">More ways to practice</h3>
      <div class="more-grid">
        <a class="card side-link" href="#/mistakes"><div>${icon('target')}</div><div><b>My mistakes</b><span>${open} to fix</span></div>${icon('chevron')}</a>
        <a class="card side-link" href="#/home-gujarati"><div>${icon('heart')}</div><div><b>Home Gujarati</b><span>${HOME.length} phrases in 3 registers</span></div>${icon('chevron')}</a>
        <a class="card side-link" href="#/script"><div>${icon('script')}</div><div><b>Script course</b><span>${SCRIPT.filter((u) => (Store.s.script[u.id] || {}).done).length}/${SCRIPT.length} units</span></div>${icon('chevron')}</a>
        <a class="card side-link" href="#/words"><div>${icon('words')}</div><div><b>My words</b><span>${Object.keys(Store.s.srs).length} tracked</span></div>${icon('chevron')}</a>
      </div></div>`;
  }

  /* ─────────────── Conversation list ─────────────── */
  function talkList() {
    const groups = [[1, 'Start here'], [2, 'Everyday situations'], [3, 'Longer conversations']];
    return `<div class="talk-page"><header class="page-h"><h1>Conversation</h1><p class="muted">Role-play real situations. Tap a reply, say it, or type your own.</p></header>
      <div class="ai-banner ${AI.ready() ? 'on' : ''}">${icon('spark')}<div>${AI.ready() ? '<b>AI tutor is on.</b> After each scene you can keep talking freely — the character answers naturally and corrects you gently.' : '<b>Scenes work offline.</b> Add your Claude API key in Settings to unlock free conversation with an AI tutor.'}</div>${AI.ready() ? '' : '<a class="btn btn-ghost btn-sm" href="#/settings">Set up</a>'}</div>
      ${groups.map(([n, t]) => `<h3 class="sec-h">${t}</h3><div class="scene-grid">${SCENARIOS.filter((s) => s.lvl === n).map((s) => { const done = (Store.s.convo[s.id] || {}).done; return `<a class="scene" href="#/talk/${s.id}">${avatar(s.who, 56)}<div><b>${esc(s.title)}</b><span lang="gu">${esc(s.gu)}</span><small>${esc(CHARACTERS[s.who].name)} · ${esc(s.where)}</small></div>${done ? `<span class="chip chip-ok">${icon('check')}</span>` : ''}</a>`; }).join('')}</div>`).join('')}
    </div>`;
  }

  /* ─────────────── Conversation scene ─────────────── */
  let C = null;
  function talkScene(id) {
    const sc = SCENARIOS.find((s) => s.id === id); if (!sc) return notFound();
    if (!C || C.id !== id) C = { id, sc, i: 0, log: [], mode: 'script', fails: 0, sugg: null, busy: false, done: false };
    const ch = CHARACTERS[sc.who];
    return `<div class="scene-page">
      <header class="scene-h"><a class="icon-btn" href="#/talk" aria-label="Back">${icon('back')}</a>${avatar(sc.who, 48)}<div><b>${esc(ch.name)}</b><span>${esc(sc.where)}</span></div>
        <div class="seg-row sm">${`<button class="seg ${C.mode === 'script' ? 'on' : ''}" data-mode="script" type="button">Guided</button><button class="seg ${C.mode === 'ai' ? 'on' : ''}" data-mode="ai" type="button">${icon('spark')} Free (AI)</button>`}</div></header>
      <p class="scene-goal">${icon('target')} ${esc(sc.goal)}</p>
      <div class="chat" id="chat" aria-live="polite"></div>
      <div class="composer" id="composer"></div>
    </div>`;
  }
  function bindScene(root) {
    const chat = $('#chat', root), comp = $('#composer', root);
    const sc = C.sc;
    const bubble = (m) => `<div class="msg ${m.role} ${m.state || ''}">${m.role === 'npc' ? avatar(sc.who, 36) : ''}<div class="bub">
        <div class="bub-gu"><button class="say-btn sm" data-say="${esc(m.gu)}" type="button" aria-label="Play">${icon('speaker')}</button><span lang="gu">${esc(m.gu)}</span></div>
        ${m.tr ? `<div class="tr">${esc(m.tr)}</div>` : ''}${m.en ? `<details><summary>English</summary><p class="en">${esc(m.en)}</p></details>` : ''}
        ${m.fb ? `<div class="bub-fb fb-${m.fb.kind}">${m.fb.html}</div>` : ''}</div></div>`;
    const draw = () => { chat.innerHTML = C.log.map(bubble).join('') + (C.busy ? `<div class="msg npc typing">${avatar(sc.who, 36)}<div class="bub"><span class="dots-typing"><i></i><i></i><i></i></span></div></div>` : ''); chat.lastElementChild && chat.lastElementChild.scrollIntoView({ block: 'end', behavior: 'smooth' }); };
    const npcSay = (gu, tr, en) => { C.log.push({ role: 'npc', gu, tr, en }); draw(); Speech.say(gu); };

    function advance() {
      while (C.i < sc.turns.length && sc.turns[C.i].npc) { const [g, t, e] = sc.turns[C.i].npc; npcSay(R(g), R(t), R(e)); C.i++; }
      if (C.i >= sc.turns.length) return endScene();
      C.fails = 0; composer();
    }
    function endScene() {
      C.done = true;
      const first = !(Store.s.convo[sc.id] || {}).done;
      Store.s.convo[sc.id] = { done: true, t: Date.now(), n: ((Store.s.convo[sc.id] || {}).n || 0) + 1 };
      Store.addXP(first ? 15 : 8); Store.s.stats.sessions++; Store.save();
      achToast(Store.checkAch());
      Sfx.done();
      comp.innerHTML = `<div class="scene-end"><div>${diya(1, 'flicker')}<b class="display" lang="gu">શાબાશ!</b><span>Scene complete · +${first ? 15 : 8} XP</span></div>
        <div class="row">${AI.ready() ? `<button class="btn btn-primary" data-mode="ai" type="button">${icon('spark')} Keep talking freely</button>` : `<a class="btn btn-ghost" href="#/settings">${icon('spark')} Unlock free talk</a>`}<button class="btn btn-ghost" data-restart type="button">Play again</button><a class="btn btn-ghost" href="#/talk">More scenes</a></div></div>`;
    }
    function composer() {
      const turn = C.mode === 'script' ? sc.turns[C.i] : null;
      const sugg = C.mode === 'script' ? Engine.shuffle(turn.o).map((o) => ({ gu: R(o[0]), tr: R(o[1]), en: o[2], o })) : (C.sugg || []);
      C.cur = sugg;
      comp.innerHTML = `${turn ? `<p class="task">${icon('chevron')} ${esc(turn.you)}</p>` : C.mode === 'ai' ? '<p class="task">Say anything — in Gujarati, or English if you’re stuck.</p>' : ''}
        <div class="sugg">${sugg.map((s, i) => `<button class="sugg-chip" data-s="${i}" type="button"><span lang="gu">${esc(s.gu)}</span><small>${esc(s.tr)}</small></button>`).join('')}</div>
        <div class="free">
          <button class="mic mic-sm" type="button" aria-label="Speak your reply">${icon('mic')}<span class="mic-ring"></span></button>
          <input id="free-in" autocomplete="off" autocapitalize="off" placeholder="Type in ગુજરાતી or phonetically (kem chho)" aria-label="Your reply">
          <button class="btn btn-primary btn-sm" data-send type="button">Send</button>
        </div><div class="free-prev" lang="gu"></div>`;
      const inp = $('#free-in', comp), prev = $('.free-prev', comp);
      inp.addEventListener('input', () => { prev.textContent = /[a-z]/i.test(inp.value) && !GU.hasGu(inp.value) ? '→ ' + GU.phonetic(inp.value) : ''; });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(inp.value, 'typed'); });
    }
    async function send(text, how, chosen) {
      text = String(text || '').trim(); if (!text || C.busy) return;
      const gu = GU.hasGu(text) ? text : GU.phonetic(text);
      if (how !== 'tap') { Store.s.stats.spoken += how === 'spoken' ? 1 : 0; }
      if (C.mode === 'ai') return aiTurn(gu, text);
      const turn = sc.turns[C.i];
      let ok = false, fb;
      if (chosen) {
        ok = !!chosen.o[3];
        fb = ok ? { kind: 'ok', html: `${icon('check')} ${esc(chosen.o[4] || 'Natural!')}` } : { kind: 'bad', html: `${icon('x')} ${esc(chosen.o[4])}` };
        C.log.push({ role: 'you', gu: chosen.gu, tr: chosen.tr, state: ok ? 'ok' : 'bad', fb });
        Store.skillHit('grammar', ok);
      } else {
        const hits = turn.keys.filter((grp) => grp.some((k) => GU.norm(gu).includes(k) || GU.loose(gu).includes(GU.loose(k)))).length;
        ok = hits >= Math.ceil(turn.keys.length * 0.6);
        // Compare against the scene's known right and wrong replies, so a classic mistake isn't waved through.
        const simTo = (o) => GU.sim(GU.loose(gu).replace(/ /g, ''), GU.loose(R(o[0])).replace(/ /g, ''));
        const rank = (arr) => arr.map((o) => [o, simTo(o)]).sort((a, b) => b[1] - a[1])[0] || [null, 0];
        const [best, bestS] = rank(turn.o.filter((o) => o[3]));
        const [worst, worstS] = rank(turn.o.filter((o) => !o[3]));
        let why = '';
        if (worst && worstS > 0.7 && worstS > bestS) { ok = false; why = worst[4]; }
        else if (ok && bestS < 0.95) {
          const tag = GU.diagnose(gu, R(best[0]));
          if (['dative', 'ergative', 'respect'].includes(tag)) { ok = false; why = GU.TAGS[tag].why; }
        }
        fb = ok ? { kind: 'ok', html: `${icon('check')} Understood! ${bestS > 0.9 ? 'Natural.' : `A natural way to say it: <span lang="gu">${esc(R(best[0]))}</span>`}` }
          : { kind: 'bad', html: `${icon('x')} ${why ? esc(why) + ' ' : 'Not quite what the scene needs. '}${C.fails >= 1 || why ? `Try: <span lang="gu">${esc(R(best[0]))}</span> (${esc(R(best[1]))})` : 'Tap a suggestion for help, or try again.'}` };
        C.log.push({ role: 'you', gu, tr: GU.hasGu(text) ? '' : text, state: ok ? 'ok' : 'bad', fb });
        Store.skillHit(how === 'spoken' ? 'speaking' : 'writing', ok);
      }
      Store.save();
      if (ok) { Sfx.good(); C.i++; draw(); setTimeout(advance, 500); }
      else { Sfx.bad(); C.fails++; draw(); Store.addMistake({ item: null, ex: 'convo', skill: 'grammar', prompt: turn.you, given: chosen ? chosen.gu : gu, expected: R(turn.o.find((o) => o[3])[0]), tag: GU.diagnose(chosen ? chosen.gu : gu, R(turn.o.find((o) => o[3])[0])), why: chosen ? chosen.o[4] : '' }); }
    }
    async function aiTurn(gu, raw) {
      if (gu) C.log.push({ role: 'you', gu, tr: GU.hasGu(raw) ? '' : raw });
      C.busy = true; draw();
      try {
        const hist = C.log.map((m) => ({ role: m.role, gu: m.gu }));
        const r = await AI.turn({ scenario: sc, who: sc.who, history: hist });
        C.busy = false;
        const me = gu ? C.log[C.log.length - 1] : null;
        if (me && r.feedback && r.feedback.verdict !== 'none') {
          const k = r.feedback.verdict === 'great' ? 'ok' : r.feedback.verdict === 'ok' ? 'mid' : 'bad';
          me.state = k === 'bad' ? 'bad' : 'ok';
          me.fb = { kind: k, html: `${k === 'ok' ? icon('check') : icon('spark')} ${esc(r.feedback.note_en)}${r.feedback.better_gu ? `<span class="better"><span lang="gu">${esc(r.feedback.better_gu)}</span> <small>${esc(r.feedback.better_tr)}</small></span>` : ''}` };
          Store.skillHit('speaking', k !== 'bad', 0.5);
        }
        npcSay(r.reply_gu, r.reply_tr, r.reply_en);
        C.sugg = (r.suggestions || []).slice(0, 3);
        if (r.done) toast('The scene reached a natural ending — keep going or try another scene.');
        composer();
      } catch (e) {
        C.busy = false; draw();
        comp.insertAdjacentHTML('afterbegin', `<p class="err">${icon('alert')} ${esc(e.message)}</p>`);
      }
      Store.save();
    }

    root.addEventListener('click', async (e) => {
      const m = e.target.closest('[data-mode]');
      if (m) {
        if (m.dataset.mode === 'ai' && !AI.ready()) { toast('Add a Claude API key in Settings to use free conversation.'); return; }
        C.mode = m.dataset.mode;
        $$('.scene-h .seg', root).forEach((x) => x.classList.toggle('on', x.dataset.mode === C.mode));
        if (C.mode === 'ai') { C.sugg = null; if (!C.log.length) aiTurn('', ''); else composer(); }
        else { C = null; App.render(); }
        return;
      }
      if (e.target.closest('[data-restart]')) { C = null; App.render(); return; }
      const sg = e.target.closest('[data-s]');
      if (sg) { const s = C.cur[+sg.dataset.s]; Speech.say(s.gu); return send(s.gu, 'tap', C.mode === 'script' ? s : null); }
      if (e.target.closest('[data-send]')) { const inp = $('#free-in', root); send(inp.value, 'typed'); return; }
      const mic = e.target.closest('.composer .mic');
      if (mic) {
        if (!Speech.canListen) { toast('Speech recognition needs Chrome or Edge. Type your reply, or tap a suggestion and say it aloud.'); return; }
        mic.classList.add('live');
        const r = await Speech.listen({ onInterim: (t) => ($('#free-in', root).value = t) });
        mic.classList.remove('live');
        if (r.error) { toast(r.error === 'not-allowed' ? 'Microphone access is blocked for this page.' : 'Didn’t catch that — try again.'); return; }
        const t = GU.hasGu(r.alts[0].t) ? r.alts[0].t : GU.fromDeva(r.alts[0].t);
        send(t, 'spoken');
      }
    });

    draw();
    if (C.done) endScene();
    else if (C.mode === 'ai') composer();
    else if (!C.log.length) advance();
    else composer();
  }

  /* ─────────────── Home Gujarati ─────────────── */
  let homeSit = 'All';
  function homeGujarati() {
    const list = HOME.filter((h) => homeSit === 'All' || h.sit === homeSit);
    return `<div class="homeg"><header class="page-h"><h1>Home Gujarati</h1><p class="muted">What your family actually says — in three registers. <b>Textbook</b> is correct but stiff. <b>Natural</b> is everyday speech. <b>Very casual</b> is for siblings and friends.</p></header>
      <div class="filter-row">${['All', ...HOME_SITS].map((s) => `<button class="pill ${s === homeSit ? 'on' : ''}" data-sit="${esc(s)}" type="button">${esc(s)}</button>`).join('')}</div>
      <div class="row between"><p class="muted small">${list.length} phrases</p><button class="btn btn-primary" data-practice-home type="button">${icon('mic')} Practice this set</button></div>
      <div class="phrase-list">${list.map((h) => `<article class="phrase"><h3>${esc(h.en)}</h3>
        ${[['t', 'Textbook', h.t], ['n', 'Natural', h.n], ['c', 'Very casual', h.c]].map(([k, lbl, v]) => `<div class="ph-row ph-${k}"><span class="reg-lbl reg-${k}">${lbl}</span><button class="say-btn sm" data-say="${esc(R(v[0]))}" type="button" aria-label="Play">${icon('speaker')}</button><div><span lang="gu" class="gu-inline">${esc(R(v[0]))}</span><span class="tr">${esc(R(v[1]))}</span></div></div>`).join('')}
        <p class="ph-note">${esc(h.note)}</p></article>`).join('')}</div></div>`;
  }
  function bindHomeG(root) {
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sit]'); if (s) { homeSit = s.dataset.sit; return App.render(); }
      if (e.target.closest('[data-practice-home]')) {
        const list = Engine.pickN(HOME.filter((h) => homeSit === 'All' || h.sit === homeSit), 6);
        const { steps } = Engine.buildHome(list);
        Player.start({ title: 'Home Gujarati practice', steps, xpBase: 6 });
      }
    });
  }

  /* ─────────────── Script ─────────────── */
  function script() {
    return `<div class="script-page"><header class="page-h"><h1>Read & write Gujarati</h1><p class="muted">Letters first, then vowel signs, then joined letters. Transliteration fades as you go — the goal is to read without it.</p></header>
      <div class="script-grid">${SCRIPT.map((u, i) => { const d = (Store.s.script[u.id] || {}).done; return `<button class="script-unit ${d ? 'done' : ''}" data-script="${u.id}" type="button"><span class="su-n">${GU.num(i + 1)}</span><span class="su-glyphs" lang="gu">${esc(u.gu)}</span><b>${esc(u.title)}</b><small>${u.letters.length} ${u.kind === 'numeral' ? 'numerals' : u.kind === 'matra' ? 'signs' : 'letters'}</small>${d ? `<span class="chip chip-ok">${icon('check')}</span>` : ''}</button>`; }).join('')}</div>
      <h3 class="sec-h">Alphabet chart</h3><p class="muted small">Tap any letter to hear an example word.</p>
      <div class="chart">${SCRIPT.filter((u) => ['vowel', 'consonant'].includes(u.kind)).flatMap((u) => u.letters).map((l) => `<button class="ch-cell" data-say="${esc(l[2])}" type="button" title="${esc(l[1])} — ${esc(l[2])} (${esc(l[4])})"><span lang="gu">${esc(l[0])}</span><small>${esc(l[1].split(' ')[0])}</small></button>`).join('')}</div></div>`;
  }
  function bindScript(root) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-script]'); if (!b) return;
      const u = SCRIPT.find((x) => x.id === b.dataset.script);
      const { steps } = Engine.buildScript(u);
      Player.start({ title: u.title, steps, xpBase: 6, onFinish({ acc }) { Store.s.script[u.id] = { done: true, best: acc, t: Date.now() }; Store.save(); return { title: `${u.title} complete` }; } });
    });
  }

  /* ─────────────── Words ─────────────── */
  let wFilter = 'all', wQuery = '';
  function words() {
    const reached = new Set(Course.lessons.filter((l) => Course.status(l) !== 'locked').map((l) => l.id));
    const list = Object.values(Course.items).filter((i) => i.kind === 'w' && (Store.s.srs[i.id] || reached.has(i.lesson)));
    const counts = { new: 0, learning: 0, familiar: 0, mastered: 0, review: 0 };
    list.forEach((i) => counts[Store.itemState(i.id)]++);
    const q = wQuery.toLowerCase();
    const shown = list.filter((i) => (wFilter === 'all' || Store.itemState(i.id) === wFilter) && (!q || i.en.toLowerCase().includes(q) || Course.gu(i).includes(wQuery) || GU.normLatin(Course.tr(i)).includes(GU.normLatin(q))));
    const L = { new: 'New', learning: 'Learning', familiar: 'Familiar', mastered: 'Mastered', review: 'Needs review' };
    return `<div class="words"><header class="page-h"><h1>My words</h1><p class="muted">Every word moves from <b>New</b> to <b>Mastered</b> as you get it right over days and weeks. Misses bring a word back sooner.</p></header>
      <div class="filter-row"><button class="pill ${wFilter === 'all' ? 'on' : ''}" data-wf="all" type="button">All ${list.length}</button>${Object.entries(L).map(([k, t]) => `<button class="pill pill-${k} ${wFilter === k ? 'on' : ''}" data-wf="${k}" type="button">${t} ${counts[k]}</button>`).join('')}</div>
      <input class="search" id="w-search" type="search" placeholder="Search English, ગુજરાતી or transliteration" value="${esc(wQuery)}" aria-label="Search words">
      <ul class="word-list">${shown.map((i) => { const st = Store.itemState(i.id); return `<li><button class="say-btn sm" data-say="${esc(Course.gu(i))}" type="button" aria-label="Play">${icon('speaker')}</button><span lang="gu" class="gu-inline">${esc(Course.gu(i))}</span><span class="tr">${esc(Course.tr(i))}</span><span class="wl-en">${esc(i.en)}</span><span class="state st-${st}">${L[st]}</span>${dots(Store.strength(i.id), 5, 'dots-sm')}</li>`; }).join('') || '<li class="empty">No words match. Clear the filter or the search.</li>'}</ul></div>`;
  }
  function bindWords(root) {
    root.addEventListener('click', (e) => { const f = e.target.closest('[data-wf]'); if (f) { wFilter = f.dataset.wf; App.render(); } });
    const s = $('#w-search', root);
    s.addEventListener('input', () => { wQuery = s.value; const pos = s.selectionStart; App.render(); const n = $('#w-search'); n.focus(); n.setSelectionRange(pos, pos); });
  }

  /* ─────────────── Mistakes ─────────────── */
  function mistakes() {
    const all = Store.s.mistakes;
    const open = all.filter((m) => !m.fixed);
    const tags = {}; open.forEach((m) => (tags[m.tag] = (tags[m.tag] || 0) + 1));
    const sorted = Object.entries(tags).sort((a, b) => b[1] - a[1]);
    const max = sorted.length ? sorted[0][1] : 1;
    return `<div class="mistakes"><header class="page-h"><h1>My mistakes</h1><p class="muted">Mistakes are the fastest way to learn. Here are the patterns in yours — answer an item correctly in review and it’s marked fixed.</p></header>
      <div class="mk-top"><div class="card mk-stat"><b>${open.length}</b><span>to fix</span></div><div class="card mk-stat"><b>${Store.s.stats.fixed}</b><span>fixed</span></div>
        <button class="btn btn-primary btn-lg" data-fix type="button" ${open.length ? '' : 'disabled'}>${icon('refresh')} Practice my mistakes</button></div>
      ${sorted.length ? `<section class="card"><h3>Patterns</h3><ul class="patterns">${sorted.map(([t, n]) => { const T = GU.TAGS[t] || { label: t, why: '' }; return `<li><div class="row between"><b>${esc(T.label)}</b><span class="num">${n}</span></div>${bar(n / max)}<p class="small muted">${esc(T.why)}</p></li>`; }).join('')}</ul></section>` : ''}
      <section class="card"><h3>Recent</h3>${all.length ? `<ul class="mk-list">${all.slice(0, 40).map((m) => `<li class="${m.fixed ? 'fixed' : ''}"><div class="mk-row"><span class="mk-given" lang="gu">${esc(m.given || '—')}</span>${icon('arrow')}<span class="mk-exp" lang="gu">${esc(m.expected)}</span></div><div class="mk-meta"><span class="chip">${esc((GU.TAGS[m.tag] || {}).label || m.tag || '')}</span>${m.fixed ? `<span class="chip chip-ok">${icon('check')} fixed</span>` : ''}<span class="small muted">${new Date(m.t).toLocaleDateString()}</span></div></li>`).join('')}</ul>` : '<p class="muted">No mistakes yet. They’ll show up here — and that’s a good thing.</p>'}</section></div>`;
  }
  function bindMistakes(root) {
    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-fix]')) return;
      const { steps, tuned } = Engine.buildMistakes();
      Player.start({ title: 'Fixing mistakes', steps, tuned, xpBase: 8 });
    });
  }

  /* ─────────────── Me / progress ─────────────── */
  function me() {
    const SK = { speaking: 'Speaking', listening: 'Listening', reading: 'Reading', writing: 'Writing', vocab: 'Vocabulary', grammar: 'Grammar' };
    const done = Course.lessons.filter((l) => (Store.s.lessons[l.id] || {}).done);
    const learned = Object.keys(Store.s.srs).filter((id) => Course.items[id] && ['familiar', 'mastered'].includes(Store.itemState(id))).length;
    const days = Array.from({ length: 14 }, (_, i) => { const t = Date.now() - (13 - i) * Store.DAY; return { k: Store.dayKey(t), x: Store.s.xp.days[Store.dayKey(t)] || 0, d: new Date(t) }; });
    const maxX = Math.max(P().goal, ...days.map((d) => d.x));
    const lv = LEVEL_NAMES[Course.current().level];
    return `<div class="me"><header class="me-h"><div class="me-av">${esc((P().name || 'You')[0].toUpperCase())}</div><div><h1>${esc(P().name || 'Your progress')}</h1><p class="muted">Level ${Course.current().level} · ${esc(lv.title)} <span lang="gu">(${esc(lv.gu)})</span></p></div><a class="icon-btn" href="#/settings" aria-label="Settings">${icon('gear')}</a></header>
      <div class="stat-row"><div class="card"><b>${Store.streakNow()}</b><span>day streak</span><small>best ${Store.s.streak.best}</small></div><div class="card"><b>${learned}</b><span>words & phrases known</span></div><div class="card"><b>${Store.s.stats.spoken}</b><span>lines spoken</span></div><div class="card"><b>${Store.s.xp.total}</b><span>total XP</span></div></div>
      <section class="card"><h3>Your Gujarati skills</h3><p class="small muted">Based on your recent answers in each skill — not on XP.</p>
        <ul class="skills">${Object.entries(SK).map(([k, t]) => { const s = Store.skill(k); return `<li><span class="sk-t">${t}</span>${bar(s.a ? s.ema : 0, 'bar-lg')}<span class="num">${s.a ? Math.round(s.ema * 100) + '%' : '—'}</span><small>${s.a} answers</small></li>`; }).join('')}</ul></section>
      <section class="card"><h3>Last 14 days</h3><div class="spark">${days.map((d) => `<div class="sp-col" title="${d.k}: ${d.x} XP"><i style="height:${(d.x / maxX) * 100}%" class="${d.x >= P().goal ? 'goal' : ''}"></i><span>${'SMTWTFS'[d.d.getDay()]}</span></div>`).join('')}<div class="sp-goal" style="bottom:${(P().goal / maxX) * 100}%"><span>goal</span></div></div></section>
      <section class="card"><h3>What you can do in Gujarati</h3>${done.length ? `<ul class="can-list">${done.slice(-12).reverse().map((l) => `<li>${icon('check')}<span>${esc(l.can)}</span></li>`).join('')}</ul>` : '<p class="muted">Finish a lesson and your first “can do” appears here.</p>'}</section>
      <section class="card"><h3>Achievements</h3><div class="ach-grid">${ACHIEVEMENTS.map((a) => `<div class="ach ${Store.s.ach[a.id] ? 'on' : ''}">${icon('trophy')}<b lang="gu">${esc(a.title)}</b><span>${esc(a.en)}</span><small>${esc(a.desc)}</small></div>`).join('')}</div></section>
    </div>`;
  }

  /* ─────────────── Settings ─────────────── */
  function settings() {
    const st = Store.s.settings;
    const vs = Speech.voices.slice().sort((a, b) => (/^gu/.test(b.lang) - /^gu/.test(a.lang)) || (/^hi/.test(b.lang) - /^hi/.test(a.lang)));
    const srv = Speech.server || Speech.pack;
    const how = Speech.server ? 'made on your Mac by the local server and cached' : 'pre-recorded for every phrase in the course';
    const vmsg = srv ? ['ok', srv.lang === 'gu_IN' ? `Real audio from a Gujarati voice (${srv.voice}), ${how}.` : `Real audio from the ${srv.voice} voice, ${how}. It’s a Hindi voice reading the Gujarati (the scripts map letter for letter) — close, but not native, especially ળ and some vowels.`] : { gu: ['ok', 'Native Gujarati voice.'], hi: ['mid', 'No Gujarati voice on this device, so a Hindi voice reads the Gujarati (the scripts map letter-for-letter). Close, but not perfect — especially ળ and some vowels. On Android/ChromeOS, install Google’s Gujarati voice for native audio.'], none: ['bad', 'No voice available. Audio buttons won’t play; transliteration stays visible.'], other: ['mid', 'This voice isn’t Gujarati or Hindi, so pronunciation will be off.'] }[Speech.mode];
    return `<div class="settings"><header class="page-h"><h1>Settings</h1></header>
      <section class="card"><h3>You</h3>
        <label class="field"><span>Name</span><input id="s-name" value="${esc(P().name)}"></label>
        <div class="field"><span>Your verb forms</span><div class="seg-row"><button class="seg ${P().form === 'm' ? 'on' : ''}" data-set="form:m" type="button"><span lang="gu">હું ગયો</span> masculine</button><button class="seg ${P().form === 'f' ? 'on' : ''}" data-set="form:f" type="button"><span lang="gu">હું ગઈ</span> feminine</button></div></div>
        <div class="field"><span>Daily goal</span><div class="seg-row">${[15, 30, 50, 80].map((g) => `<button class="seg ${P().goal === g ? 'on' : ''}" data-set="goal:${g}" type="button">${g} XP</button>`).join('')}</div></div></section>
      <section class="card"><h3>Reading support</h3>
        <div class="field"><span>Transliteration</span><div class="seg-row">${[['auto', 'Auto-fade'], ['full', 'Always show'], ['hint', 'Tap to reveal']].map(([k, t]) => `<button class="seg ${st.translit === k ? 'on' : ''}" data-set="translit:${k}" type="button">${t}</button>`).join('')}</div>
        <p class="small muted">Auto-fade hides transliteration for words you know well once your reading score is strong — the goal is to read ગુજરાતી on its own.</p></div></section>
      <section class="card"><h3>Voice & speech</h3>
        <label class="field"><span>${srv ? 'Browser voice (backup only)' : 'Voice'}</span><select id="s-voice"><option value="">Automatic</option>${vs.map((v) => `<option value="${esc(v.voiceURI)}" ${st.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></label>
        <p class="status st-${vmsg[0]}">${esc(vmsg[1])}</p>
        <div class="row"><button class="btn btn-ghost btn-sm" data-say="નમસ્તે, તમે કેમ છો?" type="button">${icon('speaker')} Test voice</button>
        <label class="field inline"><span>Speed</span><input id="s-rate" type="range" min="0.7" max="1.2" step="0.05" value="${st.rate}"></label></div>
        <p class="status st-${Speech.canListen ? 'ok' : 'mid'}">${Speech.canListen ? 'Speech recognition available (uses your browser’s Gujarati recognizer, needs internet).' : 'Speech recognition isn’t available in this browser. Speaking exercises use record-and-compare instead. Chrome or Edge on desktop/Android support Gujarati recognition.'}</p>
        <label class="toggle"><input type="checkbox" id="s-sound" ${st.sound ? 'checked' : ''}><span>Sound effects</span></label></section>
      <section class="card"><h3>${icon('spark')} AI tutor (optional)</h3>
        <p class="small muted">Powers free conversation and “explain my mistake”. Uses your own Anthropic API key, stored only in this browser and sent only to Anthropic. Everything else works without it.</p>
        <label class="field"><span>Anthropic API key</span><input id="s-key" type="password" autocomplete="off" value="${esc(st.apiKey)}" placeholder="sk-ant-…"></label>
        <label class="field"><span>Model</span><select id="s-model">${[['claude-opus-5-5', 'Claude Opus 5.5 (best quality)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (faster, cheaper)'], ['claude-haiku-4-5', 'Claude Haiku 4.5 (fastest)']].map(([k, t]) => `<option value="${k}" ${st.model === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <div class="row"><button class="btn btn-ghost btn-sm" data-ai-test type="button">Test connection</button><span class="ai-status small"></span></div></section>
      <section class="card"><h3>Appearance</h3><div class="seg-row">${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, t]) => `<button class="seg ${st.theme === k ? 'on' : ''}" data-set="theme:${k}" type="button">${t}</button>`).join('')}</div></section>
      <section class="card"><h3>Your data</h3><p class="small muted">Progress is saved in this browser. Export it to move devices.</p>
        <div class="row"><button class="btn btn-ghost btn-sm" data-export type="button">Export progress</button><label class="btn btn-ghost btn-sm" for="s-import">Import progress<input id="s-import" type="file" accept="application/json" hidden></label><button class="btn btn-danger btn-sm" data-reset type="button">Reset everything</button></div>
        <div class="confirm-inline" hidden><p>This deletes all progress on this device. Export first if you might want it back.</p><div class="row"><button class="btn btn-ghost btn-sm" data-reset-no type="button">Keep my progress</button><button class="btn btn-danger btn-sm" data-reset-yes type="button">Delete everything</button></div></div></section>
      <p class="small muted center">Bolo · Gujarati content reviewed for natural family usage. Regional forms are marked where they differ.</p></div>`;
  }
  function bindSettings(root) {
    const st = Store.s.settings;
    root.addEventListener('click', async (e) => {
      const s = e.target.closest('[data-set]');
      if (s) { const [k, v] = s.dataset.set.split(':'); if (k === 'form') P().form = v; else if (k === 'goal') P().goal = +v; else st[k] = v; Store.save(); App.applyTheme(); return App.render(); }
      if (e.target.closest('[data-export]')) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([Store.exportJSON()], { type: 'application/json' })); a.download = `bolo-progress-${Store.today()}.json`; a.click(); return; }
      if (e.target.closest('[data-reset]')) { $('.confirm-inline', root).hidden = false; return; }
      if (e.target.closest('[data-reset-no]')) { $('.confirm-inline', root).hidden = true; return; }
      if (e.target.closest('[data-reset-yes]')) { Store.reset(); Object.assign(OB, { step: 'welcome', why: [], background: '', form: 'm', name: '', goal: 30 }); location.hash = '#/welcome'; return App.render(); }
      if (e.target.closest('[data-ai-test]')) {
        const out = $('.ai-status', root); out.textContent = 'Testing…';
        try { await AI.test(); out.textContent = '✓ Connected'; out.className = 'ai-status small ok'; } catch (err) { out.textContent = err.message; out.className = 'ai-status small err'; }
      }
    });
    $('#s-name', root).addEventListener('change', (e) => { P().name = e.target.value.trim(); Store.save(); });
    $('#s-voice', root).addEventListener('change', (e) => { st.voiceURI = e.target.value; Store.save(); Speech.repick(); App.render(); });
    $('#s-rate', root).addEventListener('change', (e) => { st.rate = +e.target.value; Store.save(); });
    $('#s-sound', root).addEventListener('change', (e) => { st.sound = e.target.checked; Store.save(); });
    $('#s-key', root).addEventListener('change', (e) => { st.apiKey = e.target.value.trim(); Store.save(); });
    $('#s-model', root).addEventListener('change', (e) => { st.model = e.target.value; Store.save(); });
    $('#s-import', root).addEventListener('change', async (e) => { try { Store.importJSON(await e.target.files[0].text()); toast('Progress imported.'); App.render(); } catch (err) { toast('That file couldn’t be read as Bolo progress.'); } });
  }

  function notFound() { return `<div class="page-h"><h1>Not found</h1><p><a href="#/home">Go home</a></p></div>`; }

  return {
    onboarding, bindOnboarding, home, bindQuick, path, bindPath, lesson, bindLesson, practice, talkList, talkScene, bindScene,
    homeGujarati, bindHomeG, script, bindScript, words, bindWords, mistakes, bindMistakes, me, settings, bindSettings, startReview, startSkill, startLesson, OB,
  };
})();
