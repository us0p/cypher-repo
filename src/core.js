/* CYPHER — motor matemático (sem DOM). Gera os desafios a partir de um código de partida. */
var C = (function () {
'use strict';
const C = {};

/* ---------- sorteio reprodutível ---------- */
C.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
C.newCode = function () { let s = ''; for (let i = 0; i < 6; i++) s += ALPH[Math.floor(Math.random() * ALPH.length)]; return s; };
C.cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
C.seed = function (code) { let h = 2166136261; for (let i = 0; i < code.length; i++) { h ^= code.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const sum = a => a.reduce((s, v) => s + v, 0);

/* ---------- números ---------- */
C.fact = n => { if (!Number.isInteger(n) || n < 0 || n > 170) return NaN; let v = 1; for (let k = 2; k <= n; k++) v *= k; return v; };
C.perm = (n, k) => { if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return NaN; let v = 1; for (let i = 0; i < k; i++) v *= n - i; return v; };
C.comb = (n, k) => { const p = C.perm(n, k); return isNaN(p) ? NaN : Math.round(p / C.fact(k)); };
function nfBase(n, dec, keep) {
  if (!isFinite(n)) return String(n);
  const m = Math.pow(10, dec); let v = Math.round(n * m) / m; if (v === 0) v = 0;
  const neg = v < 0; const parts = Math.abs(v).toFixed(dec).split('.');
  let i = parts[0], f = parts[1] || '';
  if (!keep) f = f.replace(/0+$/, '');
  if (i.length > 4) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + i + (f ? ',' + f : '');
}
C.nf = (n, dec) => nfBase(n, dec === undefined ? 4 : dec, false);
C.nfx = (n, dec) => nfBase(n, dec, true);
const nf = C.nf, nfx = C.nfx;
C.parseNum = function (s) {
  s = String(s == null ? '' : s).trim().replace(/[\s  ]/g, '').replace(/^−/, '-').replace(/^\+/, '');
  if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  s = s.replace(',', '.');
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
};

/* ---------- calculadora (analisador próprio, sem eval) ---------- */
C.calc = function (src, ans) {
  try {
    const s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
    if (!s) return NaN;
    const tk = [], st = []; let i = 0;
    while (i < s.length) {
      const ch = s[i], top = st[st.length - 1];
      if (/[0-9.]/.test(ch)) {
        let j = i, num = '';
        while (j < s.length) {
          const c = s[j];
          if (/[0-9]/.test(c)) { num += c; j++; }
          else if (c === '.') { num += '.'; j++; }
          else if (c === ',' && top !== 'f' && /[0-9]/.test(s[j + 1] || '')) { num += '.'; j++; }
          else break;
        }
        if ((num.match(/\./g) || []).length > 1 || num === '.') return NaN;
        tk.push({ t: 'n', v: parseFloat(num) }); i = j; continue;
      }
      if (/[a-zA-Zπ]/.test(ch)) {
        let j = i; while (j < s.length && /[a-zA-Zπ]/.test(s[j])) j++;
        const id = s.slice(i, j).toLowerCase();
        if (s[j] === '(') { tk.push({ t: 'f', v: id }); tk.push({ t: '(' }); st.push('f'); i = j + 1; }
        else { tk.push({ t: 'c', v: id }); i = j; }
        continue;
      }
      if (ch === '(') { st.push('p'); tk.push({ t: '(' }); i++; continue; }
      if (ch === ')') { st.pop(); tk.push({ t: ')' }); i++; continue; }
      if (ch === ',' || ch === ';') { tk.push({ t: ',' }); i++; continue; }
      if ('+-*/^!'.includes(ch)) { tk.push({ t: ch }); i++; continue; }
      return NaN;
    }
    let p = 0;
    const peek = () => tk[p];
    const is = t => tk[p] && tk[p].t === t;
    const FN = { sqrt: [1, Math.sqrt], raiz: [1, Math.sqrt], ln: [1, Math.log], log: [1, Math.log10], exp: [1, Math.exp], c: [2, C.comb], a: [2, C.perm] };
    const CN = { pi: Math.PI, 'π': Math.PI, e: Math.E, ans: ans };
    function expr() { let v = term(); while (is('+') || is('-')) { const o = tk[p++].t, w = term(); v = o === '+' ? v + w : v - w; } return v; }
    function term() { let v = unary(); while (is('*') || is('/')) { const o = tk[p++].t, w = unary(); v = o === '*' ? v * w : v / w; } return v; }
    function unary() { if (is('-')) { p++; return -unary(); } if (is('+')) { p++; return unary(); } return power(); }
    function power() { const b = post(); if (is('^')) { p++; return Math.pow(b, unary()); } return b; }
    function post() { let v = prim(); while (is('!')) { p++; v = C.fact(v); } return v; }
    function prim() {
      const k = peek(); if (!k) throw 0;
      if (k.t === 'n') { p++; return k.v; }
      if (k.t === 'c') { p++; if (!(k.v in CN) || CN[k.v] === undefined) throw 0; return CN[k.v]; }
      if (k.t === 'f') {
        p++; const fn = FN[k.v]; if (!fn) throw 0;
        if (!is('(')) throw 0; p++;
        const args = [expr()]; while (is(',')) { p++; args.push(expr()); }
        if (!is(')')) throw 0; p++;
        if (args.length !== fn[0]) throw 0;
        return fn[1].apply(null, args);
      }
      if (k.t === '(') { p++; const v = expr(); if (!is(')')) throw 0; p++; return v; }
      throw 0;
    }
    const v = expr(); if (p !== tk.length) return NaN; return v;
  } catch (e) { return NaN; }
};

/* ---------- lógica proposicional ---------- */
C.parseLogic = function (src) {
  const t = src.replace(/\s+/g, '').split(''); let i = 0;
  const peek = () => t[i];
  function iff() { let l = imp(); while (peek() === '↔') { i++; l = { o: '↔', a: l, b: imp() }; } return l; }
  function imp() { const l = or(); if (peek() === '→') { i++; return { o: '→', a: l, b: imp() }; } return l; }
  function or() { let l = and(); while (peek() === '∨') { i++; l = { o: '∨', a: l, b: and() }; } return l; }
  function and() { let l = not(); while (peek() === '∧') { i++; l = { o: '∧', a: l, b: not() }; } return l; }
  function not() {
    const c = peek();
    if (c === '¬') { i++; return { o: '¬', a: not() }; }
    if (c === '(') { i++; const x = iff(); if (t[i] !== ')') throw Error('")" esperado em ' + src); i++; return x; }
    if (c === 'P' || c === 'Q' || c === 'R') { i++; return { v: c }; }
    throw Error('símbolo inesperado em ' + src);
  }
  const x = iff(); if (i !== t.length) throw Error('sobra em ' + src); return x;
};
C.evalLogic = function (n, e) {
  if (n.v) return e[n.v];
  const a = C.evalLogic(n.a, e); if (n.o === '¬') return !a;
  const b = C.evalLogic(n.b, e);
  switch (n.o) { case '∧': return a && b; case '∨': return a || b; case '→': return !a || b; case '↔': return a === b; }
  throw Error('operador');
};
C.strLogic = function (n) {
  const w = x => x.v ? x.v : (x.o === '¬' ? C.strLogic(x) : '(' + C.strLogic(x) + ')');
  if (n.v) return n.v; if (n.o === '¬') return '¬' + w(n.a);
  return w(n.a) + ' ' + n.o + ' ' + w(n.b);
};
C.subs = function (n, out) { out = out || []; if (n.v) return out; C.subs(n.a, out); if (n.b) C.subs(n.b, out); const s = C.strLogic(n); if (!out.some(x => x.s === s)) out.push({ s, n }); return out; };
C.varsOf = src => ['P', 'Q', 'R'].filter(v => src.includes(v));
C.rowsFor = vs => [...Array(Math.pow(2, vs.length))].map((_, m) => vs.map((_, j) => !!((m >> (vs.length - 1 - j)) & 1)));
const env = (vs, row) => { const e = {}; vs.forEach((v, k) => { e[v] = row[k]; }); return e; };
C.column = (src, vs) => { const a = C.parseLogic(src); return C.rowsFor(vs).map(row => C.evalLogic(a, env(vs, row))); };
C.equiv = function (a, b) { const vs = C.varsOf(a + b); const x = C.column(a, vs), y = C.column(b, vs); return x.every((v, k) => v === y[k]); };
const VF = b => b ? 'V' : 'F';
function ttHTML(vs, cols) {
  const rows = C.rowsFor(vs);
  let h = '<div class="scroll"><table class="tt"><tr>' + vs.map(v => '<th>' + v + '</th>').join('') + cols.map(c => '<th' + (c.main ? ' class="m"' : '') + '>' + c.s + '</th>').join('') + '</tr>';
  rows.forEach((row, k) => {
    h += '<tr>' + row.map(b => '<td>' + VF(b) + '</td>').join('') + cols.map(c => { const b = c.vals[k]; return '<td class="' + (b ? 't' : 'f') + (c.main ? ' m' : '') + '">' + VF(b) + '</td>'; }).join('') + '</tr>';
  });
  return h + '</table></div>';
}
const rowTxt = (vs, row) => '(' + vs.map((v, k) => v + ' = ' + VF(row[k])).join(', ') + ')';

/* ---------- gráficos SVG ---------- */
C.svgGrowth = function (a, b, L, xmax) {
  const W = 400, H = 182, x0 = 42, x1 = 388, y0 = 154, y1 = 12, ymax = L * 2.4;
  const X = x => x0 + x / xmax * (x1 - x0), Y = y => y0 - Math.min(y, ymax) / ymax * (y0 - y1);
  const pts = []; for (let k = 0; k <= xmax * 8; k++) { const x = k / 8; pts.push(X(x).toFixed(1) + ',' + Y(a * Math.pow(b, x)).toFixed(1)); }
  const step = xmax > 10 ? 2 : 1; let g = '';
  for (let x = 0; x <= xmax; x += step) g += `<line class="gr" x1="${X(x)}" x2="${X(x)}" y1="${y1}" y2="${y0}"/><text x="${X(x)}" y="${y0 + 14}" text-anchor="middle">${x}</text>`;
  let dots = ''; for (let x = 0; x <= xmax; x++) { const y = a * Math.pow(b, x); if (y <= ymax) dots += `<circle class="pt" cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="2.6"/>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tráfego f(x) crescendo ao longo dos minutos, com a linha da capacidade de ${nf(L)} Gbps">${g}<line class="ax" x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}"/><line class="cap" x1="${x0}" x2="${x1}" y1="${Y(L)}" y2="${Y(L)}"/><text x="${x0 + 4}" y="${Y(L) - 5}" class="capt">capacidade L = ${nf(L)} Gbps</text><polyline class="ln" points="${pts.join(' ')}"/>${dots}<text x="${x1}" y="${H - 2}" text-anchor="end">tempo x (min)</text><text x="${x0 - 6}" y="${y0 + 3}" text-anchor="end">0</text></svg>`;
};
C.svgScatter = function (xs, ys, cap, xmax, fit) {
  const W = 400, H = 186, x0 = 46, x1 = 388, y0 = 156, y1 = 12;
  const ymin = Math.max(0, Math.floor(Math.min(...ys) * 0.7 / 50) * 50), ymax = Math.ceil(cap * 1.12 / 50) * 50;
  const X = x => x0 + x / xmax * (x1 - x0), Y = y => y0 - (y - ymin) / (ymax - ymin) * (y0 - y1);
  const step = xmax > 14 ? 4 : 2; let g = '';
  for (let x = 0; x <= xmax; x += step) g += `<line class="gr" x1="${X(x)}" x2="${X(x)}" y1="${y1}" y2="${y0}"/><text x="${X(x)}" y="${y0 + 14}" text-anchor="middle">${x}</text>`;
  g += `<text x="${x0 - 6}" y="${Y(ymin) + 3}" text-anchor="end">${ymin}</text>`;
  let line = '';
  if (fit) {
    const xa = 0, xb = xmax;
    line = `<line class="fit" x1="${X(xa)}" y1="${Y(fit.a + fit.b * xa).toFixed(1)}" x2="${X(xb)}" y2="${Y(fit.a + fit.b * xb).toFixed(1)}"/>`;
    const xc = (cap - fit.a) / fit.b; line += `<circle class="hit" cx="${X(xc).toFixed(1)}" cy="${Y(cap).toFixed(1)}" r="4"/>`;
  }
  const dots = xs.map((x, k) => `<circle class="pt" cx="${X(x).toFixed(1)}" cy="${Y(ys[k]).toFixed(1)}" r="3.4"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Uso do disco nos últimos seis meses e capacidade de ${cap} GB">${g}<line class="ax" x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}"/><line class="cap" x1="${x0}" x2="${x1}" y1="${Y(cap)}" y2="${Y(cap)}"/><text x="${x0 + 4}" y="${Y(cap) - 5}" class="capt">capacidade = ${cap} GB</text>${line}${dots}<text x="${x1}" y="${H - 2}" text-anchor="end">mês x</text></svg>`;
};
const pp = v => v < 0 ? '(' + nf(v) + ')' : nf(v);
const htab = (rows, cls) => '<div class="scroll"><table class="dt' + (cls ? ' ' + cls : '') + '">' + rows.map(r => '<tr><th>' + r[0] + '</th>' + r.slice(1).map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table></div>';
const vtab = (head, rows, foot) => '<div class="scroll"><table class="dt c"><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + (foot ? '<tr class="tot">' + foot.map(c => '<td>' + c + '</td>').join('') + '</tr>' : '') + '</table></div>';
function whyRow(n, e) {
  const s_ = x => C.strLogic(x), v = x => VF(C.evalLogic(x, e));
  switch (n.o) {
    case '→': return `a condição ${s_(n.a)} é ${v(n.a)} e a consequência ${s_(n.b)} é ${v(n.b)}. A promessa foi quebrada, então a implicação é F.`;
    case '∧': { const f = [n.a, n.b].filter(x => !C.evalLogic(x, e)); return `${f.map(x => s_(x) + ' é F').join(' e ')}, e um ∧ com alguma parte F é F.`; }
    case '∨': return `${s_(n.a)} e ${s_(n.b)} são os dois F, então o ∨ é F.`;
    case '↔': return `${s_(n.a)} é ${v(n.a)} e ${s_(n.b)} é ${v(n.b)}. Os valores são diferentes, então o ↔ é F.`;
    case '¬': return `${s_(n.a)} é V, e a negação inverte para F.`;
  }
  return '';
}
const mx = rows => '<span class="mx"><table>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table></span>';

/* ====================================================================
   DESAFIOS. Cada gerador recebe (r = sorteio, d = 0 fácil | 1 médio | 2 difícil)
   e devolve: kind, sc (cenário), q (pergunta), hint, sol (passos), log, dados do tipo.
   ==================================================================== */
const L = [];

/* 1 — Tabela-verdade */
const MEAN = { P: 'Servidor Web', Q: 'Banco de Dados', R: 'Autenticação' };
const RULE = { '¬': '¬A inverte o valor de A.', '∧': 'A ∧ B só é V quando A e B são V.', '∨': 'A ∨ B só é F quando A e B são F.', '→': 'A → B só é F quando A é V e B é F.', '↔': 'A ↔ B é V quando A e B têm o mesmo valor.' };
const rulesOf = src => Object.keys(RULE).filter(o => src.includes(o)).map(o => RULE[o]);
C.POOL1 = [
  [['P → Q', 'se o Servidor Web está no ar, o Banco de Dados precisa estar no ar'], ['¬Q → ¬P', 'se o Banco de Dados caiu, o Servidor Web também precisa estar fora do ar'], ['P ∨ Q', 'pelo menos um dos dois precisa estar no ar'], ['P ↔ Q', 'o Web e o Banco precisam estar no mesmo estado: os dois no ar ou os dois fora']],
  [['(P ∧ Q) → R', 'se o Web e o Banco estão no ar, a Autenticação precisa estar no ar'], ['(P ∨ Q) → R', 'se o Web ou o Banco estiver no ar, a Autenticação precisa estar no ar'], ['P → (Q ∧ R)', 'se o Web está no ar, o Banco e a Autenticação precisam estar no ar'], ['R → (P ∨ Q)', 'se a Autenticação está no ar, pelo menos o Web ou o Banco precisa estar no ar']],
  [['(P → Q) ∧ (Q → R)', 'o Web depende do Banco, e o Banco depende da Autenticação'], ['(P ↔ Q) → R', 'se o Web e o Banco estão no mesmo estado, a Autenticação precisa estar no ar'], ['(P ∨ Q) ∧ ¬(Q ∧ R)', 'pelo menos o Web ou o Banco fica no ar, mas o Banco e a Autenticação nunca rodam juntos (conflito de porta)'], ['¬(P ∧ ¬R) ∧ (Q → P)', 'o Web nunca roda sem Autenticação, e o Banco só roda com o Web no ar']]
];
L.push({ phase: 1, title: 'Diagnóstico de intertravamento', gen(r, d) {
  const [src, txt] = pick(r, C.POOL1[d]);
  const vs = d === 0 ? ['P', 'Q'] : ['P', 'Q', 'R'];
  const ast = C.parseLogic(src), rows = C.rowsFor(vs);
  const expect = rows.map(row => C.evalLogic(ast, env(vs, row)));
  const fr = rows.filter((_, k) => !expect[k]);
  const cols = C.subs(ast).map(x => ({ s: x.s, vals: rows.map(row => C.evalLogic(x.n, env(vs, row))) }));
  cols[cols.length - 1].main = true;
  return {
    kind: 'truth', vars: vs, rows, expect, formula: src,
    sc: `O painel de intertravamento só libera o acesso dos clientes (L = V) quando a regra de segurança é respeitada. Cada subsistema é uma variável booleana: ${vs.map(v => v + ' = ' + MEAN[v]).join(', ')}, com V para “no ar” e F para “fora do ar”. A regra em vigor é L = ${src}, ou seja, ${txt}. O NullSet embaralhou os estados dos servidores, então qualquer combinação pode aparecer no painel.`,
    q: 'Complete a coluna L para cada combinação (toque para alternar entre V e F) e valide a tabela.',
    hint: rulesOf(src).join(' ') + ' Resolva primeiro o que está entre parênteses.',
    sol: [`A regra é L = ${src}. Cada linha da tabela é uma situação possível dos servidores. Com ${vs.length} variáveis há 2^${vs.length} = ${rows.length} situações, e todas precisam ser testadas.`, `Conectivos desta regra: ${rulesOf(src).join(' ')}`, 'Monte uma coluna para cada pedaço da fórmula, de dentro para fora, como numa conta com parênteses: primeiro as negações e o que está entre parênteses, depois o conectivo principal. A última coluna é L:', ttHTML(vs, cols), `L é F em ${fr.length} das ${rows.length} situações: ${fr.map(row => rowTxt(vs, row)).join('; ')}. São exatamente as situações que violam a regra.`, `Por que, por exemplo, em ${rowTxt(vs, fr[0])}? Porque ${whyRow(ast, env(vs, fr[0]))}`],
    log: 'regra de intertravamento corrompida. Revalide a tabela-verdade.'
  };
}});

/* 2 — Firewall com conjuntos */
const fmtSet = S => S.length ? '{' + S.join(', ') + '}' : '∅';
const inter = (X, Y) => X.filter(v => Y.includes(v)), uni = (X, Y) => [...new Set([...X, ...Y])].sort((a, b) => a - b), dif = (X, Y) => X.filter(v => !Y.includes(v));
const sameSet = (X, Y) => X.length === Y.length && X.every(v => Y.includes(v));
C.OPS2 = [
  [['A ∩ B', 'um IP que aparece na blacklist e também na rede interna é um invasor que já está dentro de casa, e todos eles devem ser bloqueados', (A, B, Cc) => { const x = inter(A, B); return { res: x, steps: [`A ∩ B reúne os elementos que estão em A e em B ao mesmo tempo: ${fmtSet(x)}.`] }; }, () => true]],
  [['(A ∩ B) − C', 'os invasores internos (blacklist e rede interna ao mesmo tempo) devem ser bloqueados, mas alguns deles são parceiros com contrato e não podem cair', (A, B, Cc) => { const i = inter(A, B), x = dif(i, Cc); return { res: x, steps: [`Primeiro o parêntese: A ∩ B = ${fmtSet(i)} (estão na blacklist e na rede interna).`, `Depois retire os parceiros: ${fmtSet(i)} − ${fmtSet(Cc)} = ${fmtSet(x)}.`] }; }, (A, B, Cc) => inter(inter(A, B), Cc).length > 0]],
  [['(A ∪ B) − C', 'a rede entrou em quarentena: todo IP da blacklist ou da rede interna deve ser isolado, exceto os parceiros', (A, B, Cc) => { const u = uni(A, B), x = dif(u, Cc); return { res: x, steps: [`Primeiro o parêntese: A ∪ B = ${fmtSet(u)} (estão em pelo menos um dos dois).`, `Depois retire os parceiros: (A ∪ B) − C = ${fmtSet(x)}.`] }; }, (A, B, Cc) => inter(uni(A, B), Cc).length > 0],
   ['A ∪ (B − C)', 'a blacklist inteira deve ser bloqueada (até parceiros comprometidos), e na rede interna só os parceiros continuam liberados', (A, B, Cc) => { const dd = dif(B, Cc), x = uni(A, dd); return { res: x, steps: [`Primeiro o parêntese: B − C = ${fmtSet(dd)} (internos que não são parceiros).`, `Depois a união: A ∪ (B − C) = ${fmtSet(A)} ∪ ${fmtSet(dd)} = ${fmtSet(x)}.`, 'Repare que o parceiro que está na blacklist é bloqueado aqui, mas não seria em (A ∪ B) − C: os parênteses mudam o resultado.'] }; }, (A, B, Cc) => inter(A, Cc).length > 0 && inter(B, Cc).length > 0]]
];
L.push({ phase: 1, title: 'Firewall: filtrando IPs', gen(r, d) {
  const [op, txt, fn, need] = pick(r, C.OPS2[d]);
  for (let tries = 0; tries < 2000; tries++) {
    const pool = shuffle(r, [...Array(253)].map((_, k) => k + 2)).slice(0, 8).sort((a, b) => a - b);
    const mem = pool.map(() => 1 + Math.floor(r() * 7));
    const A = pool.filter((_, k) => mem[k] & 1), B = pool.filter((_, k) => mem[k] & 2), Cc = pool.filter((_, k) => mem[k] & 4);
    if (A.length < 3 || B.length < 3 || Cc.length < 2) continue;
    if (!need(A, B, Cc)) continue;
    const { res, steps } = fn(A, B, Cc);
    if (res.length < 2 || res.length > (d === 2 ? 6 : 5) || sameSet(res, A) || sameSet(res, B)) continue;
    return {
      kind: 'chips', items: pool, expect: res, sets: { A, B, C: Cc }, op,
      sc: `O NullSet está varrendo a rede, e o firewall trabalha com três listas de endereços. Os números abaixo são o último bloco de cada IP 10.0.0.x. A = blacklist ${fmtSet(A)}. B = rede interna ${fmtSet(B)}. C = parceiros ${fmtSet(Cc)}. Nesta situação, ${txt}.`,
      q: `Aplique a regra ${op} e selecione os IPs que devem ser bloqueados.`,
      hint: '∩ = está nos dois conjuntos; ∪ = está em pelo menos um; − = retira os elementos do segundo conjunto. Resolva primeiro o parêntese.',
      sol: [op.includes('(') ? `A regra ${op} se resolve como uma conta: primeiro o parêntese, depois a operação de fora.` : `A regra ${op} tem uma única operação: a interseção, que funciona como o “e” da lógica.`, ...steps, 'Conferindo IP por IP (✓ = o IP pertence ao conjunto):', vtab(['IP', 'em A', 'em B', 'em C', 'bloquear?'], pool.map(x => ['10.0.0.' + x, A.includes(x) ? '✓' : '·', B.includes(x) ? '✓' : '·', Cc.includes(x) ? '✓' : '·', res.includes(x) ? '<b>sim</b>' : 'não'])), `Bloqueie ${res.map(x => '10.0.0.' + x).join(', ')}.`],
      log: 'listas de acesso do firewall embaralhadas.'
    };
  }
  throw Error('sets');
}});

/* 3 — DDoS exponencial */
L.push({ phase: 2, title: 'DDoS exponencial', gen(r, d) {
  const cfg = [{ a: [1, 2, 3], b: [2, 3], x: [4, 7] }, { a: [2, 3, 4, 5], b: [1.5, 2, 2.5, 3], x: [5, 9] }, { a: [3, 5, 8], b: [1.2, 1.25, 1.3, 1.4], x: [10, 16] }][d];
  for (;;) {
    const a = pick(r, cfg.a), b = pick(r, cfg.b), x = ri(r, cfg.x[0], cfg.x[1]);
    const lo = a * Math.pow(b, x - 1), hi = a * Math.pow(b, x);
    let Lc = lo + (hi - lo) * (0.3 + 0.4 * r());
    const step = Lc >= 1000 ? 50 : Lc >= 200 ? 10 : 5; Lc = Math.round(Lc / step) * step;
    if (!(Lc > lo * 1.03 && Lc < hi * 0.97)) continue;
    const xs = Math.log(Lc / a) / Math.log(b);
    return {
      kind: 'num', a, b, L: Lc, fields: [{ label: 'x', ans: x, tol: 1e-6 }],
      chart: C.svgGrowth(a, b, Lc, x + 1),
      sc: `O tráfego malicioso que chega ao data center segue o modelo simplificado f(x) = ${a}·${nf(b)}ˣ Gbps, em que x é o minuto desde o início do ataque. O ${a} é o tráfego inicial e o ${nf(b)} é o fator de crescimento: a cada minuto o tráfego é multiplicado por ${nf(b)}, e não somado. A banda total suporta L = ${nf(Lc)} Gbps; acima disso, o data center cai.`,
      q: 'Qual é o primeiro minuto inteiro x em que o tráfego ultrapassa a capacidade? Ative a mitigação nesse minuto.',
      hint: d < 2 ? `Calcule f(0), f(1), f(2)… até passar de ${nf(Lc)}. Na calculadora: ${a}*${String(b)}^5, por exemplo.` : `Resolva ${a}·${nf(b)}ˣ > ${nf(Lc)} com logaritmo: x > ln(${nf(Lc)}/${a}) / ln(${nf(b)}).`,
      sol: [`Queremos o primeiro minuto em que o tráfego passa da capacidade, isto é, o menor inteiro x com ${a}·${nf(b)}ˣ > ${nf(Lc)}.`, `Caminho 1, minuto a minuto: comece em f(0) = ${a} e multiplique por ${nf(b)} a cada minuto, até passar de ${nf(Lc)}.`, htab([['Minuto x', ...[...Array(x + 1)].map((_, k) => k)], ['f(x) em Gbps', ...[...Array(x + 1)].map((_, k) => k === x ? '<b>' + nf(a * Math.pow(b, k), 2) + '</b>' : nf(a * Math.pow(b, k), 2))]]), `Caminho 2, com logaritmo (mais rápido quando x é grande): divida os dois lados por ${a} para deixar a potência sozinha: ${nf(b)}ˣ > ${nf(Lc / a)}.`, `Aplique o logaritmo natural dos dois lados. Ele transforma o expoente em multiplicação, ln(${nf(b)}ˣ) = x·ln(${nf(b)}), e como ln(${nf(b)}) > 0 o sentido da desigualdade não muda: x > ln(${nf(Lc / a)}) / ln(${nf(b)}) ≈ ${nf(xs, 3)}.`, `x precisa ser inteiro e maior que ${nf(xs, 3)}, então arredondamos para cima: x = ${x}. No minuto ${x - 1} o tráfego (${nf(lo, 2)} Gbps) ainda cabe na banda; no minuto ${x} (${nf(hi, 2)} Gbps) já não cabe.`],
      log: 'ataque de negação de serviço detectado. O tráfego está multiplicando.'
    };
  }
}});

/* 4 — Temperatura (2º grau) */
L.push({ phase: 2, title: 'Thermal throttling', gen(r, d) {
  const opts = [[{ a: 1, xv: [3, 4, 5, 6, 7, 8] }], [{ a: 0.5, xv: [4, 5, 6, 7, 8, 9] }, { a: 1, xv: [3, 4, 5, 6, 7, 8] }, { a: 2, xv: [2, 2.5, 3, 3.5, 4] }], [{ a: 0.2, xv: [5, 7.5, 10, 12.5] }, { a: 0.25, xv: [4, 6, 8, 10] }, { a: 0.4, xv: [5, 7.5, 10] }]][d];
  const o = pick(r, opts), a = o.a, xv = pick(r, o.xv);
  const Tm = ri(r, [16, 18, 24][d], [22, 26, 30][d]), delta = [2, 0.5, 0.05][d];
  const b = +(-2 * a * xv).toFixed(4), c = +(a * xv * xv + Tm).toFixed(4), lim = +(Tm + delta).toFixed(4);
  const h = Math.sqrt(delta / a), max = Math.ceil(2 * xv) + 1;
  const T = x => a * x * x + b * x + c;
  const poly = `${a === 1 ? '' : nf(a)}x² − ${nf(-b)}x + ${nf(c)}`;
  return {
    kind: 'slider', min: 0, max, step: 0.1, readout: d < 2, f: T, lim, xv, Tm, a, b, c,
    sc: `Os racks estão superaquecendo. A temperatura segue o modelo didático T(x) = ${poly}, em °C, em que x é a rotação do cooler em centenas de RPM. Rotação baixa deixa o rack quente, mas rotação alta gasta energia e também aquece; como a > 0, existe uma rotação ideal no vértice da parábola.${d === 2 ? ' Neste nível o NullSet corrompeu o sensor: você só vê a rotação e precisa calcular o ponto ideal.' : ''}`,
    q: `Ajuste o controle até T ≤ ${nf(lim)} °C e trave a rotação.`,
    hint: 'O mínimo de ax² + bx + c (com a > 0) fica no vértice: x = −b / 2a.',
    sol: [`Como a = ${nf(a)} é positivo, a parábola abre para cima: a temperatura cai até um ponto mínimo e depois volta a subir. Esse ponto é o vértice.`, `Rotação ideal: x_v = −b / 2a = −(${nf(b)}) / (2·${nf(a)}) = ${nf(-b)} / ${nf(2 * a)} = ${nf(xv)}, ou seja, ${nf(xv * 100)} RPM.`, `Temperatura no vértice: T(${nf(xv)}) = ${nf(a)}·${nf(xv)}² − ${nf(-b)}·${nf(xv)} + ${nf(c)} = ${nf(a * xv * xv)} − ${nf(-b * xv)} + ${nf(c)} = ${nf(Tm)} °C, abaixo do limite de ${nf(lim)} °C.`, `Quais rotações servem? Na forma do vértice, T(x) = ${nf(a)}·(x − ${nf(xv)})² + ${nf(Tm)}. A condição T ≤ ${nf(lim)} vira ${nf(a)}·(x − ${nf(xv)})² ≤ ${nf(delta)}, isto é, a distância até o vértice não pode passar de √(${nf(delta)} / ${nf(a)}) ≈ ${nf(h, 2)}. Servem rotações de ${nf(xv - h, 2)} a ${nf(xv + h, 2)}.`, d === 2 ? 'Neste nível a janela é estreita e o sensor estava corrompido: sem a leitura da temperatura, só acerta quem calcula o vértice.' : 'Repare que a janela fica centrada no vértice. É a simetria da parábola: pontos à mesma distância do vértice têm a mesma temperatura.'],
    log: 'temperatura dos racks acima do limite.'
  };
}});

/* 5 — Sistemas lineares */
const det2 = M => M[0][0] * M[1][1] - M[0][1] * M[1][0];
const det3 = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
const eqStr = (co, rhs, vs) => { let s = ''; co.forEach((c, k) => { if (!c) return; const ab = Math.abs(c), term = (ab === 1 ? '' : ab) + vs[k]; if (!s) s = (c < 0 ? '−' : '') + term; else s += (c < 0 ? ' − ' : ' + ') + term; }); return s + ' = ' + nf(rhs); };
L.push({ phase: 2, title: 'Balanceamento de carga', gen(r, d) {
  let M, s, vs;
  for (;;) {
    if (d < 2) {
      vs = ['x', 'y']; s = [5 * ri(r, 4, 16), 5 * ri(r, 4, 16)]; if (s[0] === s[1]) continue;
      M = d === 0 ? [[1, 1], [1, -1]] : [[pick(r, [2, 3]), pick(r, [1, 2])], [1, pick(r, [-1, -2])]];
      if (!det2(M)) continue;
    } else {
      vs = ['x', 'y', 'z']; s = [0, 0, 0].map(() => 5 * ri(r, 4, 18)); if (new Set(s).size < 3) continue;
      M = [[1, 1, 1], [0, 0, 0].map(() => ri(r, -3, 3)), [0, 0, 0].map(() => ri(r, -3, 3))];
      if (M[1].filter(v => v).length < 2 || M[2].filter(v => v).length < 2) continue;
      const D = det3(M); if (!D || Math.abs(D) > 40) continue;
    }
    break;
  }
  const n = vs.length, rhs = M.map(row => row.reduce((acc, c, k) => acc + c * s[k], 0));
  const D = n === 2 ? det2(M) : det3(M);
  const Di = vs.map((_, k) => { const Mk = M.map((row, i) => row.map((c, j) => j === k ? rhs[i] : c)); return n === 2 ? det2(Mk) : det3(Mk); });
  const eqs = M.map((row, i) => eqStr(row, rhs[i], vs));
  const matrix = `<div class="matrix scroll">${mx(M.map(row => row.map(c => nf(c))))}<span>·</span>${mx(vs.map(v => [v]))}<span>=</span>${mx(rhs.map(v => [nf(v)]))}</div>`;
  let sc;
  if (d === 0) sc = `O tráfego precisa ser dividido entre dois nós de borda sem sobrecarregar nenhum. Seja x a carga do nó 1 e y a carga do nó 2, em mil pacotes por segundo. Pelo canal principal passam ${nf(rhs[0])} mil pacotes por segundo no total, e o nó 1 deve receber ${rhs[1] >= 0 ? nf(rhs[1]) + ' a mais' : nf(-rhs[1]) + ' a menos'} que o nó 2. Isso gera o sistema ${eqs[0]} e ${eqs[1]}, escrito em forma de matriz A·x = b logo abaixo.`;
  else if (d === 1) sc = `O tráfego precisa ser dividido entre dois nós de borda. Seja x a carga do nó 1 e y a carga do nó 2, em mil pacotes por segundo. Os pesos dos canais impõem duas condições: ${eqs[0]} e ${eqs[1]}. Em forma de matriz, A é a matriz dos coeficientes, x é o vetor das cargas e b é o vetor das condições.`;
  else sc = `O NullSet derrubou o balanceador, e a carga precisa ser redistribuída entre três nós (x, y e z, em mil pacotes por segundo). O total que chega ao núcleo é ${nf(rhs[0])}, e os pesos dos canais impõem mais duas condições. O sistema completo é: ${eqs.join('; ')}. Considere que, em regime estacionário, tudo o que entra no núcleo sai pelos três nós.`;
  const sol = ['Cada equação é uma condição que as cargas precisam cumprir ao mesmo tempo. Antes de resolver, verificamos se existe uma única solução.'];
  const detTxt = n === 2
    ? `det(A) = ${pp(M[0][0])}·${pp(M[1][1])} − ${pp(M[0][1])}·${pp(M[1][0])} = ${nf(D)}`
    : `Expandindo pela primeira linha: det(A) = ${pp(M[0][0])}·[${pp(M[1][1])}·${pp(M[2][2])} − ${pp(M[1][2])}·${pp(M[2][1])}] − ${pp(M[0][1])}·[${pp(M[1][0])}·${pp(M[2][2])} − ${pp(M[1][2])}·${pp(M[2][0])}] + ${pp(M[0][2])}·[${pp(M[1][0])}·${pp(M[2][1])} − ${pp(M[1][1])}·${pp(M[2][0])}] = ${nf(D)}`;
  sol.push(`${detTxt}. Como det(A) ≠ 0, as equações não se repetem nem se contradizem, e o sistema tem exatamente uma solução.`);
  if (d === 0) sol.push(`Por eliminação: somando as duas equações, os termos +y e −y se cancelam e sobra 2x = ${nf(rhs[0] + rhs[1])}, então x = ${nf(s[0])}. Substituindo na primeira: y = ${nf(rhs[0])} − ${nf(s[0])} = ${nf(s[1])}.`);
  if (d === 1) { const [p0, q0] = M[0], r1 = M[1][1]; sol.push(`Por eliminação: multiplique a segunda equação por ${p0} para igualar o coeficiente de x e subtraia da primeira. O x desaparece: (${nf(q0)} − ${nf(p0)}·${pp(r1)})·y = ${nf(rhs[0])} − ${nf(p0)}·${pp(rhs[1])}, ou seja, ${nf(q0 - p0 * r1)}y = ${nf(rhs[0] - p0 * rhs[1])}, e y = ${nf(s[1])}. Pela segunda equação, x = ${nf(rhs[1])} − ${pp(r1)}·${nf(s[1])} = ${nf(s[0])}.`); }
  sol.push(`Pela regra de Cramer, cada incógnita é det(Aᵢ) / det(A), em que Aᵢ é a matriz A com a coluna daquela incógnita trocada pelo vetor b.`);
  vs.forEach((v, k) => sol.push(`Trocando a coluna de ${v} por b: det(A${v}) = ${nf(Di[k])}, então ${v} = ${nf(Di[k])} / ${pp(D)} = ${nf(s[k])}.`));
  const lhs = row => row.map((c, k) => [c, k]).filter(([c]) => c).map(([c, k], i) => { const ab = Math.abs(c), t = (ab === 1 ? '' : nf(ab) + '·') + nf(s[k]); return i === 0 ? (c < 0 ? '−' : '') + t : (c < 0 ? ' − ' : ' + ') + t; }).join('');
  sol.push('Conferência em todas as equações: ' + M.map((row, i) => lhs(row) + ' = ' + nf(rhs[i]) + ' ✓').join('; ') + '.');
  sol.push(`Resultado: ${vs.map((v, k) => `nó ${k + 1} (${v}) com ${nf(s[k])} mil pacotes por segundo`).join(', ')}.`);
  return {
    kind: 'num', M, rhs, solution: s, extra: matrix,
    fields: vs.map((v, k) => ({ label: v, ans: s[k], tol: 1e-6 })),
    sc, q: 'Resolva o sistema e informe a carga de cada nó.',
    hint: d < 2 ? 'Some ou subtraia as equações para eliminar uma variável, ache a outra e substitua.' : 'Use a regra de Cramer: cada variável é det(Aᵢ) / det(A), em que Aᵢ troca a coluna da variável pelo vetor b.',
    sol, log: 'balanceador de carga fora do ar.'
  };
}});

/* 6 — Regressão linear (dashboard preditivo) */
L.push({ phase: 2, title: 'Previsão de capacidade', gen(r, d) {
  const xs = [1, 2, 3, 4, 5, 6], n = 6, Sx = 21, Sxx = 91;
  for (;;) {
    const bt = ri(r, 10, 25), at = ri(r, 100, 300), nz = [0, 6, 9][d];
    const ys = xs.map(x => at + bt * x + (nz ? ri(r, -nz, nz) : 0));
    const Sy = sum(ys), Sxy = sum(xs.map((x, k) => x * ys[k]));
    const num = n * Sxy - Sx * Sy, den = n * Sxx - Sx * Sx, bh = num / den, ah = Sy / n - bh * Sx / n;
    if (bh <= 3) continue;
    const m = ri(r, 10, 20);
    const cap = Math.round((ah + bh * (m - 1 + 0.25 + 0.5 * r())) / 10) * 10;
    const xc = (cap - ah) / bh;
    if (Math.ceil(xc) !== m || xc - (m - 1) < 0.15 || m - xc < 0.15) continue;
    const table = `<div class="scroll"><table class="dt"><tr><th>Mês (x)</th>${xs.map(x => '<td>' + x + '</td>').join('')}</tr><tr><th>Uso em GB (y)</th>${ys.map(y => '<td>' + y + '</td>').join('')}</tr></table></div>` + (d === 1 ? `<p class="sums">n = 6 · Σx = 21 · Σx² = 91 · Σy = ${nf(Sy)} · Σxy = ${nf(Sxy)}</p>` : '');
    const fields = d === 2 ? [{ label: 'b', ans: bh, tol: 0.02 }, { label: 'Mês', ans: m, tol: 1e-6 }] : [{ label: 'Mês', ans: m, tol: 1e-6 }];
    return {
      kind: 'num', xs, ys, cap, fit: { a: ah, b: bh }, month: m, fields, extra: table,
      chart: C.svgScatter(xs, ys, cap, m + 2, null),
      sc: `O dashboard preditivo mostra o uso do disco principal de armazenamento nos últimos seis meses. O NullSet está gravando lixo, e você precisa planejar a expansão antes do colapso. A capacidade do disco é ${cap} GB. Para prever quando ele lota, ajuste uma reta de tendência ŷ = a + b·x pelo método dos mínimos quadrados, em que x é o mês e ŷ é o uso previsto em GB.${d === 0 ? ' Neste nível os dados estão perfeitamente alinhados.' : ''}`,
      q: d < 2 ? `Em que mês (número inteiro) o uso previsto atinge ou ultrapassa ${cap} GB?` : `Calcule o coeficiente angular b (GB por mês, com duas casas decimais) e o primeiro mês inteiro em que o uso previsto atinge ou ultrapassa ${cap} GB.`,
      hint: d === 0 ? 'Os pontos estão em linha reta: o uso cresce o mesmo valor todo mês. Ache esse crescimento (b), o valor no mês 0 (a) e resolva a + b·x ≥ capacidade.' : 'b = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²) e a = ȳ − b·x̄. Depois resolva a + b·x ≥ capacidade e arredonde para cima.',
      sol: ['Monte uma tabela com x, y, x² e x·y e some cada coluna. Essas somas são tudo o que as fórmulas dos mínimos quadrados precisam:', vtab(['x (mês)', 'y (GB)', 'x²', 'x·y'], xs.map((x, k) => [x, ys[k], x * x, x * ys[k]]), ['Σx = 21', 'Σy = ' + nf(Sy), 'Σx² = 91', 'Σxy = ' + nf(Sxy)]), `Inclinação: b = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²) = (6·${nf(Sxy)} − 21·${nf(Sy)}) / (6·91 − 21²) = ${nf(num)} / 105 ≈ ${nf(bh, 4)}. O uso cresce, em média, ${nf(bh, 2)} GB por mês.`, `Intercepto: a = ȳ − b·x̄, com x̄ = 21 / 6 = 3,5 e ȳ = ${nf(Sy)} / 6 ≈ ${nf(Sy / 6, 4)}. Então a ≈ ${nf(Sy / 6, 4)} − ${nf(bh, 4)}·3,5 ≈ ${nf(ah, 4)} GB. Essa conta faz a reta passar pelo ponto médio dos dados, (x̄, ȳ).`, `Reta de tendência: ŷ ≈ ${nf(ah, 2)} + ${nf(bh, 2)}·x. Para saber quando o disco lota, resolva ŷ ≥ ${cap}: x ≥ (${cap} − ${nf(ah, 2)}) / ${nf(bh, 2)} ≈ ${nf(xc, 3)}.`, `O mês é inteiro e no mês ${m - 1} o disco ainda não lotou, então arredondamos para cima: mês ${m}. Conferência: ŷ(${m - 1}) ≈ ${nf(ah + bh * (m - 1), 1)} < ${cap} e ŷ(${m}) ≈ ${nf(ah + bh * m, 1)} ≥ ${cap}.`, C.svgScatter(xs, ys, cap, m + 2, { a: ah, b: bh }), 'No gráfico, a linha tracejada é a reta ajustada e o círculo marca o ponto em que ela cruza a capacidade.'],
      log: 'storage enchendo. Dashboard preditivo disponível.'
    };
  }
}});

/* 7 — Senhas (análise combinatória) */
L.push({ phase: 3, title: 'Quebra de senha', gen(r, d) {
  let sc, a1, s1, n, k2;
  if (d === 0) {
    const k = ri(r, 3, 5); n = ri(r, 4, 7); k2 = 2; a1 = Math.pow(10, k);
    sc = `O cofre digital pede um PIN de ${k} dígitos (0 a 9), e os dígitos podem se repetir. Além disso, o protocolo de reset de emergência exige escolher ${k2} nós entre ${n} disponíveis, e a ordem da escolha não importa.`;
    s1 = [`Cada uma das ${k} posições do PIN pode ser qualquer dígito de 0 a 9, inclusive repetido, então todas têm 10 opções. Pelo princípio multiplicativo: ${Array(k).fill(10).join('·')} = 10^${k} = ${nf(a1)} senhas.`];
  } else if (d === 1) {
    const k = ri(r, 3, 4); n = ri(r, 5, 8); k2 = ri(r, 2, 3); a1 = C.perm(10, k);
    sc = `O cofre digital usa tokens de ${k} dígitos distintos (0 a 9), e a ordem importa (123 é diferente de 321). Além disso, o reset de emergência exige escolher ${k2} nós entre ${n}, sem importar a ordem da escolha.`;
    s1 = [`Posição por posição: a 1ª tem 10 opções; a 2ª tem 9, porque o dígito já usado não pode repetir; a 3ª tem 8${k === 4 ? '; a 4ª tem 7' : ''}. Multiplicando: ${[...Array(k)].map((_, i) => 10 - i).join('·')} = ${nf(a1)} senhas.`, `Isso é o arranjo A(10, ${k}) = 10! / ${10 - k}!. É arranjo, e não combinação, porque a ordem importa: 123 e 321 são senhas diferentes.`];
  } else {
    const m = ri(r, 2, 3), j = ri(r, 2, 3), v = ri(r, 0, 1); n = ri(r, 6, 9); k2 = ri(r, 3, 4);
    const L1 = C.perm(26, m), D1 = v ? 9 * C.perm(9, j - 1) : C.perm(10, j); a1 = L1 * D1;
    sc = `O cofre exige uma chave com ${m} letras distintas (26 possíveis) seguidas de ${j} dígitos distintos (0 a 9); a ordem dos caracteres importa (ABC é diferente de BAC)${v ? ', e o primeiro dígito não pode ser 0' : ''}. Além disso, o reset exige escolher ${k2} nós entre ${n}, sem importar a ordem.`;
    s1 = [`Letras: a 1ª tem 26 opções e cada letra seguinte tem uma a menos, porque não podem repetir: A(26, ${m}) = ${[...Array(m)].map((_, i) => 26 - i).join('·')} = ${nf(L1)}.`, v ? `Dígitos: o primeiro não pode ser 0, então tem 9 opções (1 a 9). O segundo pode ser 0, mas não pode repetir o primeiro, então também tem 9${j === 3 ? '; o terceiro tem 8' : ''}: ${[9, ...[...Array(j - 1)].map((_, i) => 9 - i)].join('·')} = ${nf(D1)}.` : `Dígitos: distintos e com ordem importando, A(10, ${j}) = ${[...Array(j)].map((_, i) => 10 - i).join('·')} = ${nf(D1)}.`, `Letras e dígitos são escolhas feitas uma depois da outra, então multiplicamos (princípio multiplicativo): ${nf(L1)} · ${nf(D1)} = ${nf(a1)} senhas.`];
  }
  const a2 = C.comb(n, k2);
  return {
    kind: 'num', fields: [{ label: 'Senhas', ans: a1, tol: 1e-6 }, { label: 'Formas', ans: a2, tol: 1e-6 }],
    sc, q: 'Quantas senhas são possíveis? E de quantas formas se escolhem os nós do reset?',
    hint: d === 0 ? 'Com repetição, cada posição tem 10 opções: multiplique. Para os nós, a ordem não importa: C(n,k) = n! / (k!(n−k)!). Na calculadora: C(6;2).' : d === 1 ? 'Ordem importa e sem repetição: arranjo A(n,k) = n! / (n−k)!. Ordem não importa: combinação C(n,k). Na calculadora: A(10;3) e C(6;2).' : 'Multiplique as opções de cada posição (princípio multiplicativo); letras não se repetem entre si, nem dígitos entre si. Para os nós, use C(n,k).',
    sol: [...s1, `Nós do reset: escolher ${k2} nós entre ${n} forma um grupo, e a ordem da escolha não importa ({N1, N2} é o mesmo grupo que {N2, N1}). Por isso é combinação.`, `C(${n}, ${k2}) = A(${n}, ${k2}) / ${k2}! = ${nf(C.perm(n, k2))} / ${nf(C.fact(k2))} = ${nf(a2)}. Dividimos por ${k2}! porque cada grupo aparece ${k2}! vezes no arranjo, uma para cada ordem dos seus elementos.`],
    log: 'cofre digital bloqueado. Chave de acesso desconhecida.'
  };
}});

/* 8 — Discos RAID (probabilidade) */
const binom = (n, k, p) => C.comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
const RAID_TAIL = ' Considere que os discos falham de forma independente (uma simplificação: na prática, falhas podem ter causas comuns).';
L.push({ phase: 3, title: 'Risco de falha de disco', gen(r, d) {
  for (;;) {
    const v = d === 0 ? pick(r, ['r0', 'r1']) : d === 1 ? 'r5' : pick(r, ['r5d', 'r6']);
    let o;
    if (v === 'r0') {
      const n = ri(r, 2, 4), p = ri(r, 2, 10) / 100, ans = 1 - Math.pow(1 - p, n);
      o = { ans, raid: 'RAID 0', n, sc: `O volume usa RAID 0 (striping) com ${n} discos: os dados ficam divididos entre eles, então a falha de qualquer disco causa perda de dados. Cada disco tem probabilidade ${nf(p)} de falhar até o backup.`,
        hint: 'RAID 0 não tolera falhas: P(perda) = 1 − P(nenhum disco falha) = 1 − (1 − p)ⁿ.',
        sol: ['O RAID 0 divide os dados entre os discos e não tolera nenhuma falha: basta um disco falhar para haver perda.', 'Calcular “pelo menos um falha” diretamente exigiria somar muitos casos (só o disco 1, só o 2, os dois…). Pelo complemento é mais curto: P(perda) = 1 − P(nenhum falha).', `Cada disco resiste com probabilidade 1 − ${nf(p)} = ${nf(1 - p)}. Como as falhas são independentes, a chance de todos os ${n} resistirem é o produto: ${nf(1 - p)}^${n} = ${nf(Math.pow(1 - p, n), 6)}.`, `P(perda) = 1 − ${nf(Math.pow(1 - p, n), 6)} ≈ ${nfx(ans, 4)}. Repare que é maior que a chance de um disco sozinho (${nf(p)}): mais discos sem redundância, mais risco.`] };
    } else if (v === 'r1') {
      const p1 = ri(r, 10, 30) / 100, p2 = ri(r, 10, 30) / 100, ans = p1 * p2;
      o = { ans, raid: 'RAID 1', n: 2, sc: `O volume usa RAID 1 (espelhamento) com 2 discos antigos: cada um guarda uma cópia completa, então só há perda se os dois falharem. O disco A falha com probabilidade ${nf(p1)} e o disco B com ${nf(p2)} até o backup.`,
        hint: 'No espelhamento só há perda se os dois falharem: eventos independentes se multiplicam, P(A e B) = P(A)·P(B).',
        sol: ['No RAID 1 cada disco guarda uma cópia completa dos dados, então só há perda se os dois falharem.', `Como as falhas são independentes, a chance de as duas acontecerem é o produto: P(A e B) = ${nf(p1)} · ${nf(p2)} = ${nfx(ans, 4)}.`, `O espelhamento reduz muito o risco: cada disco sozinho falha com ${nf(p1)} ou ${nf(p2)}, mas os dois juntos só com ${nfx(ans, 4)}.`] };
    } else if (v === 'r5') {
      const n = ri(r, 3, 6), p = ri(r, 4, 15) / 100, P0 = Math.pow(1 - p, n), P1 = n * p * Math.pow(1 - p, n - 1), ans = 1 - P0 - P1;
      o = { ans, raid: 'RAID 5', n, sc: `O volume usa RAID 5 com ${n} discos: a paridade distribuída permite perder 1 disco sem perder dados, mas 2 ou mais falhas causam perda. Cada disco falha com probabilidade ${nf(p)} até o backup.`,
        hint: 'RAID 5 tolera 1 falha: P(perda) = 1 − P(0 falhas) − P(1 falha), com P(1) = n·p·(1 − p)ⁿ⁻¹.',
        sol: ['O RAID 5 tolera 1 falha. Há perda com 2 ou mais falhas, e é mais curto calcular o oposto: P(perda) = 1 − P(0 falhas) − P(1 falha).', `P(0): todos os ${n} discos resistem, (1 − ${nf(p)})^${n} = ${nf(1 - p)}^${n} = ${nf(P0, 6)}.`, `P(1): exatamente um disco falha. Há C(${n}, 1) = ${n} escolhas de qual disco falha, e cada caso tem probabilidade ${nf(p)}·${nf(1 - p)}^${n - 1} (um falha, os outros ${n - 1} resistem). Então P(1) = ${n}·${nf(p)}·${nf(1 - p)}^${n - 1} = ${nf(P1, 6)}.`, `P(perda) = 1 − ${nf(P0, 6)} − ${nf(P1, 6)} ≈ ${nfx(ans, 4)}.`] };
    } else if (v === 'r5d') {
      const n = ri(r, 4, 8), q = ri(r, 1, 6) / 100, ans = 1 - Math.pow(1 - q, n - 1);
      o = { ans, raid: 'RAID 5 degradado', n, cond: true, sc: `O volume usa RAID 5 com ${n} discos, e um deles já falhou: o arranjo está degradado e em reconstrução. Durante a reconstrução, cada um dos ${n - 1} discos restantes falha com probabilidade ${nf(q)}, e qualquer nova falha causa perda de dados.`,
        hint: 'Dado que um disco já falhou, o RAID 5 já gastou sua tolerância: qualquer falha entre os n − 1 restantes causa perda. P = 1 − (1 − q)ⁿ⁻¹.',
        sol: ['Probabilidade condicional: queremos P(perda | um disco já falhou), a chance de perder dados sabendo que um disco já caiu.', `Saber disso muda o cenário. O RAID 5 tolera só 1 falha, e ela já aconteceu; agora qualquer falha entre os ${n - 1} discos restantes causa perda.`, `Pelo complemento: P(nenhum dos ${n - 1} falha) = (1 − ${nf(q)})^${n - 1} = ${nf(Math.pow(1 - q, n - 1), 6)}.`, `P(perda | 1 falha) = 1 − ${nf(Math.pow(1 - q, n - 1), 6)} ≈ ${nfx(ans, 4)}.`, `Compare com o arranjo intacto: com os ${n} discos funcionando e a mesma probabilidade ${nf(q)}, seriam precisas duas falhas, e P(perda) seria ${nfx(1 - Math.pow(1 - q, n) - n * q * Math.pow(1 - q, n - 1), 4)}. Por isso a reconstrução é o momento mais arriscado de um RAID 5.`] };
    } else {
      const n = ri(r, 5, 8), p = ri(r, 8, 20) / 100, Pk = [0, 1, 2].map(k => binom(n, k, p)), ans = 1 - sum(Pk);
      o = { ans, raid: 'RAID 6', n, sc: `O volume usa RAID 6 com ${n} discos: a dupla paridade tolera 2 falhas, e 3 ou mais causam perda de dados. Cada disco falha com probabilidade ${nf(p)} até o backup.`,
        hint: 'RAID 6 tolera 2 falhas: P(perda) = 1 − P(0) − P(1) − P(2), com P(k) = C(n,k)·pᵏ·(1 − p)ⁿ⁻ᵏ.',
        sol: ['O RAID 6 tolera 2 falhas. Há perda com 3 ou mais, então P(perda) = 1 − P(0) − P(1) − P(2).', 'Cada P(k) vem da distribuição binomial, P(k) = C(n, k)·pᵏ·(1 − p)ⁿ⁻ᵏ: C(n, k) conta quais discos falham, pᵏ é a chance de esses k falharem e (1 − p)ⁿ⁻ᵏ é a chance de os outros resistirem.', ...Pk.map((v_, k) => `P(${k}) = C(${n}, ${k})·${nf(p)}^${k}·${nf(1 - p)}^${n - k} = ${nf(C.comb(n, k))}·${nf(Math.pow(p, k), 6)}·${nf(Math.pow(1 - p, n - k), 6)} = ${nf(v_, 6)}.`), `P(perda) = 1 − ${Pk.map(v_ => nf(v_, 6)).join(' − ')} ≈ ${nfx(ans, 4)}.`] };
    }
    if (o.ans < 0.01 || o.ans > 0.9) continue;
    return {
      kind: 'num', variant: v, raid: o.raid, prob: o.ans, fields: [{ label: 'P(perda)', ans: o.ans, tol: 0.00051 }],
      sc: 'A rotina crítica do banco de dados precisa rodar antes do próximo backup automático, e você precisa decidir se isola o armazenamento ou arrisca. ' + o.sc + RAID_TAIL,
      q: o.cond ? 'Qual a probabilidade de perda de dados, dado que um disco já falhou? Responda entre 0 e 1, com 4 casas decimais.' : 'Qual a probabilidade de perda de dados até o backup? Responda entre 0 e 1, com 4 casas decimais.',
      hint: o.hint, sol: [...o.sol, o.ans > 0.1 ? 'Risco alto: isole o volume antes de rodar a rotina crítica.' : 'Risco moderado: dá para rodar a rotina, mas monitore os discos.'],
      log: 'discos instáveis no Cofre Central.'
    };
  }
}});

/* 9 — Equivalência lógica */
C.POOL9 = [
  [['¬(P ∨ Q)', '¬P ∧ ¬Q', ['¬P ∨ ¬Q', 'P ∧ Q', '¬P ∨ Q'], 'Lei de De Morgan: a negação de um OU vira um E das negações.',
    '“Não é verdade que o Web ou o Banco está no ar” é o mesmo que “o Web está fora e o Banco está fora”. Em código, `!(a || b)` é igual a `!a && !b`.',
    'Negar cada termo e esquecer de trocar o conectivo: ¬P ∨ ¬Q não é a negação de P ∨ Q.'],
   ['¬(P ∧ Q)', '¬P ∨ ¬Q', ['¬P ∧ ¬Q', 'P ∨ Q', 'P → Q'], 'Lei de De Morgan: a negação de um E vira um OU das negações.',
    '“Não é verdade que tenho crachá e senha” é o mesmo que “me falta o crachá ou me falta a senha”. Em código, `!(a && b)` é igual a `!a || !b`.',
    'Negar cada termo e esquecer de trocar o conectivo: ¬P ∧ ¬Q exige que faltem os dois, o que é forte demais.']],
  [['P → Q', '¬P ∨ Q', ['P ∨ ¬Q', '¬P ∧ Q', 'Q → P'], 'Condicional como disjunção: P → Q só falha quando P é V e Q é F, exatamente como ¬P ∨ Q.',
    '“Se chove, levo guarda-chuva” só é quebrada quando chove e eu não levo. É o mesmo que dizer “não chove, ou levo guarda-chuva”.',
    'Achar que P → Q equivale a Q → P. “Se chove, levo guarda-chuva” não diz que só levo guarda-chuva quando chove.'],
   ['P → Q', '¬Q → ¬P', ['Q → P', '¬P → ¬Q', 'P ∧ ¬Q'], 'Contrapositiva: trocar os lados e negar os dois mantém o valor. A recíproca (Q → P) e a inversa (¬P → ¬Q) não são equivalentes.',
    '“Se é administrador, tem acesso total” equivale a “se não tem acesso total, não é administrador”. Já “se tem acesso total, é administrador” (a recíproca) diz outra coisa.',
    'Confundir a contrapositiva (¬Q → ¬P) com a recíproca (Q → P) ou com a inversa (¬P → ¬Q). Só a contrapositiva troca os lados e nega os dois.'],
   ['¬(P ∧ ¬Q)', 'P → Q', ['¬P ∧ Q', 'P ∨ ¬Q', 'Q → P'], 'De Morgan dá ¬P ∨ Q, que é a forma de disjunção de P → Q.',
    '“Nunca acontece de o Web estar no ar sem o Banco” é o mesmo que “se o Web está no ar, o Banco está no ar”.',
    'Aplicar De Morgan e esquecer que ¬(¬Q) = Q: a dupla negação se cancela.']],
  [['¬(P → Q)', 'P ∧ ¬Q', ['¬P ∨ Q', '¬P ∧ Q', 'P ∨ ¬Q'], 'Negação da condicional: P → Q ≡ ¬P ∨ Q; negando com De Morgan, sobra P ∧ ¬Q.',
    'A única forma de quebrar “se chove, levo guarda-chuva” é chover e eu não levar. Por isso a negação da promessa é “chove e não levo”.',
    'Achar que a negação de uma implicação é outra implicação, como P → ¬Q. A negação de “se P, então Q” é uma afirmação com ∧: P aconteceu e Q não.'],
   ['P ↔ Q', '(P → Q) ∧ (Q → P)', ['(P → Q) ∨ (Q → P)', 'P ∧ Q', '(P ∧ Q) ∨ ¬P'], 'Bicondicional: vale nos dois sentidos, então é a conjunção das duas condicionais.',
    '“A porta abre se e somente se o crachá é válido” diz duas coisas: crachá válido abre a porta, e a porta só abre com crachá válido.',
    'Ligar as duas condicionais com ∨. (P → Q) ∨ (Q → P) é sempre V, porque uma das duas sempre vale.'],
   ['¬(P ↔ Q)', '(P ∧ ¬Q) ∨ (¬P ∧ Q)', ['(P ∧ Q) ∨ (¬P ∧ ¬Q)', '¬P ↔ ¬Q', 'P ∨ Q'], 'Negar a bicondicional dá o ou exclusivo: exatamente um dos dois é V.',
    '“Os dois servidores não estão no mesmo estado” significa que exatamente um deles está no ar. Em código, é o ou exclusivo: `a !== b`.',
    'Confundir com P ∨ Q, que também é V quando os dois estão no ar.'],
   ['P → (Q → R)', '(P ∧ Q) → R', ['(P → Q) → R', '(P ∨ Q) → R', 'Q → (P ∧ R)'], 'Exportação: “se P, então (se Q, então R)” equivale a “se P e Q, então R”.',
    '“Se é dia útil, então, se for horário comercial, o suporte atende” é o mesmo que “se é dia útil e horário comercial, o suporte atende”.',
    'Mover os parênteses para a esquerda: (P → Q) → R não é a mesma regra.']]
];
L.push({ phase: 3, title: 'Desarmando o contador', gen(r, d) {
  const [src, good, bad, law, exTxt, pit] = pick(r, C.POOL9[d]);
  const distract = bad.filter(x => !C.equiv(src, x));
  const opts = shuffle(r, [good, ...distract]);
  const vs = C.varsOf(src + good + bad.join(''));
  const why = distract.map(x => {
    const a = C.column(src, vs), b = C.column(x, vs), k = a.findIndex((v, i) => v !== b[i]);
    return `${x} falha em ${rowTxt(vs, C.rowsFor(vs)[k])}: o original dá ${VF(a[k])} e ela dá ${VF(b[k])}.`;
  });
  return {
    kind: 'mc', options: opts, correct: opts.indexOf(good), src, good,
    sc: `Você chegou ao código-fonte do vírus. O contador regressivo é protegido pela condição ${src}. O terminal de desarme só aceita uma expressão logicamente equivalente escrita de outra forma: mesma tabela-verdade, conectivos diferentes. P e Q${vs.includes('R') ? ' e R' : ''} são subsistemas que o vírus liga e desliga.`,
    q: `Qual expressão é logicamente equivalente a ${src}?`,
    hint: law.split(':')[0] + '. Monte a tabela-verdade das duas expressões e compare as colunas.',
    law, exTxt, pit,
    sol: [`${src} ≡ ${good}. ${law}`, 'Para confirmar, monte a tabela-verdade das duas expressões:', ttHTML(vs, [{ s: src, vals: C.column(src, vs), main: true }, { s: good, vals: C.column(good, vs), main: true }]), 'As duas colunas são iguais em todas as linhas, então as expressões são equivalentes.', ...(why.length ? ['Cada alternativa errada tem pelo menos uma linha diferente, um contraexemplo:', ...why] : [])],
    log: 'contador regressivo protegido por condição lógica.'
  };
}});

/* ---------- O conceito, um exemplo simples e o erro comum de cada nó ---------- */
const CONNECTIVE = {
  '¬': '¬ (não) inverte o valor: ¬V = F e ¬F = V.',
  '∧': '∧ (e) só é V quando as duas partes são V.',
  '∨': '∨ (ou) é V quando pelo menos uma parte é V; só é F quando as duas são F.',
  '→': '→ (se… então) é uma promessa: só é F quando a condição é V e a consequência é F.',
  '↔': '↔ (se e somente se) é V quando as duas partes têm o mesmo valor.'
};
const setOf = arr => '{' + arr.join(', ') + '}';

/* 1 — Tabela-verdade */
L[0].learn = function (o) {
  const ops = Object.keys(CONNECTIVE).filter(c => o.formula.includes(c));
  const EX = [
    ['P ∧ Q', 'Regra da porta do data center: L = P ∧ Q, em que P = “tenho crachá” e Q = “sei a senha”.', 'Só há uma linha V: com crachá e com senha. Faltando qualquer um dos dois, a porta não abre.'],
    ['P → Q', 'Regra do dia a dia: L = P → Q, em que P = “está chovendo” e Q = “levo guarda-chuva”.', 'A única linha F é P = V e Q = F: choveu e você não levou o guarda-chuva, então a promessa foi quebrada. Quando não chove (P = F), a promessa nem foi testada, e a implicação vale V.'],
    ['P ∨ Q', 'Regra de disponibilidade: L = P ∨ Q, em que P = “servidor 1 no ar” e Q = “servidor 2 no ar”.', 'Só há uma linha F: os dois servidores caídos. Se pelo menos um funciona, o site fica no ar, inclusive quando os dois funcionam.']
  ];
  const ex = EX.find(e => e[0] !== o.formula);
  const pit = ops.includes('→') ? 'Marcar P → Q como F quando P é F. Se a condição não aconteceu, a regra não foi quebrada, então o resultado é V.'
    : ops.includes('↔') ? 'Confundir ↔ com ∧: P ↔ Q também é V quando P e Q são os dois F.'
    : 'Tratar ∨ como “um ou outro, mas não os dois”. No ∨ da lógica, os dois V também dão V.';
  return {
    concept: [
      'Uma proposição é uma afirmação que só pode ser verdadeira (V) ou falsa (F), como “o Servidor Web está no ar”. Os conectivos ¬, ∧, ∨, → e ↔ juntam proposições simples em regras compostas, e o valor da regra depende só dos valores das partes.',
      'A tabela-verdade lista todas as combinações possíveis das variáveis e o valor da regra em cada uma. Com n variáveis são 2ⁿ linhas, porque cada variável nova dobra o número de casos: 2 variáveis dão 4 linhas, 3 dão 8. Em segurança, isso garante que nenhuma situação dos servidores fica sem teste.',
      'Nesta regra aparecem: ' + ops.map(c => CONNECTIVE[c]).join(' ')
    ],
    example: [ex[1], ttHTML(['P', 'Q'], [{ s: ex[0], vals: C.column(ex[0], ['P', 'Q']), main: true }]), ex[2], o.vars.length === 3 ? 'Com três variáveis o método é o mesmo; a tabela só fica com 2³ = 8 linhas.' : ''].filter(Boolean),
    pitfall: pit
  };
};

/* 2 — Conjuntos */
L[1].learn = function () {
  const A = [1, 2, 3, 4], B = [3, 4, 5], Cc = [4, 6];
  const i = inter(A, B), u = uni(A, B);
  return {
    concept: [
      'Um conjunto é uma coleção de elementos sem repetição e sem ordem. Aqui, cada lista do firewall é um conjunto de endereços IP, e uma regra de bloqueio é uma expressão que combina esses conjuntos.',
      'Cada operação responde a uma pergunta. A interseção A ∩ B reúne o que está em A e também em B. A união A ∪ B reúne o que está em pelo menos um dos dois. A diferença A − B reúne o que está em A, mas não em B. Elas correspondem aos conectivos lógicos ∧, ∨ e “e não”.',
      'Como na aritmética, os parênteses dizem o que fazer primeiro. Um jeito seguro de resolver é testar elemento por elemento: para cada IP, pergunte se ele está em A, em B e em C, e aplique a regra.'
    ],
    example: [
      `Pense em A como as pessoas com crachá e B como as pessoas dentro do prédio: A ∩ B são as que estão no prédio com crachá, e B − A são as que estão no prédio sem crachá. Com números: A = ${setOf(A)}, B = ${setOf(B)} e C = ${setOf(Cc)}.`,
      htab([['A ∩ B', setOf(i) + ' (estão nos dois)'], ['A ∪ B', setOf(u) + ' (estão em pelo menos um)'], ['A − B', setOf(dif(A, B)) + ' (estão em A, mas não em B)'], ['(A ∩ B) − C', setOf(i) + ' − ' + setOf(Cc) + ' = ' + setOf(dif(i, Cc))]], 'l')
    ],
    pitfall: `Ignorar os parênteses. No exemplo, (A ∪ B) − C = ${setOf(dif(u, Cc))}, mas A ∪ (B − C) = ${setOf(uni(A, dif(B, Cc)))}: o elemento 4 muda de lado.`
  };
};

/* 3 — Exponencial */
L[2].learn = function () {
  const f = k => 2 * Math.pow(3, k);
  let xe = 0; while (f(xe) <= 100) xe++;
  let xl = 0; while (2 + 4 * xl <= 100) xl++;
  return {
    concept: [
      'Numa função exponencial f(x) = a·bˣ, a variável x fica no expoente. O número a é o valor inicial, porque f(0) = a·b⁰ = a, e b é o fator de crescimento: a cada unidade de x, o valor é multiplicado por b.',
      'Com b > 1, o crescimento parece pequeno no começo e explode depois. É isso que a diferencia de uma função linear, que soma sempre o mesmo valor. Por isso, neste modelo simplificado de ataque DDoS, a banda parece segura nos primeiros minutos e cai de repente.',
      'Para descobrir quando f(x) passa de um limite L, há dois caminhos: testar minuto a minuto, ou isolar a potência e usar logaritmo, que “traz o expoente para baixo”: ln(bˣ) = x·ln(b).'
    ],
    example: [
      'Tráfego f(x) = 2·3ˣ e capacidade de 100 Gbps.',
      htab([['Minuto x', 0, 1, 2, 3, 4], ['f(x)', ...[0, 1, 2, 3, 4].map(k => k === xe ? '<b>' + f(k) + '</b>' : f(k))]]),
      `O tráfego passa de 100 no minuto ${xe}. Pelo logaritmo: 3ˣ > 50, então x > ln(50) / ln(3) ≈ ${nf(Math.log(50) / Math.log(3), 2)}, e o primeiro inteiro é ${xe}.`,
      `Compare com uma função linear que começa igual, g(x) = 2 + 4x (no primeiro minuto as duas dão 6). Somando 4 por minuto, ela só passaria de 100 no minuto ${xl}.`
    ],
    pitfall: `Arredondar para baixo. Se x > ${nf(Math.log(50) / Math.log(3), 2)}, no minuto ${xe - 1} o tráfego ainda não passou do limite; a resposta é o próximo inteiro.`
  };
};

/* 4 — 2º grau */
L[3].learn = function () {
  const T = x => x * x - 6 * x + 20;
  return {
    concept: [
      'Uma função do 2º grau tem a forma T(x) = ax² + bx + c, e o gráfico dela é uma parábola. O sinal de a define a abertura: com a > 0, ela abre para cima e tem um ponto mais baixo; com a < 0, abre para baixo e tem um ponto mais alto.',
      'Esse ponto extremo é o vértice, em x_v = −b / 2a. A fórmula vem da simetria: a parábola vale c em x = 0 e também em x = −b/a (nesses dois pontos, ax² + bx = 0), e o vértice fica exatamente no meio deles.',
      'No modelo didático do rack, x é a rotação do cooler. Pouca rotação não resfria; rotação demais consome energia e aquece o equipamento. Como a > 0, existe uma rotação que deixa a temperatura mínima: o vértice.'
    ],
    example: [
      'T(x) = x² − 6x + 20. Aqui a = 1, b = −6 e c = 20.',
      `x_v = −(−6) / (2·1) = 3, e T(3) = 9 − 18 + 20 = ${T(3)} °C.`,
      htab([['x', 0, 1, 2, 3, 4, 5, 6], ['T(x)', ...[0, 1, 2, 3, 4, 5, 6].map(x => x === 3 ? '<b>' + T(x) + '</b>' : T(x))]]),
      'Os valores se repetem dos dois lados de x = 3 (15 em x = 1 e x = 5; 20 em x = 0 e x = 6). É a simetria da parábola, e o mínimo fica no meio.'
    ],
    pitfall: 'Errar o sinal em −b / 2a. Se b é negativo, −b fica positivo: com b = −6, x_v = 6 / 2 = 3, e não −3.'
  };
};

/* 5 — Sistemas lineares */
L[4].learn = function (o, d) {
  return {
    concept: [
      'Um sistema linear é um conjunto de equações em que as incógnitas só aparecem multiplicadas por números, sem potências nem produtos entre elas. Cada equação é uma condição, e a solução é o conjunto de valores que cumpre todas ao mesmo tempo.',
      'Na forma matricial A·x = b, a matriz A guarda os coeficientes, o vetor x guarda as incógnitas (as cargas dos nós) e o vetor b guarda o resultado de cada condição. O determinante de A diz se a solução é única: se det(A) ≠ 0, há exatamente uma.',
      d < 2 ? 'Com duas equações, a eliminação é o caminho mais curto: some ou subtraia as equações, multiplicando uma delas se preciso, até sumir uma incógnita. A regra de Cramer chega ao mesmo resultado com determinantes.'
        : 'Com três equações, a regra de Cramer organiza a conta: cada incógnita é det(Aᵢ) / det(A), em que Aᵢ é a matriz A com a coluna daquela incógnita trocada pelo vetor b.',
      'O modelo vem da conservação do fluxo: em regime estacionário, tudo o que entra num nó intermediário precisa sair.'
    ],
    example: [
      'x + y = 10 e x − y = 2. Interpretação: chegam 10 mil pacotes por segundo, e o nó 1 deve receber 2 mil a mais que o nó 2.',
      'Por eliminação: somando as duas equações, y desaparece e sobra 2x = 12, então x = 6. Voltando à primeira, 6 + y = 10, e y = 4.',
      'Pela regra de Cramer: det(A) = 1·(−1) − 1·1 = −2. Trocando a coluna de x por b, det(Ax) = 10·(−1) − 1·2 = −12, e x = −12 / −2 = 6. Trocando a coluna de y, det(Ay) = 1·2 − 10·1 = −8, e y = −8 / −2 = 4.',
      'Conferência: 6 + 4 = 10 e 6 − 4 = 2.'
    ],
    pitfall: 'Errar o sinal de um coeficiente negativo, ou trocar a coluna errada na regra de Cramer. Sempre confira a resposta substituindo em todas as equações.'
  };
};

/* 6 — Regressão linear */
L[5].learn = function () {
  const xs = [1, 2, 3], ys = [2, 4, 5], n = 3;
  const Sx = sum(xs), Sy = sum(ys), Sxx = sum(xs.map(x => x * x)), Sxy = sum(xs.map((x, k) => x * ys[k]));
  const b = (n * Sxy - Sx * Sy) / (n * Sxx - Sx * Sx), a = Sy / n - b * Sx / n;
  const xc = (10 - a) / b, m = Math.ceil(xc);
  return {
    concept: [
      'A regressão linear encontra a reta ŷ = a + b·x que melhor acompanha um conjunto de pontos. Aqui x é o mês e ŷ é o uso previsto do disco. O coeficiente b é a inclinação, quanto o uso cresce em média por mês, e a é o valor estimado no mês 0.',
      '“Melhor” tem um sentido preciso: o método dos mínimos quadrados escolhe a e b que tornam mínima a soma dos quadrados dos resíduos, as distâncias verticais entre cada ponto e a reta. Os quadrados impedem que erros para cima e para baixo se cancelem.',
      'As fórmulas são b = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²) e a = ȳ − b·x̄, e a reta sempre passa pelo ponto médio (x̄, ȳ). Usar a reta para meses futuros é uma extrapolação: ela supõe que a tendência continua.'
    ],
    example: [
      'Três meses de uso: (1, 2), (2, 4) e (3, 5), em GB.',
      vtab(['x', 'y', 'x²', 'x·y'], xs.map((x, k) => [x, ys[k], x * x, x * ys[k]]), ['Σx = ' + Sx, 'Σy = ' + Sy, 'Σx² = ' + Sxx, 'Σxy = ' + Sxy]),
      `b = (3·${Sxy} − ${Sx}·${Sy}) / (3·${Sxx} − ${Sx}²) = ${nf(n * Sxy - Sx * Sy)} / ${nf(n * Sxx - Sx * Sx)} = ${nf(b)}. a = ${Sy}/3 − ${nf(b)}·2 ≈ ${nf(a, 2)}. A reta é ŷ ≈ ${nf(a, 2)} + ${nf(b)}·x.`,
      `Quando ŷ chega a 10 GB? ${nf(a, 2)} + ${nf(b)}·x ≥ 10, então x ≥ ${nf(xc, 2)}, ou seja, no mês ${m}.`
    ],
    pitfall: 'Arredondar b cedo demais. Um erro pequeno na inclinação vira um erro grande quando a reta é estendida por muitos meses; faça as contas com várias casas e arredonde só no fim.'
  };
};

/* 7 — Combinatória */
L[6].learn = function () {
  const S = ['A', 'B', 'C'], rep_ = [], arr = [], comb = [];
  S.forEach(x => S.forEach(y => { rep_.push(x + y); if (x !== y) arr.push(x + y); if (x < y) comb.push('{' + x + ', ' + y + '}'); }));
  return {
    concept: [
      'O princípio multiplicativo diz que, se uma escolha tem m opções e a seguinte tem n, as duas juntas têm m·n possibilidades. Montar uma senha é fazer uma escolha por posição e multiplicar as opções.',
      'Quando a ordem importa e não há repetição, cada escolha tira uma opção da próxima: é o arranjo, A(n, k) = n·(n − 1)·…·(n − k + 1) = n! / (n − k)!. Em senhas a ordem importa, porque 123 e 321 abrem cofres diferentes.',
      'Quando a ordem não importa, como ao escolher um grupo de nós, usamos a combinação, C(n, k) = n! / (k!·(n − k)!). Ela é o arranjo dividido por k!, porque cada grupo aparece k! vezes no arranjo, uma para cada ordem dos seus elementos.'
    ],
    example: [
      'Escolher 2 letras entre A, B e C:',
      htab([[`Com repetição, ordem importa: 3·3 = ${rep_.length}`, rep_.join(' ')], [`Sem repetição, ordem importa (arranjo): 3·2 = ${arr.length}`, arr.join(' ')], [`Sem ordem (combinação): ${arr.length} / 2! = ${comb.length}`, comb.join(' ')]], 'l'),
      'No arranjo, AB e BA contam separado. Na combinação, os dois viram o mesmo grupo {A, B}, por isso o total cai pela metade (2! = 2 ordens de cada grupo).'
    ],
    pitfall: 'Usar combinação para senhas. Se mudar a ordem dos caracteres muda a senha, é arranjo (ou princípio multiplicativo), e não combinação.'
  };
};

/* 8 — Probabilidade e RAID */
L[7].learn = function (o, d) {
  const concept = [
    'Probabilidade mede a chance de um evento, de 0 (impossível) a 1 (certo). Se dois eventos são independentes, a chance de os dois acontecerem é o produto: P(A e B) = P(A)·P(B). O cenário supõe discos independentes, uma simplificação.',
    'Muitas vezes é mais fácil calcular o oposto. O complemento de “pelo menos um falha” é “nenhum falha”, então P(pelo menos um) = 1 − P(nenhum).',
    'Um RAID combina vários discos e tolera certo número de falhas: o RAID 0 não tolera nenhuma, o RAID 1 com 2 discos e o RAID 5 toleram 1, e o RAID 6 tolera 2. Só há perda de dados quando falham mais discos do que a tolerância.'
  ];
  if (o.variant === 'r5' || o.variant === 'r6') concept.push('Para a chance de exatamente k falhas entre n discos iguais, usamos a distribuição binomial: P(k) = C(n, k)·pᵏ·(1 − p)ⁿ⁻ᵏ. C(n, k) conta quais discos falham, pᵏ é a chance de esses falharem e (1 − p)ⁿ⁻ᵏ é a chance de os outros resistirem.');
  if (o.variant === 'r5d') concept.push('A probabilidade condicional P(A | B) é a chance de A sabendo que B já aconteceu. Saber que um disco já falhou muda o cenário: o RAID 5 gastou sua tolerância, e agora qualquer nova falha causa perda.');
  let example;
  if (d === 0) {
    example = [
      'Dois discos, cada um com chance 0,1 de falhar.',
      `Os dois falham (perda num RAID 1): 0,1·0,1 = ${nf(0.1 * 0.1)}.`,
      `Pelo menos um falha (perda num RAID 0): 1 − 0,9·0,9 = 1 − ${nf(0.81)} = ${nf(1 - 0.81)}.`,
      `Somar daria 0,1 + 0,1 = 0,2, que conta duas vezes o caso em que os dois falham: 0,2 − ${nf(0.01)} = ${nf(0.19)}.`
    ];
  } else {
    const P0 = Math.pow(0.9, 3), P1 = 3 * 0.1 * 0.81, loss = 1 - P0 - P1, cond = 1 - 0.81;
    example = [
      'Três discos em RAID 5, cada um com chance 0,1 de falhar. O RAID 5 tolera 1 falha.',
      `P(0) = 0,9³ = ${nf(P0)}. P(1) = 3·0,1·0,9² = ${nf(P1)}. P(perda) = 1 − ${nf(P0)} − ${nf(P1)} = ${nf(loss)}.`,
      `Se um dos três já falhou, os dois restantes não podem falhar: P(perda | 1 falha) = 1 − 0,9² = ${nf(cond)}, quase ${Math.round(cond / loss)} vezes mais que ${nf(loss)}.`
    ];
    if (o.variant === 'r6') example.push('No RAID 6 a ideia é a mesma, só que ele tolera 2 falhas: também se subtrai P(2).');
  }
  return {
    concept, example,
    pitfall: o.variant === 'r5d' ? 'Usar a probabilidade do arranjo intacto. Depois que um disco falhou, a pergunta muda: só importam os discos restantes, e nenhum deles pode falhar.'
      : 'Somar as probabilidades de falha. 0,1 + 0,1 = 0,2 não é a chance de pelo menos um falhar, porque conta duas vezes o caso em que os dois falham.'
  };
};

/* 9 — Equivalência */
L[8].learn = function (o) {
  return {
    concept: [
      'Duas expressões são logicamente equivalentes (≡) quando têm o mesmo valor em todas as linhas da tabela-verdade. A equivalência permite reescrever uma regra sem mudar o que ela faz, como simplificar a condição de um if num programa.',
      'Para provar uma equivalência, basta montar a tabela das duas expressões e comparar as colunas. Para provar que não são equivalentes, basta achar uma linha em que elas diferem, um contraexemplo.',
      o.law
    ],
    example: [o.exTxt],
    pitfall: o.pit
  };
};

C.LEVELS = L;
C.PHASES = {
  1: { name: 'Setor de Borda', story: 'O tráfego externo bate nos gateways de entrada. O NullSet corrompeu a regra de intertravamento e embaralhou as listas do firewall. Restaure a lógica da borda antes que os pacotes maliciosos contaminem a rede.', concepts: 'Lógica proposicional · Teoria dos conjuntos' },
  2: { name: 'Núcleo de Roteamento', story: 'Você atravessou a borda, mas o NullSet respondeu com um ataque de negação de serviço. O tráfego explode, os racks esquentam, a carga está desequilibrada e o storage enche sem parar. Estabilize o núcleo antes que os servidores físicos derretam.', concepts: 'Função exponencial · Função do 2º grau · Sistemas lineares · Regressão linear' },
  3: { name: 'Cofre Central', story: 'O código-fonte do Protocolo de Colapso Lógico está guardado no Cofre Central. Quebre a chave de acesso, decida se os discos aguentam a rotina crítica e desarme o contador de vez.', concepts: 'Análise combinatória · Probabilidade · Equivalências lógicas' }
};
C.genAll = function (code, d) { const s = C.seed(code); return L.map((lv, k) => { const o = lv.gen(C.rng((s + k * 7919 + d * 104729) >>> 0), d); o.learn = lv.learn(o, d); return o; }); };

/* ---------- correção das respostas ---------- */
C.check = function (lv, resp) {
  switch (lv.kind) {
    case 'truth': { const wrong = lv.expect.filter((v, k) => resp[k] !== v).length; return { ok: wrong === 0, msg: wrong ? `${wrong} linha${wrong > 1 ? 's' : ''} com L errado ou em branco.` : '' }; }
    case 'chips': { const S = new Set(resp), E = new Set(lv.expect); const miss = [...E].filter(x => !S.has(x)).length, extra = [...S].filter(x => !E.has(x)).length; const parts = []; if (miss) parts.push(`falta${miss > 1 ? 'm' : ''} ${miss} IP${miss > 1 ? 's' : ''}`); if (extra) parts.push(`há ${extra} IP${extra > 1 ? 's' : ''} a mais`); return { ok: !miss && !extra, msg: parts.length ? 'Na seleção, ' + parts.join(' e ') + '.' : '' }; }
    case 'num': { const bad = lv.fields.filter((f, k) => { const v = C.parseNum(resp[k]); return !(Math.abs(v - f.ans) <= f.tol); }); return { ok: !bad.length, msg: bad.length ? (lv.fields.length > 1 ? `Confira: ${bad.map(f => f.label).join(', ')}.` : '') : '' }; }
    case 'slider': { const v = +resp, T = lv.f(v); return { ok: T <= lv.lim + 1e-9, msg: lv.readout ? `Com x = ${nf(v, 1)}, T = ${nf(T, 2)} °C, acima do limite.` : 'O rack continua acima do limite.' }; }
    case 'mc': return { ok: resp === lv.correct, msg: '' };
  }
  return { ok: false, msg: '' };
};
C.answerOf = function (lv) {
  switch (lv.kind) {
    case 'truth': return lv.expect.slice();
    case 'chips': return lv.expect.slice();
    case 'num': return lv.fields.map(f => String(f.ans).replace('.', ','));
    case 'slider': return lv.xv;
    case 'mc': return lv.correct;
  }
};
return C;
})();
if (typeof module !== 'undefined') module.exports = C;
