<p align="center">
  <img src="./src/images/favicon.svg" alt="Logo GTA — Guanabara Testando Agentes" width="84" height="84">
</p>

<h1 align="center">GTA (Guanabara Testando Agentes)</h1>

<p align="center">
  <strong>Um jogo retrô de mundo aberto em visão superior construído com WebGL, Canvas 2D e JavaScript puro — aberto para você jogar, estudar e criar suas próprias histórias.</strong>
</p>

<p align="center">
  <img src="./src/images/splash-start.png" alt="Tela de abertura de GTA: Missão Vibe Coding" width="760">
</p>

<p align="center">
  <a href="https://youtu.be/QIRH31j42yw" target="_blank" rel="noopener noreferrer"><img src="./src/images/btn-veja-video.png" alt="VEJA O VÍDEO" width="310"></a>&nbsp;&nbsp;<a href="https://gustavoguanabara.github.io/gta/" target="_blank" rel="noopener noreferrer"><img src="./src/images/btn-jogue-gta.png" alt="JOGUE GTA AGORA" width="310"></a>
</p>

---

## Sobre o Projeto

**GTA (Guanabara Testando Agentes)** nasceu como um laboratório prático e divertido para explorar o desenvolvimento de aplicações completas com apoio de agentes de inteligência artificial — sem abrir mão de arquitetura limpa, testes automatizados e experiência polida em desktop e celular.

Todo o motor roda diretamente no navegador, sem frameworks ou dependências externas em tempo de execução, combinando **ES Modules**, **WebGL** para renderização da cidade, **Canvas 2D** para minimapa e mapa ampliado, **Service Worker** para cache offline e suporte completo a **PWA** (incluindo *Adicionar à Tela de Início* no iPhone e iPad).

---

## A História Atual: *Missão Vibe Coding*

Nesta edição, a pasta [`story/vibe-coding/`](./story/vibe-coding) traz a campanha **Missão Vibe Coding** (e o jogo suporta múltiplas histórias selecionáveis na abertura).

<img src="./src/images/guanabara.png" alt="Personagem Guanabara" width="160" align="left">

Você controla **Guanabara**, um motorista experiente que conhece cada rua, esquina e atalho da ilha.

Tudo começa com uma encomenda misteriosa: uma **caixa secreta** que precisa cruzar a cidade. A partir daí, uma sequência de entregas, imprevistos tecnológicos, bugs improváveis e figuras inspiradas no universo de tecnologia e inteligência artificial transforma um simples trajeto em uma corrida cheia de humor — envolvendo GPUs, servidores, robôs e muito café.

*Sem spoilers:* explore a cidade com calma, converse com moradores nas calçadas e fique atento aos itens colecionáveis espalhados pelos quarteirões!

<br clear="all">

---

## Crie Sua Própria História (Setup Visual ou Markdown)

Este é um projeto **Open Source** pensado para ser modificado. Você pode criar múltiplas histórias independentes sem precisar mexer no motor do jogo — usando a aplicação desktop [`setup/`](./setup) (recomendado) ou editando os arquivos em [`story/`](./story):

```text
.
├── index.html                  # Ponto de entrada do jogo em tela cheia
├── src/                        # Motor WebGL, física, mapa, UI e carregador de histórias
├── styles/                     # Folhas de estilo CSS3 do jogo
├── setup/                      # Aplicação desktop local (Python + PySide6) para editar histórias
│   ├── install.py              # Instalador multiplataforma de dependências (.venv + PySide6)
│   ├── install-win.bat / install-mac.command / install-lnx.sh
│   ├── setup-gta-win.bat / setup-gta-mac.command / setup-gta-lnx.sh
│   └── main.py                 # Ponto de entrada da interface gráfica do Setup
└── story/
    ├── stories.json            # Catálogo das histórias exibidas na abertura do jogo
    ├── _template/              # História modelo (não editável) usada ao criar uma nova história
    └── vibe-coding/            # Campanha completa de exemplo ("Missão Vibe Coding")
        ├── story.md            # Título, subtítulo, lista de personagens, itens e missões
        ├── favicon.svg         # Ícone da aba do navegador e do Web App
        ├── npc-lines.md        # Frases aleatórias para balões HQ dos moradores
        ├── wrong-item-lines.md # Reações genéricas ao entregar item errado
        ├── splash/             # splash-start.png e splash-end.png
        ├── assets/             # Sprites (.svg), retratos de cutscene (.png), itens e logos
        ├── characters/         # Fichas (.md) dos personagens
        ├── items/              # Definições (.md) de itens de missão e extras no mapa
        ├── missions/           # Roteiros das missões (.md) e encontros extras (extra-*.md)
        └── map/                # Nomes/telhados dos códigos de 3 dígitos (map.md) e cenários POV
```

