import sys
import os
d=os.path.join(os.path.dirname(os.path.abspath(__file__)),'src')+'/'
out=os.path.dirname(os.path.abspath(__file__))+'/'
css=open(d+'style.css',encoding='utf8').read(); body=open(d+'body.html',encoding='utf8').read()
core=open(d+'core.js',encoding='utf8').read(); ui=open(d+'ui.js',encoding='utf8').read()
for js in (core,ui): assert '</script' not in js
fonts='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap">'
title='<title>CYPHER: O Código da Lógica</title>'
scripts=f'<script>\n{core}\n</script>\n<script>\n{ui}\n</script>\n'
art=f'{title}\n<meta name="claude:viewport-fit-sides" content="cover">\n{fonts}\n<style>\n{css}\n</style>\n{body}\n{scripts}'
std=f'<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n{title}\n{fonts}\n<style>\n:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}\n[hidden]{{display:none!important}}\n{css}\n</style>\n</head>\n<body>\n{body}\n{scripts}</body>\n</html>\n'
open(out+'index.html','w',encoding='utf8').write(std)
print('index.html gerado:',len(std),'bytes')
