// Testes independentes do motor do CYPHER. Uso: node test_core.js [n_codigos]
const C = require('../src/core.js');
const N = +(process.argv[2] || 300);
let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; if (fails < 40) console.log('FALHA:', msg); } };

// Fórmulas escritas à mão (independentes do analisador)
const IMP = (a, b) => !a || b;
const HAND = {
  'P → Q': (P, Q) => IMP(P, Q), '¬Q → ¬P': (P, Q) => IMP(!Q, !P), 'P ∨ Q': (P, Q) => P || Q, 'P ↔ Q': (P, Q) => P === Q,
  '(P ∧ Q) → R': (P, Q, R) => IMP(P && Q, R), '(P ∨ Q) → R': (P, Q, R) => IMP(P || Q, R), 'P → (Q ∧ R)': (P, Q, R) => IMP(P, Q && R), 'R → (P ∨ Q)': (P, Q, R) => IMP(R, P || Q),
  '(P → Q) ∧ (Q → R)': (P, Q, R) => IMP(P, Q) && IMP(Q, R), '(P ↔ Q) → R': (P, Q, R) => IMP(P === Q, R), '(P ∨ Q) ∧ ¬(Q ∧ R)': (P, Q, R) => (P || Q) && !(Q && R), '¬(P ∧ ¬R) ∧ (Q → P)': (P, Q, R) => !(P && !R) && IMP(Q, P),
  '¬(P ∨ Q)': (P, Q) => !(P || Q), '¬P ∧ ¬Q': (P, Q) => !P && !Q, '¬P ∨ ¬Q': (P, Q) => !P || !Q, 'P ∧ Q': (P, Q) => P && Q, '¬P ∨ Q': (P, Q) => !P || Q,
  '¬(P ∧ Q)': (P, Q) => !(P && Q), 'P ∨ ¬Q': (P, Q) => P || !Q, '¬P ∧ Q': (P, Q) => !P && Q, 'Q → P': (P, Q) => IMP(Q, P), '¬P → ¬Q': (P, Q) => IMP(!P, !Q), 'P ∧ ¬Q': (P, Q) => P && !Q,
  '¬(P ∧ ¬Q)': (P, Q) => !(P && !Q), '¬(P → Q)': (P, Q) => !IMP(P, Q), '(P → Q) ∧ (Q → P)': (P, Q) => IMP(P, Q) && IMP(Q, P), '(P → Q) ∨ (Q → P)': (P, Q) => IMP(P, Q) || IMP(Q, P),
  '(P ∧ Q) ∨ ¬P': (P, Q) => (P && Q) || !P, '¬(P ↔ Q)': (P, Q) => P !== Q, '(P ∧ ¬Q) ∨ (¬P ∧ Q)': (P, Q) => (P && !Q) || (!P && Q), '(P ∧ Q) ∨ (¬P ∧ ¬Q)': (P, Q) => (P && Q) || (!P && !Q),
  '¬P ↔ ¬Q': (P, Q) => !P === !Q, 'P → (Q → R)': (P, Q, R) => IMP(P, IMP(Q, R)), '(P ∧ Q) → R': (P, Q, R) => IMP(P && Q, R), '(P → Q) → R': (P, Q, R) => IMP(IMP(P, Q), R), 'Q → (P ∧ R)': (P, Q, R) => IMP(Q, P && R)
};
const ALLROWS = []; for (let m = 0; m < 8; m++) ALLROWS.push([!!(m & 4), !!(m & 2), !!(m & 1)]);
const eqHand = (a, b) => ALLROWS.every(([P, Q, R]) => HAND[a](P, Q, R) === HAND[b](P, Q, R));

// 0) analisador lógico = funções à mão em todas as linhas
for (const f of Object.keys(HAND)) {
  const ast = C.parseLogic(f);
  for (const [P, Q, R] of ALLROWS) ok(C.evalLogic(ast, { P, Q, R }) === HAND[f](P, Q, R), 'parser ' + f);
}
// pools: a correta é equivalente e as alternativas não (pela verificação à mão)
for (const d of [0, 1, 2]) for (const [src, good, bad] of C.POOL9[d]) {
  ok(eqHand(src, good), 'pool9 correta ' + src);
  for (const b of bad) ok(!eqHand(src, b), 'pool9 distrator equivalente: ' + src + ' / ' + b);
}

