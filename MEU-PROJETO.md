# Sua copia do GTA

- Repositorio: https://github.com/figueredorv/gta
- Jogo online: https://figueredorv.github.io/gta/
- Original de Gustavo Guanabara: https://github.com/gustavoguanabara/gta

## Jogar no computador

De duplo clique em `JOGAR-LOCAL.bat` e mantenha a janela aberta.
Abra http://127.0.0.1:8080/ no navegador. Para parar, pressione Ctrl+C.
Requer Node.js 22 ou superior, sem instalar pacotes.

Alternativamente, execute `npm start` nesta pasta.
O jogo precisa de um servidor HTTP; nao abra `index.html` por duplo clique.
O progresso fica salvo no navegador, separado entre o endereco local e o online.

## Publicar alteracoes

O GitHub Pages publica a branch `main`, na raiz `/`.
Depois de editar e verificar o jogo, envie os arquivos desejados:

```powershell
npm test
git status
git add <arquivos-alterados>
git commit -m "Descreva sua alteracao"
git push origin main
```

Aguarde a publicacao em Actions no GitHub. Se aparecer uma versao antiga,
recarregue com Ctrl+F5; o jogo utiliza cache para funcionar offline.

## Onde personalizar depois

- `story/stories.json`: catalogo das campanhas.
- `story/_template/`: modelo para criar uma campanha independente.
- `story/vibe-coding/story.md`: titulo, protagonista, personagens, itens e missoes atuais.
- `story/vibe-coding/characters/`: fichas dos personagens.
- `story/vibe-coding/missions/`: objetivos, dialogos e roteiros.
- `story/vibe-coding/items/`: itens.
- `story/vibe-coding/assets/` e `splash/`: imagens, sprites e telas.
- `story/vibe-coding/map/`: nomes dos locais e cenarios.
- `src/`: motor e regras do jogo.
- `styles/`: aparencia da interface.

Para uma campanha propria, copie o modelo para outra pasta em `story/`,
edite os arquivos e cadastre a nova campanha em `story/stories.json`.
O jogo passa a oferecer a selecao quando existem duas ou mais campanhas.

O editor visual original fica em `setup/`: execute `install-win.bat` e depois
`setup-gta-win.bat`. Ele requer Python 3.11+ e instala PySide6 em ambiente isolado.
Essa ferramenta e opcional para jogar e editar os arquivos manualmente.

## Relacao com o original

Esta copia e um fork, preservando o historico e os creditos do autor.
`origin` aponta para sua conta; `upstream` aponta para o original.
Para consultar atualizacoes sem alterar sua copia, execute `git fetch upstream`.
