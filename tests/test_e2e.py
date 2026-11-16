import sys, time
from playwright.sync_api import sync_playwright

import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + ROOT + '/index.html'
SHOTS = os.path.join(ROOT, 'tests', 'shots') + '/'
errors = []
ok_count = 0

def check(cond, msg):
    global ok_count
    if not cond:
        print('FALHA:', msg); errors.append(msg)
    else:
        ok_count += 1

def answer_node(page, k, shot=None):
    info = page.evaluate(f"(()=>{{const L=CYPHER.G.lv[{k}];return {{kind:L.kind, ans:CYPHER.C.answerOf(L)}}}})()")
    kind, ans = info['kind'], info['ans']
    if kind == 'truth':
        cells = page.locator('#box .c')
        for i, v in enumerate(ans):
            for _ in range(1 if v else 2):
                cells.nth(i).click()
    elif kind == 'chips':
        for x in ans:
            page.locator('#box .chip', has_text=f'10.0.0.{x}').first.click()
    elif kind == 'num':
        for i, v in enumerate(ans):
            page.fill(f'#f{i}', str(v))
    elif kind == 'slider':
        page.evaluate(f"(()=>{{const r=document.querySelector('#rg');r.value={ans};r.dispatchEvent(new Event('input'))}})()")
    if shot:
        page.screenshot(path=SHOTS + shot, full_page=True)
    if kind == 'mc':
        page.click(f'#box [data-k="{ans}"]')
    else:
        page.click('#box .go')
    return kind

def enter_phase_if_needed(page):
    if page.is_visible('#s-phase'):
        page.click('#pgo')