Quando houver **2 ou mais histórias** em `story/stories.json`, o jogo exibe automaticamente uma tela de seleção na abertura (e a opção **Trocar de história** no menu de pausa), mantendo o progresso salvo isolado por história.

---

## Ferramenta Desktop de Criação (`setup/`)

Para criar e gerenciar histórias, missões, cutscenes, personagens, itens e telhados sem editar Markdown manualmente, utilize o aplicativo local em [`setup/`](./setup) (requer **Python 3.11+**).

### Instalação e Execução por Duplo Clique

Entre na pasta `setup/`:

| Sistema | Instalar dependências | Abrir o Setup | Desinstalar dependências |
|---|---|---|---|
| **Windows** | `install-win.bat` | `setup-gta-win.bat` | `uninstall-win.bat` |
| **macOS** | `install-mac.command` | `setup-gta-mac.command` | `uninstall-mac.command` |
| **Linux** | `install-lnx.sh` | `setup-gta-lnx.sh` | `uninstall-lnx.sh` |

*(Se abrir diretamente o `setup-gta-*` antes de instalar, ele detecta a ausência do ambiente e pergunta se deseja instalar na hora.)*

### Instalação e Execução via Terminal

```bash
cd setup
python3 install.py        # macOS / Linux (ou "py install.py" no Windows)
python3 install.py --run  # Instala e já abre o Setup em seguida
```

### Recursos do Setup

- **Gerenciador de histórias:** cria novas histórias a partir de `story/_template/`, edita metadados/splashes e mantém `story/stories.json` sincronizado.
- **Seletor visual de mapa:** clique nos quadrados da cidade-base (códigos de 3 dígitos como `CASA-001`, `COM-001`, `PRACA-001`) com visualização do nome completo antes de confirmar.
- **Listas fechadas e validação referencial:** impede referências quebradas ou exclusão de personagens/itens em uso.
- **Formatação e placeholders:** atalhos para `**negrito**`, `*itálico*`, `__sublinhado__` e inserção de `[CODIGO]`, `[ITEM-id]` e `[Personagem]` (destacados automaticamente em negrito e sublinhado no jogo).
- **Testar no Navegador:** valida, salva e abre o jogo localmente já na história em edição.

---

## Recursos do Motor e Jogabilidade

- **Cidade-ilha procedural (30×30 quarteirões)**: ruas nomeadas, casas, comércios, praças, 40 hospitais com recuperação de vida, áreas portuárias e barcos circulando ao redor da ilha.
- **Tráfego e pedestres vivos**: carros, motos e vans com comportamento distinto, curvas suaves em esquinas, semáforos, faixas de pedestres, frenagem preventiva diante do jogador a pé, colisões com dano proporcional à velocidade e explosões em cadeia.
- **Balões de diálogo estilo HQ**: moradores na rua e reações no inventário exibem balões animados acima do alvo com efeito de digitação.
- **Mapa ampliado inteligente**: enquadramento automático de jogador e destino ao abrir, zoom por pinça/scroll/botões e rota traçada pelas ruas até o objetivo.
- **Controles multiplataforma**:
  - **Teclado**: `Setas` ou `WASD` para mover/dirigir, `Espaço` para ação/acelerar, `Shift`/`X` para frear/ré, `I`/`Tab` para inventário, `M` para mapa ampliado e `Esc`/`P` para pausa.
  - **Joystick / Gamepad**: suporte completo em menus, diálogos e direção.
  - **Tela de toque (iOS/Android)**: analógico virtual a pé, volante horizontal com âncora relativa ao primeiro toque ao dirigir, além de HUD adaptativo para modo retrato e paisagem.
- **Progresso salvo no navegador**: missões desbloqueadas, inventário e posição são preservados entre recarregamentos.

---

## Como Executar Localmente e Rodar os Testes

Como o projeto utiliza **ES Modules**, sirva esta pasta por um servidor HTTP local (não abra o `index.html` diretamente via `file://`):

```bash
# Opção 1: Python
python3 -m http.server 8080

# Opção 2: Node.js
npx serve .
```

Depois, acesse `http://localhost:8080` no navegador.

Para executar as suítes de testes unitários (motor JS e domínio do Setup em Python):

```bash
node --test tests/*.test.js
python3 -m unittest discover -s setup/tests
```

---

## Propósito Educacional — Curso em Vídeo

