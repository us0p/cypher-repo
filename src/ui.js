/* CYPHER — interface, narrativa, sons, placar e modo apresentação. */
(function () {
'use strict';
document.documentElement.lang = 'pt-BR';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const DF = [
  { n: 'Fácil', ms: 250, pen: 60, hint: 30, sol: 60 },
  { n: 'Médio', ms: 150, pen: 120, hint: 60, sol: 120 },
  { n: 'Difícil', ms: 100, pen: 180, hint: 120, sol: 180 }
];
const fmt = s => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pickR = a => a[Math.floor(Math.random() * a.length)];
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const prefs = Object.assign({ som: true, trilha: true }, store.get('cypher-prefs', {}));
const savePrefs = () => store.set('cypher-prefs', prefs);

/* ---------- som (Web Audio, sem arquivos) ---------- */
const S = {
  ctx: null, drone: null,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } },
  tone(f, d, type, v, when) {
    if (!prefs.som || !this.ctx) return;
    try {
      const t = this.ctx.currentTime + (when || 0), o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'square'; o.frequency.value = f; g.gain.setValueAtTime(v || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d + 0.03);
    } catch (e) { }
  },
  click() { this.tone(1300, 0.035, 'square', 0.025); },
  ok() { [660, 880, 1320].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.07, i * 0.08)); },
  err() { this.tone(110, 0.38, 'sawtooth', 0.08); this.tone(97, 0.38, 'sawtooth', 0.06, 0.05); },
  hint() { this.tone(520, 0.09, 'sine', 0.07); this.tone(390, 0.14, 'sine', 0.07, 0.1); },
  alarm() { [880, 660, 880, 660].forEach((f, i) => this.tone(f, 0.14, 'square', 0.04, i * 0.16)); },
  phase() { [220, 330, 440].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.05, i * 0.12)); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.07, i * 0.12)); },
  lose() { [440, 330, 247, 165].forEach((f, i) => this.tone(f, 0.4, 'sawtooth', 0.06, i * 0.22)); },
  music(on) {
    if (!this.ctx) return;
    if (on && !this.drone && prefs.som && prefs.trilha) {
      try {
        const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain();
        g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(0.045, c.currentTime + 2.5);
        lp.type = 'lowpass'; lp.frequency.value = 360; lfo.frequency.value = 0.07; lg.gain.value = 170;
        lfo.connect(lg); lg.connect(lp.frequency);
        const os = [55, 55.7, 82.4].map(f => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); return o; });
        lp.connect(g); g.connect(c.destination); lfo.start();
        this.drone = { g, os, lfo };
      } catch (e) { this.drone = null; }
    } else if (!on && this.drone) {
      const { g, os, lfo } = this.drone, t = this.ctx.currentTime; this.drone = null;
      try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.6); } catch (e) { }
      setTimeout(() => { try { os.forEach(o => o.stop()); lfo.stop(); } catch (e) { } }, 700);
    }
  }
};

/* ---------- falas ---------- */
const TAUNTS = ['Errou. Cada segundo seu é um presente para mim.', 'Tabelas-verdade não mentem. Você, sim.', 'Quase. Quase não estabiliza servidor.', 'O Core agradece o calor extra.', 'Continue chutando. Eu tenho tempo; você não.', 'Isso foi uma conta ou um palpite?', 'Mais um erro e eu nem preciso fazer nada.', 'Seus servidores estão torcendo por você. Eu também, mas pelo erro.'];
const QUIPS = ['Sorte de principiante.', 'Hm. Você sabe fazer contas.', 'Isso não muda nada.', 'Um nó. Faltam outros.', 'Não se acostume.'];
const HINTQ = ['Pedindo ajuda? Interessante.', 'Dicas custam tempo. Eu adoro tempo.', 'Até o terminal está com pena de você.'];

/* ---------- estado ---------- */
let G = null, iv = null, lastField = null, ansCalc = 0, histCalc = [];
window.CYPHER = { get G() { return G; }, C };