// 1) calculadora
const CALC = [['2*3^5', 486], ['10*9*8', 720], ['6!/(2!*4!)', 15], ['C(6;2)', 15], ['C(6,2)', 15], ['A(10;3)', 720], ['A(26,2)*A(10,3)', 468000], ['2,5*2', 5], ['-2^2', -4], ['2^-1', 0.5], ['2^3^2', 512], ['ln(e)', 1], ['sqrt(16)+1', 5], ['(1-0,05)^4', Math.pow(0.95, 4)], ['1-(1-0.1)*(1-0.2)', 0.28], ['3!', 6], ['log(1000)', 3], ['ans*2', 20]];
for (const [e, v] of CALC) { const r = C.calc(e, 10); ok(Math.abs(r - v) < 1e-9, `calc ${e} = ${r}, esperado ${v}`); }
for (const e of ['2+', '(2', 'abc', 'C(6)', '2,,3', ')', 'foo(2)', '1..2']) ok(isNaN(C.calc(e)), 'calc deveria ser inválido: ' + e);
// parseNum
for (const [s, v] of [['486', 486], ['0,0281', 0.0281], ['0.0281', 0.0281], ['58 500', 58500], ['58.500', 58500], ['12,35', 12.35], ['−5', -5], [' 7 ', 7], ['1.5', 1.5]]) ok(C.parseNum(s) === v, `parseNum ${s} -> ${C.parseNum(s)}`);
for (const s of ['', 'abc', '1,2,3', '0.028.1']) ok(isNaN(C.parseNum(s)), 'parseNum inválido ' + s);

// utilidades independentes
const fact = n => n <= 1 ? 1 : n * fact(n - 1);
const choose = (n, k) => fact(n) / (fact(k) * fact(n - k));
function countDistinctSeq(alpha, len, firstForbid) { // conta sequências por força bruta (pequenas)
  let c = 0; const used = new Array(alpha).fill(false);
  (function rec(pos) { if (pos === len) { c++; return; } for (let s = 0; s < alpha; s++) { if (used[s]) continue; if (pos === 0 && firstForbid === s) continue; used[s] = true; rec(pos + 1); used[s] = false; } })(0);
  return c;
}
function probAtLeast(ps, minFail) { // enumera todos os estados dos discos
  const n = ps.length; let tot = 0;
  for (let m = 0; m < (1 << n); m++) { let pr = 1, f = 0; for (let i = 0; i < n; i++) { if (m >> i & 1) { pr *= ps[i]; f++; } else pr *= 1 - ps[i]; } if (f >= minFail) tot += pr; }
  return tot;
}
const nums = s => (s.match(/\d+(,\d+)?/g) || []).map(x => +x.replace(',', '.'));

