# Aracaju: Código de Resgate

Jogo de investigação e aventura desenvolvido por **Ruan Figueiredo**.
Ruan, um programador, segue pistas pela cidade para resgatar a professora
**Fátima Micaella**, sequestrada pela Turma do Zero após descobrir uma fraude
no sistema de notas da escola.

**[Jogar online](https://figueredorv.github.io/gta/)** ·
[Guia do projeto](./MEU-PROJETO.md) ·
[Campanha e próximos capítulos](./story/codigo-de-resgate/README.md)

## Conteúdo disponível

A abertura inicia diretamente **Código de Resgate**, a única campanha do catálogo.

1. **Mensagem interrompida** — encontre o pendrive da feira e fale com Camilla.
2. **Um café e uma pista** — ajude Davi a recuperar o registro do computador.

A campanha usa nomes de 62 vias reais de Aracaju em um mapa procedural
estilizado. Escola, estabelecimentos e acontecimentos são fictícios.
Ruan e Fátima têm personagens ilustrados de corpo inteiro e sprites para o mapa,
criados a partir das fotos de referência fornecidas. Os coadjuvantes usam arte
provisória. O resgate será concluído nos próximos capítulos.

## Jogar localmente

No Windows, abra **JOGAR-LOCAL.bat** e acesse http://127.0.0.1:8080/.
Mantenha a janela do servidor aberta. Requer Node.js 22 ou superior.
Também é possível executar `npm start` nesta pasta, sem instalar pacotes.

Use WASD/setas para mover, Espaço para interagir, M para o mapa, I para o
inventário e Esc para o menu. O progresso fica salvo no navegador.
Quem concluiu o capítulo 1 pode continuar na missão 2 após atualizar a página.

## Desenvolvimento

- `story/codigo-de-resgate/`: história, personagens, itens, imagens e missões.
- `story/stories.json`: catálogo de campanhas publicadas.
- `src/`: motor JavaScript/WebGL e interface.
- `styles/`: aparência do jogo.
- `setup/`: editor visual opcional em Python, documentado em `setup/README.md`.
- `tests/`: verificações do motor, dos arquivos da campanha e do progresso salvo.

Execute `npm test` para validar o projeto. Alterações enviadas à branch `main`
são publicadas automaticamente pelo GitHub Pages.

## Origem do motor

Esta versão utiliza como base o projeto [GTA de Gustavo Guanabara](https://github.com/gustavoguanabara/gta).
A campanha Código de Resgate e a personalização desta versão são desenvolvidas
por Ruan Figueiredo. A [documentação original](./docs/README-base-original.md)
registra a origem e os recursos do motor.

## Versão do motor

### `v1.7.3`

Versão base do motor utilizada na campanha personalizada.