Este projeto foi idealizado e criado por **Gustavo Guanabara**, professor e fundador do [**Curso em Vídeo**](https://www.youtube.com/cursoemvideo) no YouTube.

O objetivo do **GTA — Guanabara Testando Agentes** vai muito além do jogo: ele existe para **incentivar pessoas de todas as idades a aprenderem a desenvolver soluções reais**, mostrando na prática como tecnologia, criatividade, lógica e ferramentas modernas podem caminhar juntas. O **Curso em Vídeo** tem como missão democratizar o ensino de tecnologia em língua portuguesa e **formar a próxima geração de desenvolvedores do mercado**.

Curtiu o projeto? Faça um **fork**, crie sua própria história em [`story/`](./story), compartilhe com a comunidade e continue aprendendo!

---

## Histórico de versões

### `v1.7.3` — Minimapa Proporcional, Telhados sem Distorção e Créditos na Abertura (2026-11-22)
- **Minimapa Ampliado:** ícones de posição do jogador, ponto de destino amarelo e espessura da linha do trajeto agora crescem proporcionalmente ao nível de zoom aplicado.
- **Telhados Personalizados:** preservação da proporção original das imagens de logo nos telhados tanto na renderização WebGL quanto no minimapa e mapa ampliado.
- **Tela de Abertura (`splash`):** exibição discreta dos créditos de autoria e da versão atual do software no canto inferior direito.
- **README:** imagens centralizadas em `src/images/` com botões de acesso rápido **VEJA O VÍDEO** e **JOGUE GTA AGORA**.

### `v1.6` — Aba Resumo, Zoom de Imagens e Melhorias Visuais (2026-11-22)
- **Aba Resumo no Setup:** nova aba inicial com a imagem de abertura (`splash`) em proporção original, título, descrição e painéis clicáveis com contadores de missões, personagens e itens usados na história.
- **Zoom de Imagens no Setup:** clique em qualquer miniatura de seletor de imagem (abertura, encerramento, favicon, visões de personagem, item e logo de telhado) para abrir uma janela de ampliação proporcional, fechando pelo botão **Fechar**, clique na janela principal ou clique na própria imagem ampliada.
- **Ícone Dinâmico da Janela:** o ícone da janela do Setup (exibido no `Alt+Tab` / `Cmd+Tab`) acompanha automaticamente o favicon da história carregada.
- **Personalização de Personagens e Itens:** protagonista configurável por história, cor de pele (`skin_color`) por personagem com renderização de braços e pernas arredondados no jogo, catálogo puro de itens e posicionamento de extras por missão ou colecionáveis globais.
- **README:** adicionado botão em destaque **JOGUE GTA AGORA** logo abaixo da imagem de abertura.

### `v1.5` — Instaladores, Lançadores e Desinstalador Multiplataforma do Setup (2026-11-18)
- Adicionado instalador multiplataforma [`setup/install.py`](./setup/install.py) para criar o ambiente virtual isolado (`.venv`) e instalar o `PySide6`.
- Adicionado desinstalador [`setup/uninstall.py`](./setup/uninstall.py) para remover `.venv` e caches do Setup sem alterar o Python do sistema.
- Criados lançadores de duplo clique identificados por sistema operacional (`install-win.bat`, `setup-gta-win.bat`, `uninstall-win.bat`; `install-mac.command`, `setup-gta-mac.command`, `uninstall-mac.command`; `install-lnx.sh`, `setup-gta-lnx.sh`, `uninstall-lnx.sh`), com verificação da pasta do projeto, checagem de dependências, oferta de instalação `S/N` e pausa em caso de erro.
- Documentação atualizada em `README.md` e `setup/README.md`.

### `v1.0` — Múltiplas Histórias, Aplicação Desktop Setup e Placeholders Ricos (2026-11-18)
- **Motor e Cidade-Base:** ilha procedural 30×30 com códigos padronizados em **3 dígitos** (`CASA-001`, `RUA-001`, `COM-001`, `PRACA-001`, `HOSP-001`), interiores térreos com telhados personalizáveis (`roof_color`, `roof_logo`), tráfego em mão dupla, semáforos, pedestres com balões HQ, veículos com drift e explosões, inventário paginado com raridades e controles unificados para teclado, joystick e toque (retrato e paisagem).
- **Múltiplas Histórias:** organização das campanhas em subpastas (`story/vibe-coding/`, catálogo `story/stories.json`), seletor de histórias na abertura, opção **Trocar de história** no menu de pausa e progresso salvo isolado por história.
- **Narrativa e Formatação:** suporte a cutscenes em visão lateral com retratos PNG em `assets/` (`sprite_cutscene`), encontros extras fixos em construções, botão de link externo com janela web embutida, placeholders entre colchetes (`[CASA-001]`, `[ITEM-id]`, `[Personagem]`) destacados automaticamente em negrito e sublinhado, e formatação `**negrito**`, `*itálico*` e `__sublinhado__`.
- **Aplicação Desktop `setup/`:** editor gráfico em Python + PySide6 com tema nas cores do jogo, modelo não editável [`story/_template/`](./story/_template), seletor visual de locais no mapa clicável, listas fechadas para personagens/itens, validação de integridade referencial e botão **Testar no Navegador**.