const stats = { variants: {}, ops: {}, formulas: {} };
for (let it = 0; it < N; it++) {
  const code = 'T' + it.toString(36).toUpperCase();
  for (const d of [0, 1, 2]) {
    const lv = C.genAll(code, d);
    ok(lv.length === 9, 'nove níveis');
    const again = C.genAll(code, d);
    ok(JSON.stringify(again.map(l => l.sc)) === JSON.stringify(lv.map(l => l.sc)), 'mesmo código, mesma partida');
    lv.forEach((L, k) => {
      ok(C.check(L, C.answerOf(L)).ok, `resposta própria aceita: nível ${k + 1} d${d} ${code}`);
      ok(typeof L.sc === 'string' && L.sc.length > 120 && !/undefined|NaN/.test(L.sc + L.q + L.hint + L.sol.join('')), `texto completo nível ${k + 1} d${d} ${code}`);
    });
    // 1 tabela-verdade
    { const L = lv[0]; stats.formulas[L.formula] = 1; const vs = L.vars;
      L.rows.forEach((row, k) => { const e = { P: false, Q: false, R: false }; vs.forEach((v, i) => e[v] = row[i]); ok(L.expect[k] === HAND[L.formula](e.P, e.Q, e.R), 'tabela ' + L.formula); });
      ok(L.expect.some(v => !v) && L.expect.some(v => v), 'tabela com V e F');
      const wrong = L.expect.slice(); wrong[0] = !wrong[0]; ok(!C.check(L, wrong).ok, 'tabela errada rejeitada');
      ok(!C.check(L, L.expect.map(() => null)).ok, 'tabela vazia rejeitada'); }
    // 2 conjuntos
    { const L = lv[1]; const { A, B, C: Cc } = L.sets; stats.ops[L.op] = 1;
      const has = (S, x) => S.indexOf(x) >= 0; let exp;
      if (L.op === 'A ∩ B') exp = L.items.filter(x => has(A, x) && has(B, x));
      if (L.op === '(A ∩ B) − C') exp = L.items.filter(x => has(A, x) && has(B, x) && !has(Cc, x));
      if (L.op === '(A ∪ B) − C') exp = L.items.filter(x => (has(A, x) || has(B, x)) && !has(Cc, x));
      if (L.op === 'A ∪ (B − C)') exp = L.items.filter(x => has(A, x) || (has(B, x) && !has(Cc, x)));
      ok(exp && exp.length === L.expect.length && exp.every(x => L.expect.includes(x)), 'conjuntos ' + L.op);
      ok(L.items.every(x => has(A, x) || has(B, x) || has(Cc, x)), 'todo IP em algum conjunto');
      ok(!C.check(L, L.expect.slice(1)).ok && !C.check(L, [...L.expect, ...L.items.filter(x => !L.expect.includes(x)).slice(0, 1)]).ok, 'seleção errada rejeitada'); }
    // 3 DDoS
    { const L = lv[2], x = L.fields[0].ans; let y = 0; while (L.a * Math.pow(L.b, y) <= L.L) y++;
      ok(y === x, `DDoS x=${x} recontado=${y}`); ok(L.a * Math.pow(L.b, x - 1) < L.L * 0.98 && L.a * Math.pow(L.b, x) > L.L * 1.02, 'DDoS com folga');
      ok(!C.check(L, [String(x - 1)]).ok && !C.check(L, [String(x + 1)]).ok, 'DDoS errado rejeitado'); }
    // 4 temperatura: varre as posições do controle
    { const L = lv[3]; let okPos = 0, minT = 1e9, argmin = 0;
      for (let k = 0; k <= Math.round((L.max - L.min) / L.step); k++) { const x = +(L.min + k * L.step).toFixed(1), T = L.a * x * x + L.b * x + L.c; if (T < minT) { minT = T; argmin = x; } if (T <= L.lim + 1e-9) okPos++; }
      ok(Math.abs(argmin - L.xv) < 1e-9, `vértice ${L.xv} vs mínimo varrido ${argmin}`); ok(Math.abs(minT - L.Tm) < 1e-6, 'T mínima');
      ok(okPos >= 3, 'janela tem posições: ' + okPos); ok(!C.check(L, 0).ok && !C.check(L, L.max).ok, 'extremos rejeitados');
      ok(L.a > 0, 'a > 0'); }
    // 5 sistema linear: confere A·x = b
    { const L = lv[4]; ok(L.M.every((row, i) => row.reduce((s, c, j) => s + c * L.solution[j], 0) === L.rhs[i]), 'A·x = b');
      ok(L.solution.every(v => v > 0 && Number.isInteger(v)), 'cargas inteiras positivas');
      const w = L.fields.map(f => String(f.ans)); w[0] = String(L.fields[0].ans + 5); ok(!C.check(L, w).ok, 'sistema errado rejeitado'); }
    // 6 regressão: recalcula por médias e covariância
    { const L = lv[5], n = L.xs.length, mx_ = L.xs.reduce((s, v) => s + v, 0) / n, my = L.ys.reduce((s, v) => s + v, 0) / n;
      let sxy = 0, sxx = 0; L.xs.forEach((x, i) => { sxy += (x - mx_) * (L.ys[i] - my); sxx += (x - mx_) * (x - mx_); });
      const b = sxy / sxx, a = my - b * mx_; ok(Math.abs(b - L.fit.b) < 1e-9 && Math.abs(a - L.fit.a) < 1e-9, 'regressão a,b');
      let m = 1; while (a + b * m < L.cap) m++; ok(m === L.month, `mês ${L.month} vs ${m}`);
      ok(a + b * (m - 1) < L.cap - 0.1 * b && a + b * m > L.cap + 0.1 * b, 'mês com folga');
      if (d === 0) ok(L.ys.every((y, i) => i === 0 || y - L.ys[i - 1] === L.ys[1] - L.ys[0]), 'fácil sem ruído');
      if (d === 2) { ok(C.check(L, [b.toFixed(2).replace('.', ','), String(m)]).ok, 'b com 2 casas aceito'); ok(!C.check(L, [(b + 0.5).toFixed(2), String(m)]).ok, 'b errado rejeitado'); } }
    // 7 senhas: força bruta quando pequeno, fórmula independente quando grande
    { const L = lv[6], sc = L.sc, a1 = L.fields[0].ans, a2 = L.fields[1].ans;
      const mn = sc.match(/escolher (\d+) nós entre (\d+)/); ok(mn && choose(+mn[2], +mn[1]) === a2, 'combinação nós');
      if (d === 0) { const k = +sc.match(/PIN de (\d+)/)[1]; ok(Math.pow(10, k) === a1, 'PIN'); }
      if (d === 1) { const k = +sc.match(/tokens de (\d+)/)[1]; ok(countDistinctSeq(10, k) === a1, 'arranjo força bruta'); }
      if (d === 2) { const m = +sc.match(/com (\d+) letras/)[1], j = +sc.match(/seguidas de (\d+) dígitos/)[1], v = /não pode ser 0/.test(sc);
        const dig = countDistinctSeq(10, j, v ? 0 : -1), let_ = m === 2 ? 26 * 25 : 26 * 25 * 24; ok(let_ * dig === a1, `senha difícil ${a1} vs ${let_ * dig}`); } }
    // 8 RAID: enumera os estados dos discos
    { const L = lv[7], sc = L.sc, P = L.prob; stats.variants[L.variant] = 1; const ns = nums(sc);
      let exp;
      if (L.variant === 'r0') { const n = +sc.match(/com (\d+) discos/)[1], p = +sc.match(/probabilidade (0,\d+)/)[1].replace(',', '.'); exp = probAtLeast(Array(n).fill(p), 1); }
      if (L.variant === 'r1') { const m = sc.match(/A falha com probabilidade (0,\d+) e o disco B com (0,\d+)/); exp = probAtLeast([+m[1].replace(',', '.'), +m[2].replace(',', '.')], 2); }
      if (L.variant === 'r5') { const n = +sc.match(/RAID 5 com (\d+) discos/)[1], p = +sc.match(/probabilidade (0,\d+)/)[1].replace(',', '.'); exp = probAtLeast(Array(n).fill(p), 2); }
      if (L.variant === 'r6') { const n = +sc.match(/RAID 6 com (\d+) discos/)[1], p = +sc.match(/probabilidade (0,\d+)/)[1].replace(',', '.'); exp = probAtLeast(Array(n).fill(p), 3); }
      if (L.variant === 'r5d') { const n = +sc.match(/RAID 5 com (\d+) discos/)[1], q = +sc.match(/probabilidade (0,\d+)/)[1].replace(',', '.');
        // P(perda | 1º falhou) = P(1º falhou e pelo menos mais 1 falha) / P(1º falhou), com o 1º disco tendo prob. 1/2 de ter falhado (qualquer valor serve)
        const pf = 0.5, joint = (() => { let t = 0; const n1 = n - 1; for (let m = 0; m < (1 << n1); m++) { let pr = 1, f = 0; for (let i = 0; i < n1; i++) { if (m >> i & 1) { pr *= q; f++; } else pr *= 1 - q; } if (f >= 1) t += pf * pr; } return t; })();
        exp = joint / pf; }
      ok(exp !== undefined && Math.abs(exp - P) < 1e-12, `RAID ${L.variant}: ${P} vs ${exp}`);
      ok(C.check(L, [P.toFixed(4).replace('.', ',')]).ok, 'RAID 4 casas aceito');
      ok(!C.check(L, [(P + 0.002).toFixed(4)]).ok && !C.check(L, ['0']).ok, 'RAID errado rejeitado'); }
    // 9 equivalência
    { const L = lv[8]; ok(eqHand(L.src, L.options[L.correct]), 'mc correta equivalente');
      L.options.forEach((o, k) => { if (k !== L.correct) ok(!eqHand(L.src, o), 'mc distrator não equivalente'); });
      ok(L.options.length === 4 && new Set(L.options).size === 4, '4 alternativas distintas');
      ok(!C.check(L, (L.correct + 1) % 4).ok, 'mc errada rejeitada'); }
  }
}
// explicações: conceito, exemplo e erro comum em todos os nós
const all = t => JSON.stringify(t);
for (let it = 0; it < Math.min(N, 150); it++) for (const d of [0, 1, 2]) {
  const lv = C.genAll('X' + it.toString(36), d);
  lv.forEach((L, k) => {
    const lr = L.learn;
    ok(lr && lr.concept.length >= 3 && lr.example.length >= 1 && lr.pitfall.length > 20, `explicação completa nó ${k + 1} d${d}`);
    ok(!/undefined|NaN|\[object/.test(all([lr, L.sol])), `explicação sem lacunas nó ${k + 1} d${d}: ` + (all([lr, L.sol]).match(/.{40}(undefined|NaN|\[object).{10}/) || [''])[0]);
    ok(L.sol.filter(x => x.charAt(0) !== '<').length >= 3, `pelo menos 3 passos nó ${k + 1}`);
  });
  ok(lv[0].learn.example.join().indexOf(lv[0].formula) < 0 || !['P ∧ Q', 'P → Q', 'P ∨ Q'].includes(lv[0].formula), 'exemplo da tabela usa outra fórmula');
  // sistema: os números da eliminação conferem
  const S5 = lv[4];
  if (d === 1) { const [p0, q0] = S5.M[0], r1 = S5.M[1][1]; ok((q0 - p0 * r1) * S5.solution[1] === S5.rhs[0] - p0 * S5.rhs[1], 'eliminação d1'); ok(S5.sol.join(' ').includes(`${C.nf(q0 - p0 * r1)}y = ${C.nf(S5.rhs[0] - p0 * S5.rhs[1])}, e y = ${C.nf(S5.solution[1])}`), 'texto da eliminação d1'); }
  S5.rhs.forEach(v => ok(S5.sol.join(' ').includes('= ' + C.nf(v) + ' ✓'), 'conferência cita cada equação'));
  // RAID 5 degradado: comparação com o arranjo intacto recalculada por enumeração
  const R = lv[7];
  if (R.variant === 'r5d') { const n = +R.sc.match(/RAID 5 com (\d+) discos/)[1], q = +R.sc.match(/probabilidade (0,\d+)/)[1].replace(',', '.'); const intact = probAtLeast(Array(n).fill(q), 2); ok(R.sol.join(' ').includes(intact.toFixed(4).replace('.', ',')), 'r5d compara com intacto ' + intact); }
}
// exemplos fixos conferidos de forma independente
{
  const g = C.genAll('EXEMPLO', 1), ex = k => g[k].learn.example.join(' ') + ' ' + g[k].learn.pitfall;
  const has = (k, frag, msg) => ok(ex(k).includes(frag), 'exemplo ' + msg + ': falta "' + frag + '"');
  const A = [1, 2, 3, 4], B = [3, 4, 5], Cc = [4, 6], f = S => '{' + S.join(', ') + '}';
  has(1, f(A.filter(x => B.includes(x))), 'A∩B'); has(1, f([...new Set([...A, ...B])].sort()), 'A∪B'); has(1, f(A.filter(x => !B.includes(x))), 'A−B');
  has(1, f([1, 2, 3, 5]), '(A∪B)−C'); has(1, f([1, 2, 3, 4, 5]), 'A∪(B−C)');
  let xe = 0; while (2 * 3 ** xe <= 100) xe++; has(2, 'minuto ' + xe, 'exponencial'); has(2, (Math.log(50) / Math.log(3)).toFixed(2).replace('.', ','), 'log'); has(2, 'minuto 25', 'linear');
  has(3, '= 11 °C', 'vértice'); has(3, '<b>11</b>', 'tabela vértice');
  const bR = (3 * 25 - 6 * 11) / (3 * 14 - 36), aR = 11 / 3 - bR * 2; has(5, 'Σxy = 25', 'regressão somas'); has(5, '= 1,5.', 'regressão b'); has(5, (aR).toFixed(2).replace('.', ','), 'regressão a'); has(5, 'mês ' + Math.ceil((10 - aR) / bR), 'regressão mês');
  has(6, '3·3 = 9', 'repetição'); has(6, '3·2 = 6', 'arranjo'); has(6, '6 / 2! = 3', 'combinação');
  has(7, '0,729', 'P0'); has(7, '0,243', 'P1'); has(7, (1 - 0.729 - 0.243).toFixed(3).replace('.', ','), 'perda'); has(7, '0,19', 'condicional');
  const e0 = C.genAll('EXEMPLO', 0)[7].learn.example.join(' '); ok(e0.includes('0,01') && e0.includes('0,19'), 'exemplo fácil RAID');
  ok(C.genAll('EXEMPLO', 2)[4].learn.concept.join(' ').includes('Cramer'), 'conceito 3x3 cita Cramer');
}
// cobertura: todas as variantes apareceram
ok(Object.keys(stats.variants).sort().join() === 'r0,r1,r5,r5d,r6', 'variantes RAID: ' + Object.keys(stats.variants));
ok(Object.keys(stats.ops).length === 4, 'operações de conjunto: ' + Object.keys(stats.ops));
ok(Object.keys(stats.formulas).length === 12, 'fórmulas da tabela: ' + Object.keys(stats.formulas).length);
// variedade: partidas diferentes geram números diferentes
const scA = C.genAll('AAAAAA', 1).map(l => l.sc).join(), scB = C.genAll('BBBBBB', 1).map(l => l.sc).join();
ok(scA !== scB, 'códigos diferentes, partidas diferentes');
console.log(`${checks} verificações, ${fails} falhas, ${N} códigos × 3 dificuldades`);
process.exit(fails ? 1 : 0);