function show(id) {
  ['s-start', 's-phase', 's-game', 's-end'].forEach(x => { $('#' + x).hidden = x !== id; });
  if (G) G.scr = id.slice(2);
  updTools();
  window.scrollTo(0, 0);
}
function updTools() {
  $('#bSom').textContent = prefs.som ? 'Som: ligado' : 'Som: desligado';
  $('#bSom').setAttribute('aria-pressed', String(prefs.som));
  $('#bTrilha').textContent = prefs.trilha ? 'Trilha: ligada' : 'Trilha: desligada';
  $('#bTrilha').setAttribute('aria-pressed', String(prefs.trilha));
  $('#bTrilha').disabled = !prefs.som;
  const p = G && G.pres && !G.over && G.scr === 'game';
  $('#bPause').hidden = !p;
  if (p) $('#bPause').textContent = G.paused ? 'Retomar (P)' : 'Pausar (P)';
  $('#presBadge').hidden = !(G && G.pres && !G.over);
}
function log(tag, msg) {
  const box = $('#log'), el = document.createElement('div');
  el.className = 'ln ' + tag;
  el.innerHTML = '<b>' + { nul: '[NullSet] ', sys: '[SISTEMA] ', alr: '[ALERTA] ', ok: '[OK] ' }[tag] + '</b><span></span>';
  box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  const sp = el.querySelector('span');
  if (reduce) { sp.textContent = msg; return; }
  let k = 0; const t = setInterval(() => { sp.textContent = msg.slice(0, ++k); if (k >= msg.length) clearInterval(t); }, 12);
}
function fx(kind) {
  const f = $('#fx'); f.className = ''; void f.offsetWidth; f.className = kind;
  if (kind === 'bad' && !reduce) { const m = $('#main'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); }
}
function fb(msg, cls) { $('#fb').textContent = msg; $('#fb').className = cls || ''; }
function drawClock() {
  const c = $('#clock'); c.textContent = fmt(G.t);
  c.classList.toggle('low', G.t < 600 && G.t >= 300); c.classList.toggle('crit', G.t < 300);
  c.classList.toggle('paused', !!G.paused);
}

/* ---------- partida ---------- */
function start(d, codeIn, presIn) {
  S.init();
  const pres = presIn === undefined ? $('#pres').checked : presIn;
  const code = C.cleanCode(codeIn === undefined ? $('#code').value : codeIn) || C.newCode();
  G = {
    d, D: DF[d], pres, code, t: 3600, i: 0, lv: C.genAll(code, d),
    st: C.LEVELS.map(() => ({ solved: false, errs: 0, hinted: false, viaSol: false, seen: false, skipped: false, solOpen: false })),
    errs: 0, hints: 0, sols: 0, paused: pres, over: false, alerts: {}, scr: 'start', phase: 0
  };
  document.documentElement.classList.toggle('pres', pres);
  $('#log').innerHTML = ''; $('#keys').hidden = !pres;
  $('#codeLbl').textContent = 'Código da partida: ' + code;
  $('#bar').classList.toggle('jump', pres);
  histCalc = []; drawHist();
  clearInterval(iv); iv = setInterval(tick, G.D.ms);
  S.music(true);
  drawClock();
  openPhase(1);
}
function openPhase(p) {
  G.phase = p; const P = C.PHASES[p];
  $('#pk').textContent = `Fase ${p} de 3 · ${G.D.n}`;
  $('#pn').textContent = '0' + p;
  $('#pt').textContent = P.name;
  $('#ps').textContent = P.story;
  $('#pc').textContent = P.concepts;
  show('s-phase'); S.phase();
  setTimeout(() => $('#pgo').focus(), 50);
}
function enterPhase() {
  show('s-game');
  if (G.phase === 1 && !G.st[0].seen) log('nul', 'Boa noite, SysAdmin. Seu Core tem 60 minutos de vida. Vamos ver quanto da sua lógica sobrevive.');
  const n = C.LEVELS.filter(l => l.phase === G.phase).length;
  log('sys', `${C.PHASES[G.phase].name}: ${n} nós comprometidos.`);
  render();
}
function tick() {
  if (!G || G.over || G.paused || G.scr !== 'game') return;
  G.t--; drawClock(); alerts();
  if (G.t <= 0) end(false);
}
function alerts() {
  const A = G.alerts;
  if (G.t <= 600 && !A.a10) { A.a10 = 1; log('alr', 'Temperatura do Core crítica: 10 minutos.'); S.alarm(); }
  if (G.t <= 300 && !A.a5) { A.a5 = 1; log('alr', '5 minutos para o buffer overflow.'); log('nul', 'Tic-tac, SysAdmin.'); }
  if (G.t <= 300 && G.t > 0 && G.t % 60 === 0) S.alarm();
  if (G.t <= 60 && !A.a1) { A.a1 = 1; log('alr', 'Últimos 60 segundos.'); }
}
function cost(s) { if (G.pres) return; G.t = Math.max(0, G.t - s); drawClock(); alerts(); if (G.t <= 0) end(false); }

