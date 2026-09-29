/* Bolo — optional AI tutor (Claude). Uses the learner's own API key, stored only in this browser. */

const AI = (() => {
  let client = null, clientKey = null;
  const ready = () => !!Store.s.settings.apiKey;

  async function getClient() {
    const key = Store.s.settings.apiKey;
    if (client && clientKey === key) return client;
    const mod = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.129.0/+esm');
    const Anthropic = mod.default || mod.Anthropic;
    client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
    clientKey = key;
    return client;
  }

  const model = () => Store.s.settings.model || 'claude-opus-5-5';
  function params(extra) {
    const m = model();
    const p = Object.assign({ model: m, max_tokens: 4000 }, extra);
    if (/opus-5|sonnet-5-5|fable/.test(m)) { p.betas = ['server-side-fallback-2026-07-01']; p.fallbacks = 'default'; }
    if (!/haiku/.test(m)) p.output_config = Object.assign({ effort: 'low' }, p.output_config || {});
    return p;
  }
  async function create(p) {
    const c = await getClient();
    let res;
    try { res = p.betas ? await c.beta.messages.create(p) : await c.messages.create(p); }
    catch (e) {
      // If an optional feature (fallbacks, effort) is rejected, retry once with a plain request.
      if (e && e.status === 400 && (p.betas || (p.output_config && p.output_config.effort))) {
        const q = Object.assign({}, p); delete q.betas; delete q.fallbacks;
        if (q.output_config) { q.output_config = Object.assign({}, q.output_config); delete q.output_config.effort; if (!Object.keys(q.output_config).length) delete q.output_config; }
        res = await c.messages.create(q);
      } else throw e;
    }
    if (res.stop_reason === 'refusal') throw new Error('The tutor declined this one. Try rephrasing.');
    const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (!text) throw new Error('The tutor returned an empty reply.');
    return text;
  }
  const humanError = (e) => {
    const m = String((e && e.message) || e);
    if (/401|authentication|invalid x-api-key/i.test(m)) return new Error('That API key was rejected. Check it in Settings.');
    if (/429|rate/i.test(m)) return new Error('Too many requests right now — wait a moment and try again.');
    if (/Failed to fetch|NetworkError|import/i.test(m)) return new Error('Couldn’t reach the tutor. Check your internet connection.');
    return new Error(m.slice(0, 200));
  };

  const LEARNER = () => {
    const known = Object.keys(Store.s.srs).map((id) => Course.items[id]).filter(Boolean).slice(-80).map((i) => Course.gu(i)).join(', ');
    const p = Store.s.profile;
    return `Learner: heritage/second-language learner of Gujarati, course level ${p.level} of 6 (1 = beginner, 6 = fluent). Speaks with ${p.form === 'f' ? 'feminine' : 'masculine'} first-person forms (e.g. ${p.form === 'f' ? 'હું ગઈ' : 'હું ગયો'}). Goal: speak naturally with family. Words they have practiced: ${known || 'very few so far'}.`;
  };
  const TRANSLIT = 'Transliteration scheme: ā ī ū long vowels; ṭ ṭh ḍ ḍh ṇ ḷ retroflex; ṁ nasal; ch = ચ, chh = છ, sh = શ, f = ફ. Example: તમે કેમ છો? = tame kem chho?';

  const TURN_SCHEMA = {
    type: 'object', additionalProperties: false,
    required: ['reply_gu', 'reply_tr', 'reply_en', 'feedback', 'suggestions', 'done'],
    properties: {
      reply_gu: { type: 'string' }, reply_tr: { type: 'string' }, reply_en: { type: 'string' },
      feedback: { type: 'object', additionalProperties: false, required: ['verdict', 'better_gu', 'better_tr', 'note_en'],
        properties: { verdict: { type: 'string', enum: ['great', 'ok', 'fix', 'none'] }, better_gu: { type: 'string' }, better_tr: { type: 'string' }, note_en: { type: 'string' } } },
      suggestions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['gu', 'tr', 'en'], properties: { gu: { type: 'string' }, tr: { type: 'string' }, en: { type: 'string' } } } },
      done: { type: 'boolean' },
    },
  };

  /* One conversation turn. history: [{role:'npc'|'you', gu, en}] */
  async function turn({ scenario, who, history }) {
    const ch = CHARACTERS[who] || CHARACTERS.friend;
    const system = `You are role-playing ${ch.name} (${ch.role}) in a Gujarati conversation-practice app, in this scene: "${scenario.title}" — ${scenario.where}. Scene goal for the learner: ${scenario.goal}
Speak ONLY natural, everyday spoken Gujarati as a real Gujarati family member or community member would — not textbook or word-for-word translations from English. Common Gujlish (ફોન, ટાઇમ, ટેન્શન) is fine where real speakers use it. Address the learner with the pronoun ${['ba', 'dada', 'nani', 'mummy', 'pappa', 'masi', 'aunty', 'uncle', 'bhai', 'cousin'].includes(who) ? 'તું (you are family / an elder)' : 'તમે (polite)'}.
Keep each reply to 1–2 short sentences at the learner's level, and end with something the learner can respond to. Never invent words; if unsure of a regional form, use the standard form.
${LEARNER()}
${TRANSLIT}
For "feedback": judge ONLY the learner's latest message. verdict "great" if natural and correct, "ok" if understandable but improvable, "fix" if wrong or unnatural, "none" if there is no learner message yet. better_gu/better_tr = the most natural way to say what they meant (empty if great). note_en = one short, kind sentence explaining the fix (grammar, register, or word choice). If the learner wrote English or Latin letters, understand them and give the Gujarati in better_gu.
"suggestions": 2 short, natural replies the learner could say next, suited to their level. Set "done" to true when the scene has reached a natural ending (after about 6–8 exchanges).`;
    const messages = [];
    const lines = history.map((h) => `${h.role === 'npc' ? ch.name : 'Learner'}: ${h.gu}`).join('\n');
    messages.push({ role: 'user', content: `Conversation so far:\n${lines || '(no messages yet — open the scene)'}\n\nWrite ${ch.name}'s next turn as JSON.` });
    try {
      const text = await create(params({ system, messages, output_config: { format: { type: 'json_schema', schema: TURN_SCHEMA } } }));
      return JSON.parse(text);
    } catch (e) { throw humanError(e); }
  }

  async function explain({ prompt, given, expected, tag }) {
    const system = `You are a warm, precise Gujarati tutor. Explain in plain English (max 3 short sentences) why the learner's answer is wrong and how to remember the right form. Quote Gujarati in script with transliteration in brackets. Never invent grammar; if both forms are acceptable in some dialects, say so. ${TRANSLIT}`;
    try {
      return await create(params({ system, messages: [{ role: 'user', content: `Exercise: ${prompt || '(Gujarati exercise)'}\nCategory: ${tag}\nLearner answered: ${given}\nCorrect answer: ${expected}` }], max_tokens: 2000 }));
    } catch (e) { throw humanError(e); }
  }

  async function test() {
    try { await create(params({ messages: [{ role: 'user', content: 'Reply with the single Gujarati word: નમસ્તે' }], max_tokens: 1000 })); return true; }
    catch (e) { throw humanError(e); }
  }

  return { ready, turn, explain, test };
})();
