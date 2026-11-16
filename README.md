# CYPHER: O Código da Lógica

Jogo educacional de Matemática Computacional Aplicada, ambientado em 2038 na Nexus Corp.
O jogador é SysAdmin e tem 60 minutos para barrar o grupo NullSet resolvendo desafios
de lógica, conjuntos, funções, sistemas lineares, regressão, combinatória e probabilidade.

Projeto da disciplina Matemática Computacional Aplicada (Anhembi Morumbi).
Equipe: Gustavo Gonçalves Pereira, Luan Lopes de Faria, Nicholas Damasceno, Victor Balthazar.
Orientadora: Profa. Maricélia Soares da Costa Paulo.

## Jogar

Abra `index.html` no navegador. É um arquivo único, sem instalação.

- 3 fases, 9 desafios, 3 níveis (fácil, médio, difícil)
- Números sorteados a cada partida a partir de um código (mesmo código, mesmo cenário)
- Calculadora opcional, dicas, resolução comentada (conceito, exemplo, passo a passo, erro comum)
- Modo apresentação (teclas P, N, B, S, C, M), placar local, sons

## Estrutura

- `src/`: código-fonte (`core.js` motor matemático, `ui.js` interface, `style.css`, `body.html`)
- `build.py`: gera o `index.html` a partir de `src/`
- `tests/`: `test_core.js` (verificação matemática) e `test_e2e.py` (partidas completas com Playwright)
- `docs/poster/`: pôster do simpósio

## Testes

```
python3 build.py
node tests/test_core.js
python3 tests/test_e2e.py   # requer playwright
```

Os testes verificam as respostas esperadas; não medem efeito sobre a aprendizagem,
que ainda não foi avaliado com estudantes.