/* ---------- nó ---------- */
function drawBar() {
  const b = $('#bar'); b.innerHTML = '';
  C.LEVELS.forEach((lv, k) => {
    const i = document.createElement('i'), st = G.st[k];
    if (k > 0 && lv.phase !== C.LEVELS[k - 1].phase) i.classList.add('gap');
    if (st.solved) i.classList.add('d'); else if (st.skipped) i.classList.add('s');
    if (k === G.i) i.classList.add('n');
    i.title = `Nó ${k + 1}: ${lv.title}`;
    if (G.pres) i.onclick = () => { G.i = k; render(); };
    b.appendChild(i);
  });
}
function render() {
  const k = G.i, M = C.LEVELS[k], L = G.lv[k], st = G.st[k];
  if (M.phase !== G.phase) G.phase = M.phase;
  $('#ph').textContent = `Fase ${M.phase} · ${C.PHASES[M.phase].name} · ${G.D.n}`;
  drawBar();
  $('#h').textContent = `Nó ${k + 1}/9 · ${M.title}`;
  $('#sc').textContent = L.sc;
  $('#q').textContent = L.q;
  $('#extra').innerHTML = L.extra || '';
  $('#chart').innerHTML = L.chart || '';
  $('#hintTxt').hidden = !st.hinted; $('#hintTxt').textContent = 'Dica: ' + L.hint;
  $('#sol').innerHTML = solHTML(L);
  $('#sol').hidden = !st.solOpen;
  fb(st.solved ? (st.viaSol ? 'Nó liberado pela resolução comentada.' : 'Nó estabilizado.') : '', st.solved ? (st.viaSol ? 'hintm' : 'okm') : '');
  build(L, st);
  acts();
  if (!st.seen) { st.seen = true; log('sys', `Nó ${k + 1}/9: ${L.log}`); }
}
/* resolução comentada: conceito, exemplo simples, a sua partida e o erro comum */
const txt = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\^(\d+)/g, '<sup>$1</sup>');
const item = s => s.charAt(0) === '<' ? '<div class="blk">' + s + '</div>' : '<p>' + txt(s) + '</p>';
function solHTML(L) {
  const lr = L.learn; let n = 0;
  const steps = L.sol.map(s => s.charAt(0) === '<' ? '<div class="blk">' + s + '</div>' : '<p class="st"><b>' + (++n) + '.</b> ' + txt(s) + '</p>').join('');
  return '<h3>Resolução comentada</h3>' +
    '<section class="lx"><h4>O conceito</h4>' + lr.concept.map(item).join('') + '</section>' +
    '<section class="lx ex"><h4>Exemplo simples</h4>' + lr.example.map(item).join('') + '</section>' +
    '<section class="lx"><h4>Na sua partida</h4>' + steps + '</section>' +
    '<p class="pit"><b>Erro comum.</b> ' + txt(lr.pitfall) + '</p>';
}
function mk(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
function goBtn(label) { const b = mk('button', 'go', label); b.type = 'button'; b.onclick = () => submit(); return b; }
function build(L, st) {
  const b = $('#box'); b.innerHTML = ''; b.className = st.solved ? 'locked' : '';
  const ans = C.answerOf(L);
  if (L.kind === 'truth') {
    G.resp = st.solved ? ans.slice() : L.rows.map(() => null);
    const wrap = mk('div', 'scroll'), t = mk('table', 'tg');
    const hr = mk('tr'); L.vars.forEach(v => hr.appendChild(mk('th', '', v))); hr.appendChild(mk('th', '', 'L')); t.appendChild(hr);
    L.rows.forEach((row, k) => {
      const tr = mk('tr'); row.forEach(x => tr.appendChild(mk('td', '', x ? 'V' : 'F')));
      const td = mk('td'), btn = mk('button', 'c'); btn.type = 'button';
      const paint = () => { const v = G.resp[k]; btn.textContent = v === null ? '?' : v ? 'V' : 'F'; btn.className = 'c' + (v === null ? '' : v ? ' v' : ' f'); btn.setAttribute('aria-label', `Linha ${k + 1}: L = ${btn.textContent}`); };
      btn.onclick = () => { const v = G.resp[k]; G.resp[k] = v === null ? true : v ? false : null; paint(); S.click(); };
      paint(); td.appendChild(btn); tr.appendChild(td); t.appendChild(tr);
    });
    wrap.appendChild(t); b.appendChild(wrap); b.appendChild(goBtn('Validar tabela'));
  } else if (L.kind === 'chips') {
    G.resp = new Set(st.solved ? ans : []);
    const box = mk('div', 'chips');
    L.items.forEach(x => {
      const c = mk('button', 'chip' + (G.resp.has(x) ? ' on' : ''), '10.0.0.' + x); c.type = 'button';
      c.setAttribute('aria-pressed', String(G.resp.has(x)));
      c.onclick = () => { G.resp.has(x) ? G.resp.delete(x) : G.resp.add(x); c.classList.toggle('on'); c.setAttribute('aria-pressed', String(G.resp.has(x))); S.click(); };
      box.appendChild(c);
    });
    b.appendChild(box); b.appendChild(goBtn('Aplicar regra'));
  } else if (L.kind === 'num') {
    const box = mk('div', 'fields');
    L.fields.forEach((f, k) => {
      const lab = mk('label'); lab.htmlFor = 'f' + k; lab.appendChild(document.createTextNode(f.label + ' ='));
      const inp = mk('input'); inp.type = 'text'; inp.id = 'f' + k; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.spellcheck = false;
      if (st.solved) inp.value = C.nf(f.ans, 4);
      inp.onfocus = () => { lastField = inp; };
      inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
      lab.appendChild(inp); box.appendChild(lab);
    });
    b.appendChild(box); b.appendChild(goBtn('Executar'));
  } else if (L.kind === 'slider') {
    const big = mk('div', 'big');
    big.innerHTML = L.readout ? '<span id="tv"></span> °C' : 'T = ? °C <small>sensor corrompido</small>';
    const rg = mk('input'); rg.type = 'range'; rg.id = 'rg'; rg.min = L.min; rg.max = L.max; rg.step = L.step; rg.value = st.solved ? L.xv : 0;
    rg.setAttribute('aria-label', 'Rotação do cooler, em centenas de RPM');
    const lab = mk('p', 'dim');
    const upd = () => { const x = +rg.value; lab.textContent = `x = ${C.nf(x, 1)} (×100 RPM)`; if (L.readout) $('#tv').textContent = C.nf(L.f(x), 2); };
    b.appendChild(big); b.appendChild(rg); b.appendChild(lab); upd(); rg.oninput = upd;
    b.appendChild(goBtn('Travar rotação'));
  } else if (L.kind === 'mc') {
    const box = mk('div', 'mcs');
    L.options.forEach((o, k) => {
      const btn = mk('button', st.solved && k === L.correct ? 'r' : '', o); btn.type = 'button'; btn.dataset.k = k;
      btn.onclick = () => { if (btn.classList.contains('x')) return; submit(k); };
      box.appendChild(btn);
    });
    b.appendChild(box);
  }
  b.querySelectorAll('button,input').forEach(e => { if (st.solved) e.disabled = true; });
}
function acts() {
  const k = G.i, st = G.st[k], last = k === C.LEVELS.length - 1;
  $('#hb').hidden = st.solved;
  $('#hb').disabled = st.hinted;
  $('#hb').textContent = st.hinted ? 'Dica usada' : (G.pres ? 'Mostrar dica' : `Dica (−${fmt(G.D.hint)})`);
  const canSol = st.solved || G.pres || st.errs >= 3;
  $('#sb').hidden = !canSol;
  $('#sb').textContent = (st.solved || G.pres) ? (st.solOpen ? 'Ocultar resolução' : 'Ver resolução comentada') : `Ver resolução e liberar o nó (−${fmt(G.D.sol)})`;
  $('#nx').hidden = !(st.solved || G.pres);
  $('#nx').textContent = last ? (st.solved ? 'Desarmar o contador' : 'Encerrar demonstração') : (st.solved ? 'Próximo nó' : 'Pular nó');
  $('#pv').hidden = !(G.pres && k > 0);
}
function submit(mcIdx) {
  if (!G || G.over) return;
  const k = G.i, L = G.lv[k], st = G.st[k]; if (st.solved) return;
  let resp;
  if (L.kind === 'truth') { if (G.resp.some(v => v === null)) { fb('Preencha todas as linhas da coluna L antes de validar.', 'hintm'); return; } resp = G.resp.slice(); }
  else if (L.kind === 'chips') { if (!G.resp.size) { fb('Selecione pelo menos um IP.', 'hintm'); return; } resp = [...G.resp]; }
  else if (L.kind === 'num') {
    resp = $$('#box input').map(i => i.value);
    if (resp.some(v => !String(v).trim())) { fb('Preencha todos os campos antes de executar.', 'hintm'); return; }
    if (resp.some(v => isNaN(C.parseNum(v)))) { fb('Use apenas números, com vírgula ou ponto para decimais. Para contas, use a calculadora.', 'hintm'); return; }
  }
  else if (L.kind === 'slider') resp = +$('#rg').value;
  else resp = mcIdx;
  const r = C.check(L, resp);
  if (r.ok) nodeWin(); else nodeFail(r.msg, mcIdx);
}
function nodeWin() {
  const k = G.i, st = G.st[k]; st.solved = true;
  S.ok(); fx('ok');
  log('ok', `Nó ${k + 1} estabilizado.`);
  if (Math.random() < 0.45) setTimeout(() => { if (G && !G.over) log('nul', pickR(QUIPS)); }, 600);
  render();
  $('#nx').focus();
}
function nodeFail(msg, mcIdx) {
  const k = G.i, st = G.st[k]; st.errs++; G.errs++;
  S.err(); fx('bad');
  if (G.over) return;
  log('nul', pickR(TAUNTS));
  if (mcIdx !== undefined) { const b = $(`#box [data-k="${mcIdx}"]`); if (b) b.classList.add('x'); }
  cost(G.D.pen);
  if (G.over) return;
  fb(`Resposta incorreta. ${msg || ''}${G.pres ? '' : ` (−${fmt(G.D.pen)})`}${st.errs === 3 && !G.pres ? ' A resolução comentada está disponível.' : ''}`, 'badm');
  acts();
}
function useHint() {
  const st = G.st[G.i]; if (st.hinted || st.solved) return;
  st.hinted = true; G.hints++; S.hint();
  $('#hintTxt').hidden = false;
  log('nul', pickR(HINTQ));
  cost(G.D.hint); if (G.over) return;
  acts();
}
function toggleSol() {
  const k = G.i, st = G.st[k];
  if (!st.solved && !G.pres) {
    if (st.errs < 3) return;
    cost(G.D.sol); if (G.over) return;
    G.sols++; st.solved = true; st.viaSol = true; st.solOpen = true;
    log('sys', 'Resolução de emergência aplicada. Penalidade registrada.');
    render(); return;
  }
  st.solOpen = !st.solOpen; $('#sol').hidden = !st.solOpen; acts();
  if (st.solOpen) $('#sol').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
}
function next() {
  const k = G.i, st = G.st[k];
  if (!st.solved) { if (!G.pres) return; st.skipped = true; }
  if (k === C.LEVELS.length - 1) { end(true); return; }
  G.i++;
  const p = C.LEVELS[G.i].phase;
  if (p !== C.LEVELS[k].phase) openPhase(p); else render();
}
function prev() { if (G.pres && G.i > 0) { G.i--; render(); } }
function togglePause() { if (!G || !G.pres || G.over) return; G.paused = !G.paused; drawClock(); updTools(); log('sys', G.paused ? 'Relógio pausado.' : 'Relógio retomado.'); }

/* ---------- fim ---------- */
function end(win) {
  if (!G || G.over) return;
  G.over = true; clearInterval(iv); S.music(false);
  const solvedN = G.st.filter(s => s.solved).length;
  win ? S.win() : S.lose();
  if (win && G.pres) { $('#ek').textContent = 'Modo apresentação'; $('#et').textContent = 'Demonstração concluída'; $('#em').textContent = `Os nove nós foram percorridos com o código ${G.code}. Use “Repetir este código” para mostrar os mesmos números de novo.`; }
  else if (win) {
    $('#ek').textContent = 'Contador desarmado';
    $('#et').textContent = 'NullSet neutralizado';
    $('#em').textContent = `O contador congela em ${fmt(G.t)}. O Protocolo de Colapso Lógico é purificado, as tabelas booleanas voltam ao normal e os painéis da Nexus Corp ficam verdes, um a um. No terminal, uma última linha do NullSet: “Dessa vez, SysAdmin.”`;
  } else {
    $('#ek').textContent = 'Tempo esgotado';
    $('#et').textContent = 'Buffer overflow no Core';
    $('#em').textContent = `00:00. O Core principal sofre o estouro de memória e, nesta história, os data centers do mundo apagam em sequência. O NullSet assina o log: “Lógica é tudo, SysAdmin.” Você estabilizou ${solvedN} de 9 nós. Abra a resolução comentada dos próximos e tente de novo.`;
  }
  const rank = !win || G.pres ? '—' : G.t > 1800 && !G.sols ? 'Arquiteto lendário' : G.t > 900 ? 'SysAdmin sênior' : 'Sobrevivente';
  const items = [['Tempo restante', fmt(G.t)], ['Nós estabilizados', solvedN + ' de 9'], ['Erros', G.errs], ['Dicas', G.hints], ['Resoluções liberadas', G.sols], ['Dificuldade', G.D.n], ['Código da partida', G.code]];
  if (win && !G.pres) items.unshift(['Patente', rank]);
  $('#stats').innerHTML = items.map(([a, b]) => `<div><b>${esc(b)}</b><span>${esc(a)}</span></div>`).join('');
  const canSave = win && !G.pres && store.set('cypher-test', 1);
  $('#save').hidden = !canSave; $('#saveMsg').textContent = ''; $('#nm').value = ''; $('#bSave').disabled = false;
  $('#endScores').innerHTML = '<p class="kick" style="margin-top:6px">Placar · ' + G.D.n + '</p>' + scoresHTML(G.d);
  show('s-end');
}

/* ---------- placar ---------- */
const SKEY = 'cypher-scores-v1';
const loadScores = () => { const s = store.get(SKEY, null); return s && typeof s === 'object' ? s : { 0: [], 1: [], 2: [] }; };
function saveScore(name) {
  const all = loadScores(), arr = Array.isArray(all[G.d]) ? all[G.d] : [];
  arr.push({ n: name, t: G.t, e: G.errs, h: G.hints, s: G.sols, c: G.code, dt: new Date().toLocaleDateString('pt-BR') });
  arr.sort((a, b) => b.t - a.t || a.e - b.e);
  all[G.d] = arr.slice(0, 10);
  return store.set(SKEY, all);
}
function scoresHTML(d) {
  const arr = loadScores()[d] || [];
  if (!arr.length) return `<p class="dim">Nenhum tempo registrado no modo ${DF[d].n} neste navegador.</p>`;
  return '<div class="scroll"><table class="sc-t"><tr><th>#</th><th>Nome</th><th>Tempo</th><th>Erros</th><th>Dicas</th><th>Código</th><th>Data</th></tr>' +
    arr.map((s, k) => `<tr><td>${k + 1}</td><td>${esc(s.n)}</td><td>${fmt(s.t)}</td><td>${+s.e || 0}</td><td>${+s.h || 0}</td><td>${esc(s.c || '')}</td><td>${esc(s.dt || '')}</td></tr>`).join('') + '</table></div>';
}
function drawStartScores(d) {
  const box = $('#scores');
  box.innerHTML = '<div class="tabs" role="tablist">' + DF.map((x, k) => `<button type="button" role="tab" aria-selected="${k === d}" data-t="${k}">${x.n}</button>`).join('') + '</div>' + scoresHTML(d) + '<p class="dim" style="margin-top:8px">O placar fica salvo apenas neste navegador.</p>';
  box.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => drawStartScores(+b.dataset.t); });
}

