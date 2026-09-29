/* Bolo — audio: text-to-speech, speech recognition, self-recording, sound effects. */

const Speech = (() => {
  const synth = window.speechSynthesis;
  let voices = [];
  let chosen = null;
  let mode = 'none'; // 'gu' native Gujarati voice · 'hi' Hindi voice reading converted script · 'none'
  const listeners = new Set();

  function load() {
    if (!synth) return;
    voices = synth.getVoices();
    pick();
    listeners.forEach((f) => f());
  }
  function pick() {
    const pref = Store.s.settings.voiceURI;
    const byURI = pref && voices.find((v) => v.voiceURI === pref);
    const gu = voices.find((v) => /^gu/i.test(v.lang));
    const hi = voices.find((v) => /^hi/i.test(v.lang));
    chosen = byURI || gu || hi || null;
    mode = !chosen ? 'none' : /^gu/i.test(chosen.lang) ? 'gu' : /^hi/i.test(chosen.lang) ? 'hi' : 'other';
  }
  if (synth) { load(); synth.onvoiceschanged = load; setTimeout(load, 400); }

  let current = null;      // keep a reference so Chrome doesn't garbage-collect the utterance mid-speech
  let stalled = false;     // set when the browser accepts speech but never plays it
  const stallListeners = new Set();
  const markStall = () => { if (!stalled) { stalled = true; stallListeners.forEach((f) => f()); } };

  /* Preferred audio sources, in order:
     1. the local server (serve.py) making clips with the Mac's voices on demand;
     2. a pre-recorded pack shipped with the website (audio/index.json + one clips file). */
  let server = null;       // { voice, lang } when /tts is available
  let pack = null;         // { voice, lang, file, clips: { hash: [offset, length] } }
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const serverReady = (isLocal ? fetch('/tts/ok', { cache: 'no-store' }) : Promise.reject(new Error('no local server'))).then((r) => (r.ok ? r.json() : null)).then((j) => { server = j; listeners.forEach((f) => f()); return j; }).catch(() => null);
  const packReady = serverReady.then((srv) => (srv ? null : fetch('audio/index.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)))
    .then((j) => { pack = j; if (j) listeners.forEach((f) => f()); return j; });

  const fnv = (str) => { let h = 0x811c9dc5; for (const b of new TextEncoder().encode(str)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  const clipCache = new Map();
  const wholePacks = {};
  async function clipURL(text) {
    await packReady;
    if (!pack) return null;
    const h = fnv(text), c = pack.clips[h];
    if (!c) return null;
    if (clipCache.has(h)) return clipCache.get(h);
    const [f, off, len] = c, file = 'audio/' + pack.files[f];
    let b64;
    if (wholePacks[f]) b64 = (await wholePacks[f]).slice(off, off + len);
    else {
      const r = await fetch(file, { headers: { Range: `bytes=${off}-${off + len - 1}` } });
      if (r.status === 206) b64 = await r.text();
      else { wholePacks[f] = r.text(); b64 = (await wholePacks[f]).slice(off, off + len); }
    }
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mp4' }));
    clipCache.set(h, url);
    return url;
  }

  // One reusable <audio> element, unlocked on the first tap so phones allow later playback.
  const player = new Audio();
  player.preload = 'auto';
  const unlock = () => {
    player.muted = true;
    player.src = 'data:audio/mp4;base64,AAAAHGZ0eXBNNEEgAAAAAE00QSBtcDQyaXNvbQAAA0Ztb292AAAAbG12aGQAAAAA5uG3iubht4oAAFYiAAAUAAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAB2HRyYWsAAABcdGtoZAAAAAfm4beK5uG3igAAAAEAAAAAAAAUAAAAAAAAAAAAAAAAAAEAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAXRtZGlhAAAAIG1kaGQAAAAA5uG3iubht4oAAFYiAAAUAAAAAAAAAAAiaGRscgAAAAAAAAAAc291bgAAAAAAAAAAAAAAAAAAAAABKm1pbmYAAAAQc21oZAAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAAA7nN0YmwAAAB2c3RzZAAAAAAAAAABAAAAZm1wNGEAAAAAAAAAAQAAAAAAAAAAAAIAEAAAAABWIgAAAAAAM2VzZHMAAAAAA4CAgCIAAAAEgICAFEAUABgAAAAAAAAAfQAFgICAAhOIBoCAgAECAAAAD3NidGQAAAAASTE2AAAAGHN0dHMAAAAAAAAAAQAAAAUAAAQAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAFAAAAAQAAAChzdHN6AAAAAAAAAAAAAAAFAAAABAAAAAQAAAAEAAAABAAAAAQAAAAUc3RjbwAAAAAAAAABAAAQAAAAAPp1ZHRhAAAA8m1ldGEAAAAAAAAAImhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAAAMRpbHN0AAAAvC0tLS0AAAAcbWVhbgAAAABjb20uYXBwbGUuaVR1bmVzAAAAFG5hbWUAAAAAaVR1blNNUEIAAACEZGF0YQAAAAEAAAAAIDAwMDAwMDAwIDAwMDAwODQwIDAwMDAwMzIzIDAwMDAwMDAwMDAwMDA4OUQgMDAwMDAwMDAgMDAwMDAwMDAgMDAwMDAwMDAgMDAwMDAwMDAgMDAwMDAwMDAgMDAwMDAwMDAgMDAwMDAwMDAgMDAwMDAwMDAAAAyWZnJlZQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcbWRhdADQAAcA0AAHANAABwDQAAcA0AAH';
    player.play().catch(() => {}).finally(() => { player.pause(); player.muted = false; });
    document.removeEventListener('pointerdown', unlock, true);
  };
  document.addEventListener('pointerdown', unlock, true);
  let playToken = 0;
  async function playFile(text, opts) {
    const token = ++playToken;
    let src = null, rate = Store.s.settings.rate || 1;
    if (server) src = `/tts?t=${encodeURIComponent(text)}&s=${opts.slow ? 1 : 0}`;
    else { src = await clipURL(text); if (opts.slow) rate *= 0.72; }
    if (!src || token !== playToken) return !!src && token !== playToken;
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => { if (!done) { done = true; player.onended = player.onerror = null; resolve(ok); } };
      player.pause();
      player.onended = () => finish(true);
      player.onerror = () => finish(false);
      player.src = src;
      player.playbackRate = rate;
      player.preservesPitch = true;
      player.play().catch((e) => finish(e && e.name === 'AbortError'));
      setTimeout(() => finish(true), 20000);
    });
  }
  function warm(texts) {
    serverReady.then((ok) => { if (ok) fetch('/tts/warm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(texts) }).catch(() => {}); });
  }

  /* Fallback: the browser's own speech synthesis. */
  function speakBrowser(text, opts) {
    return new Promise((resolve) => {
      if (!synth || !chosen) return resolve(false);
      const spoken = mode === 'gu' ? text : GU.toDeva(text);
      const go = () => {
        const u = new SpeechSynthesisUtterance(spoken);
        current = u;
        u.voice = chosen; u.lang = chosen.lang;
        u.rate = (opts.slow ? 0.62 : 0.92) * (Store.s.settings.rate || 1);
        let started = false, done = false;
        const t0 = performance.now();
        const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
        u.onstart = () => { started = true; stalled = false; };
        // Chrome sometimes "ends" an utterance instantly without playing it — treat that as a failure.
        u.onend = () => { if (!started && performance.now() - t0 < 300) { markStall(); finish(false); } else finish(true); };
        u.onerror = (e) => finish(e.error === 'interrupted' || e.error === 'canceled');
        synth.speak(u);
        if (synth.paused) synth.resume();
        setTimeout(() => { if (started || done) return; synth.cancel(); markStall(); finish(false); }, 3000);
        setTimeout(() => finish(true), 15000);
      };
      if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(go, 80); } else go();
    });
  }

  async function say(text, opts = {}) {
    if (!text) return false;
    await serverReady;
    if (server || pack || (await packReady)) {
      const ok = await playFile(text, opts);
      if (ok) { stalled = false; return true; }
    }
    return speakBrowser(text, opts);
  }
  function stopAudio() { playToken++; player.onended = player.onerror = null; player.pause(); if (synth) synth.cancel(); }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  function listen({ lang = 'gu-IN', onInterim } = {}) {
    return new Promise((resolve) => {
      if (!SR) return resolve({ error: 'unsupported' });
      try { rec && rec.abort(); } catch (e) {}
      rec = new SR();
      rec.lang = lang; rec.interimResults = true; rec.maxAlternatives = 5; rec.continuous = false;
      let finalAlts = null, lastInterim = '', err = null;
      const t0 = performance.now();
      rec.onresult = (e) => {
        const r = e.results[e.results.length - 1];
        if (r.isFinal) finalAlts = Array.from(r).map((a) => ({ t: a.transcript, c: a.confidence }));
        else { lastInterim = Array.from(e.results).map((x) => x[0].transcript).join(' '); onInterim && onInterim(lastInterim); }
      };
      rec.onerror = (e) => { err = e.error; };
      rec.onend = () => {
        const ms = performance.now() - t0;
        if (finalAlts) resolve({ alts: finalAlts, ms });
        else if (lastInterim) resolve({ alts: [{ t: lastInterim, c: 0 }], ms });
        else resolve({ error: err || 'no-speech', ms });
      };
      try { rec.start(); } catch (e) { resolve({ error: 'start-failed' }); }
    });
  }
  const stop = () => { try { rec && rec.stop(); } catch (e) {} stopAudio(); };

  return {
    say, listen, stop, load,
    get voices() { return voices; },
    get voice() { return chosen; },
    get mode() { const src = server || pack; return src ? (src.lang === 'gu_IN' ? 'gu' : 'hi') : mode; },
    get server() { return server; },
    get pack() { return pack; },
    clipURL,
    warm,
    get canListen() { return !!SR; },
    get stalled() { return stalled; },
    onStall(f) { stallListeners.add(f); },
    onVoices(f) { listeners.add(f); },
    repick() { pick(); },
  };
})();

const Recorder = (() => {
  let mr = null, chunks = [], stream = null;
  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  async function start() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = []; mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.start();
  }
  function stop() {
    return new Promise((resolve) => {
      if (!mr) return resolve(null);
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolve(URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }))); };
      mr.stop();
    });
  }
  return { supported, start, stop };
})();

const Sfx = (() => {
  let ctx = null;
  function tone(freqs, dur = 0.12, type = 'sine', gain = 0.06) {
    if (!Store.s.settings.sound) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      let t = ctx.currentTime;
      freqs.forEach((f) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur); t += dur * 0.8;
      });
    } catch (e) {}
  }
  return {
    good: () => tone([660, 880], 0.11, 'triangle'),
    bad: () => tone([220, 180], 0.14, 'sine', 0.05),
    done: () => tone([523, 659, 784, 1046], 0.13, 'triangle'),
    tap: () => tone([440], 0.04, 'sine', 0.03),
  };
})();