def play_full(page, d, code, shots=False):
    page.goto(URL, wait_until='domcontentloaded')
    page.fill('#code', code)
    page.click(f'[data-d="{d}"]')
    check(page.is_visible('#s-phase'), 'abre tela de fase')
    if shots: page.screenshot(path=SHOTS + f'phase1_d{d}.png')
    kinds = []
    for k in range(9):
        enter_phase_if_needed(page)
        kinds.append(answer_node(page, k, shot=(f'node{k+1}_d{d}.png' if shots else None)))
        check(page.evaluate(f"CYPHER.G.st[{k}].solved"), f'nó {k+1} resolvido d{d} {code}')
        page.click('#sb')
        check(page.locator('#sol .lx').count() == 3 and page.locator('#sol .pit').count() == 1, f'resolução com conceito, exemplo, partida e erro comum no nó {k+1}')
        if shots: page.locator('#sol').screenshot(path=SHOTS + f'sol{k+1}_d{d}.png')
        page.click('#nx')
    check(page.is_visible('#s-end'), f'tela final d{d}')
    check('NullSet neutralizado' in page.inner_text('#et'), 'vitória')
    check(page.is_visible('#save'), 'formulário do placar visível')
    return kinds

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 900, 'height': 1000})
    page = ctx.new_page()
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))

    import os; os.makedirs(SHOTS, exist_ok=True)
    page.goto(URL, wait_until='domcontentloaded')
    page.screenshot(path=SHOTS + 'start.png', full_page=True)

    # 1) partidas completas nas três dificuldades, vários códigos
    for d in (0, 1, 2):
        for code in ('SIMP03', 'BANCA1', 'NX' + str(d) + 'Q7'):
            play_full(page, d, code, shots=(code == 'SIMP03'))
    # placar: salva e confere
    page.fill('#nm', 'Gustavo'); page.click('#bSave')
    check('Gustavo' in page.inner_text('#endScores'), 'nome salvo no placar')
    page.screenshot(path=SHOTS + 'end_win.png', full_page=True)
    page.click('#home'); page.click('#bScores'); page.click('#scores [data-t="2"]')
    check('Gustavo' in page.inner_text('#scores'), 'placar na tela inicial')
    page.screenshot(path=SHOTS + 'start_scores.png', full_page=True)

    # 2) mesmo código = mesmos números; código diferente = números diferentes
    page.goto(URL, wait_until='domcontentloaded'); page.fill('#code', 'ABC123'); page.click('[data-d="1"]'); page.click('#pgo')
    sc1 = page.inner_text('#sc')
    page.goto(URL, wait_until='domcontentloaded'); page.fill('#code', 'abc-123'); page.click('[data-d="1"]'); page.click('#pgo')
    check(page.inner_text('#sc') == sc1, 'código repetido gera o mesmo cenário (normaliza maiúsculas e símbolos)')
    check('ABC123' in page.inner_text('#codeLbl'), 'código exibido')

    # 3) caminho de erro no difícil: 3 erros no DDoS, depois resolução paga
    page.goto(URL, wait_until='domcontentloaded'); page.fill('#code', 'ERRO01'); page.click('[data-d="2"]')
    for k in range(2):
        enter_phase_if_needed(page); answer_node(page, k); page.click('#nx')
    enter_phase_if_needed(page)
    page.evaluate("CYPHER.G.paused=false")
    t0 = page.evaluate("CYPHER.G.t")
    wrong = page.evaluate("String(CYPHER.G.lv[2].fields[0].ans+3)")
    for i in range(3):
        page.fill('#f0', wrong); page.click('#box .go')
    t1 = page.evaluate("CYPHER.G.t")
    check(t0 - t1 >= 540 and t0 - t1 < 560, f'3 erros descontam 9 min no difícil ({t0}->{t1})')
    check(page.evaluate("CYPHER.G.errs") == 3, 'conta 3 erros')
    check('incorreta' in page.inner_text('#fb'), 'mensagem de erro')
    check(page.is_visible('#sb') and 'liberar' in page.inner_text('#sb'), 'botão de resolução paga aparece após 3 erros')
    page.screenshot(path=SHOTS + 'error3.png', full_page=True)
    page.click('#sb')
    check(page.evaluate("CYPHER.G.st[2].solved && CYPHER.G.st[2].viaSol"), 'nó liberado pela resolução')
    check(page.is_visible('#sol'), 'resolução visível')
    check(t1 - page.evaluate("CYPHER.G.t") >= 180, 'resolução custa 3 min')
    # dica
    page.click('#nx'); page.click('#hb')
    check(page.is_visible('#hintTxt') and page.evaluate("CYPHER.G.hints") == 1, 'dica exibida e contada')
    # entrada inválida não penaliza
    tt = page.evaluate("CYPHER.G.t")
    # nó 4 é controle deslizante; pula para validar campos no nó 5
    answer_node(page, 3); page.click('#nx')
    page.fill('#f0', 'abc'); page.fill('#f1', '2'); page.fill('#f2', '3'); page.click('#box .go')
    check('apenas números' in page.inner_text('#fb') and page.evaluate("CYPHER.G.errs") == 3, 'texto inválido não conta como erro')

    # 4) calculadora
    page.click('#cb'); page.fill('#ci', 'C(6;2)')
    check(page.inner_text('#res').strip() == '= 15', 'calculadora C(6;2) = 15')
    page.press('#ci', 'Enter'); page.fill('#ci', '2*3^5+ans')
    check(page.inner_text('#res').strip() == '= 501', 'calculadora usa ans')
    page.fill('#ci', '2+')
    check('inválida' in page.inner_text('#res'), 'expressão incompleta avisa')
    page.click('#f0'); page.click('#hist button')
    check(page.input_value('#f0') == '15', 'histórico cola no campo de resposta')
    page.screenshot(path=SHOTS + 'calc.png', full_page=True)

    # 5) derrota por tempo
    page.evaluate("CYPHER.G.t=2")
    page.wait_for_timeout(700)
    check(page.is_visible('#s-end') and 'Buffer overflow' in page.inner_text('#et'), 'derrota por tempo')
    check(not page.is_visible('#save'), 'derrota não salva placar')
    page.screenshot(path=SHOTS + 'end_lose.png', full_page=True)

    # 6) modo apresentação
    page.goto(URL, wait_until='domcontentloaded'); page.check('#pres'); page.fill('#code', 'APRES1'); page.click('[data-d="1"]'); page.click('#pgo')
    check(page.evaluate("CYPHER.G.paused") and page.is_visible('#bPause'), 'apresentação começa pausada')
    page.wait_for_timeout(500)
    check(page.evaluate("CYPHER.G.t") == 3600, 'relógio parado em pausa')
    page.keyboard.press('n'); check(page.evaluate("CYPHER.G.i") == 1, 'N avança')
    page.keyboard.press('b'); check(page.evaluate("CYPHER.G.i") == 0, 'B volta')
    page.keyboard.press('s'); check(page.is_visible('#sol'), 'S abre a resolução')
    page.keyboard.press('p'); page.wait_for_timeout(600)
    check(page.evaluate("CYPHER.G.t") < 3600, 'P retoma o relógio')
    page.fill_count = 0
    page.locator('#box .c').first.click()
    page.locator('#bar i').nth(5).click(); check(page.evaluate("CYPHER.G.i") == 5, 'barra de progresso salta de nó')
    page.screenshot(path=SHOTS + 'pres.png', full_page=True)
    for _ in range(4):
        page.keyboard.press('n'); enter_phase_if_needed(page)
    check(page.is_visible('#s-end') and 'Demonstração' in page.inner_text('#et'), 'fim da demonstração')
    check(not page.is_visible('#save'), 'apresentação não salva placar')

    # 7) som: alternar não quebra
    page.click('#home'); page.click('#bSom'); page.click('#bSom'); page.keyboard.press('m')
    check('desligado' in page.inner_text('#bSom'), 'atalho M desliga o som')
    page.keyboard.press('m')

    # 8) celular
    m = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    mp = m.new_page(); mp.on('pageerror', lambda e: errors.append('mobile: ' + str(e)))
    mp.goto(URL, wait_until='domcontentloaded')
    mp.screenshot(path=SHOTS + 'm_start.png', full_page=True)
    mp.fill('#code', 'SIMP03'); mp.click('[data-d="2"]'); mp.click('#pgo')
    for k in range(9):
        enter_phase_if_needed(mp)
        sw = mp.evaluate("document.documentElement.scrollWidth")
        check(sw <= 390, f'celular sem rolagem lateral no nó {k+1} ({sw}px)')
        if k in (0, 4, 5, 8): mp.screenshot(path=SHOTS + f'm_node{k+1}.png', full_page=True)
        answer_node(mp, k)
        if k == 5: mp.click('#sb'); mp.screenshot(path=SHOTS + 'm_sol6.png', full_page=True)
        mp.click('#nx')
    check(mp.is_visible('#s-end'), 'celular termina a partida')
    mp.screenshot(path=SHOTS + 'm_end.png', full_page=True)
    b.close()

print(f'{ok_count} verificações OK, {len(errors)} problemas')
for e in errors[:30]: print(' -', e)
sys.exit(1 if errors else 0)