/* ---------- calculadora ---------- */
function toggleCalc(force) {
  const c = $('#calc'), open = force === undefined ? c.hidden : force;
  c.hidden = !open; $('#cb').setAttribute('aria-expanded', String(open));
  if (open) { $('#ci').focus(); c.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); }
}
function drawHist() {
  const h = $('#hist'); h.innerHTML = '';
  histCalc.forEach(v => {
    const b = mk('button', '', C.nf(v, 6)); b.type = 'button'; b.title = 'Colar no campo de resposta';
    b.onclick = () => { const txt = C.nf(v, 6).replace(/ /g, ''); if (lastField && document.body.contains(lastField) && !lastField.disabled) { lastField.value = txt; lastField.focus(); } else { $('#ci').value += txt; calcUpd(); } };
    h.appendChild(b);
  });
}
function calcUpd() {
  const s = $('#ci').value, v = C.calc(s, ansCalc), r = $('#res');
  if (!s.trim()) { r.textContent = ''; r.className = ''; return v; }
  if (isFinite(v)) { r.textContent = '= ' + C.nf(v, 8); r.className = ''; }
  else { r.textContent = 'Expressão incompleta ou inválida'; r.className = 'err'; }
  return v;
}

/* ---------- eventos ---------- */
document.addEventListener('pointerdown', () => S.init(), { once: true });
$$('[data-d]').forEach(b => { b.onclick = () => start(+b.dataset.d); });
$('#bScores').onclick = () => { const s = $('#scores'), open = s.hidden; s.hidden = !open; $('#bScores').setAttribute('aria-expanded', String(open)); $('#bScores').textContent = open ? 'Ocultar placar' : 'Ver placar'; if (open) drawStartScores(1); };
$('#pgo').onclick = enterPhase;
$('#hb').onclick = useHint;
$('#cb').onclick = () => toggleCalc();
$('#sb').onclick = toggleSol;
$('#nx').onclick = next;
$('#pv').onclick = prev;
$('#bPause').onclick = togglePause;
$('#bSom').onclick = () => { S.init(); prefs.som = !prefs.som; savePrefs(); S.music(prefs.som && G && !G.over); updTools(); };
$('#bTrilha').onclick = () => { S.init(); prefs.trilha = !prefs.trilha; savePrefs(); S.music(prefs.trilha && G && !G.over); updTools(); };
$('#ci').oninput = calcUpd;
$('#ci').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const v = calcUpd(); if (isFinite(v)) { ansCalc = v; histCalc = [v, ...histCalc.filter(x => x !== v)].slice(0, 6); drawHist(); } } if (e.key === 'Escape') toggleCalc(false); };
$('#bSave').onclick = () => {
  const nm = $('#nm').value.trim().slice(0, 12) || 'SysAdmin';
  const okS = saveScore(nm); $('#bSave').disabled = true;
  $('#saveMsg').textContent = okS ? 'Tempo salvo no placar deste navegador.' : 'Este navegador não permite salvar o placar.';
  $('#endScores').innerHTML = '<p class="kick" style="margin-top:6px">Placar · ' + G.D.n + '</p>' + scoresHTML(G.d);
};
$('#nm').onkeydown = e => { if (e.key === 'Enter' && !$('#bSave').disabled) $('#bSave').click(); };
$('#again').onclick = () => start(G.d, '', G.pres);
$('#same').onclick = () => start(G.d, G.code, G.pres);
$('#home').onclick = () => { $('#code').value = ''; document.documentElement.classList.remove('pres'); G = null; show('s-start'); };
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.matches('input[type=text],textarea')) return;
  const k = e.key.toLowerCase();
  if (k === 'm') { $('#bSom').click(); return; }
  if (!G || G.over) return;
  if (G.scr === 'phase' && (k === 'enter' || k === ' ') && e.target.id !== 'pgo') { e.preventDefault(); enterPhase(); return; }
  if (G.scr !== 'game') return;
  if (k === 'c') { e.preventDefault(); toggleCalc(); }
  if (G.pres) {
    if (k === 'p') togglePause();
    else if (k === 'n' || k === 'arrowright') next();
    else if (k === 'b' || k === 'arrowleft') prev();
    else if (k === 's') toggleSol();
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) S.music(false); else if (G && !G.over) S.music(true); });

/* atualização ao vivo da página publicada: preserva a partida em andamento */
window.claude?.hot?.snapshot?.(() => G && !G.over ? { g: { d: G.d, code: G.code, pres: G.pres, t: G.t, i: G.i, st: G.st, errs: G.errs, hints: G.hints, sols: G.sols, scr: G.scr, phase: G.phase, alerts: G.alerts } } : {});
function boot(data) {
  updTools();
  const g = data && data.g; if (!g) return;
  try {
    start(g.d, g.code, g.pres);
    Object.assign(G, { t: g.t, i: g.i, st: g.st, errs: g.errs, hints: g.hints, sols: g.sols, alerts: g.alerts || {}, phase: g.phase });
    drawClock();
    if (g.scr === 'game') { show('s-game'); render(); } else openPhase(g.phase || 1);
  } catch (e) { G = null; show('s-start'); }
}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
})();
