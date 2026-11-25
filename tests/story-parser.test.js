import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CityMap } from '../src/world/city-map.js';
import {
  parseStoryManifest,
  parseItemMarkdown,
  parseCharacterMarkdown,
  parseMissionMarkdown,
  parseEncounterMarkdown,
  parseMapMarkdown,
  parseMapRoofsMarkdown,
  replaceLocationCodesWithNames,
  replaceStoryPlaceholders,
  validateAssetPath,
  parseStoryCatalog,
  StoryParseError
} from '../src/story/story-parser.js';
import { parseRichTextTokens } from '../src/ui/rich-text.js';
import {
  collectMissionAssetUrls,
  collectStoryAssetUrls,
  discoverTypeBackgroundPool,
  getCharacterSidePngCandidates,
  getCutsceneBackgroundCandidates,
  pickCutsceneBackground,
  getPendingMissionAssetUrls,
  getSplashPngCandidates,
  preloadMissionAssets,
  preloadStoryAssets,
  resolveFirstExistingAsset,
  resolveStoryFaviconUrl,
  isAssetLoaded,
  clearLoadedAssets,
  parseNpcLinesMarkdown,
  shouldShowStorySelector,
} from '../src/story/story-loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storyDir = path.resolve(__dirname, '../story/vibe-coding');

test('carrega e valida o pacote de história de exemplo completo contra a cidade-base', () => {
  const cityMap = new CityMap();
  const manifest = parseStoryManifest(fs.readFileSync(path.join(storyDir, 'story.md'), 'utf8'), 'story.md');

  assert.equal(manifest.title, 'GTA: Missão Vibe Coding');
  assert.ok(manifest.characters.length >= 3);
  assert.ok(manifest.missions.length >= 2);

  for (const charId of manifest.characters) {
    const raw = fs.readFileSync(path.join(storyDir, 'characters', `${charId}.md`), 'utf8');
    const charDef = parseCharacterMarkdown(raw, `characters/${charId}.md`);
    assert.equal(charDef.id, charId);
    assert.ok(charDef.sprites.top);
    assert.ok(charDef.sprites.front);
    assert.ok(charDef.sprites.left);
    assert.ok(charDef.sprites.right);
  }

  const m1 = parseMissionMarkdown(
    fs.readFileSync(path.join(storyDir, 'missions', '01-caixa-secreta.md'), 'utf8'),
    'missions/01-caixa-secreta.md',
    cityMap
  );
  assert.equal(m1.startLocation, 'CASA-001');
  assert.equal(m1.targetLocation, 'COM-320');
  assert.ok(m1.introCutscene.steps.length >= 2);
  const choiceStep = m1.introCutscene.steps.find((s) => s.choices?.length);
  assert.ok(choiceStep);
  assert.equal(choiceStep.choices.length, 3);
  assert.ok(choiceStep.choices.every((c) => c.outcome === 'next'));
  assert.ok(m1.outroCutscene.steps.some((step) => step.type === 'deliver' && step.itemId === 'caixa-secreta'));

  assert.equal(manifest.missions.length, 5);
  assert.equal(manifest.collectibles.length, 12);
  const disqueteCollectible = manifest.collectibles.find((c) => c.itemId === 'disquete');
  assert.ok(disqueteCollectible);
  assert.equal(disqueteCollectible.location, 'PRACA-003');
  assert.equal(disqueteCollectible.rarity, 'especial');
  const disqueteItem = parseItemMarkdown(
    fs.readFileSync(path.join(storyDir, 'items', 'disquete.md'), 'utf8'),
    'items/disquete.md'
  );
  assert.equal(disqueteItem.id, 'disquete');
  assert.equal(disqueteItem.location, undefined);
  assert.equal(disqueteItem.category, undefined);
  const caixaItem = parseItemMarkdown(
    fs.readFileSync(path.join(storyDir, 'items', 'caixa-secreta.md'), 'utf8'),
    'items/caixa-secreta.md'
  );
  assert.equal(caixaItem.id, 'caixa-secreta');
  assert.equal(caixaItem.location, undefined);
  const m5 = parseMissionMarkdown(
    fs.readFileSync(path.join(storyDir, 'missions', '05-chave-do-vibe-coding.md'), 'utf8'),
    'missions/05-chave-do-vibe-coding.md',
    cityMap
  );
  assert.equal(m5.outroCutscene.leftChar, '');
  assert.equal(m5.outroCutscene.rightChar, '');
  assert.equal(m5.outroCutscene.background, 'splash/splash-end.png');
});

test('rejeita caminhos de assets externos ou com traversal', () => {
  assert.throws(() => validateAssetPath('../fora.png', 'story.md', 4), StoryParseError);
  assert.throws(() => validateAssetPath('https://exemplo.com/img.png', 'story.md', 4), StoryParseError);
  assert.throws(() => validateAssetPath('/etc/passwd', 'story.md', 4), StoryParseError);
  assert.equal(validateAssetPath('./assets/alex-top.svg', 'alex.md', 5), 'assets/alex-top.svg');
});

test('sinaliza erro descritivo para frontmatter inválido ou código de local inexistente', () => {
  const cityMap = new CityMap();
  assert.throws(
    () => parseStoryManifest('title: Sem delimitador', 'story.md'),
    (err) => err instanceof StoryParseError && err.message.includes('story.md:1')
  );

  const badMission = `---
id: m-err
title: Missão Inválida
start: CASA-001
target: NAO-EXISTE-99
---
`;
  assert.throws(
    () => parseMissionMarkdown(badMission, 'missions/err.md', cityMap),
    (err) => err instanceof StoryParseError && err.message.includes('NAO-EXISTE-99')
  );
});

test('prioriza PNG na pasta do personagem para visão lateral e faz fallback quando ausente', async () => {
  const candidates = getCharacterSidePngCandidates('./story', 'alex', 'left');
  assert.equal(candidates[0], './story/characters/alex-left.png');
  assert.equal(candidates[2], './story/characters/alex.png');
  assert.equal(candidates[3], './story/characters/alex/alex.png');

  const found = await resolveFirstExistingAsset(candidates, async (url) => url.endsWith('characters/alex.png'));
  assert.equal(found, './story/characters/alex.png');

  const none = await resolveFirstExistingAsset(candidates, async () => false);
  assert.equal(none, '');
});

test('prioriza PNG personalizado para tela de abertura e faz fallback para padrão quando ausente', async () => {
  const candidates = getSplashPngCandidates('./story', 'assets/splash.svg');
  assert.deepEqual(candidates, [
    './story/splash/splash-start.png',
    './story/splash.png',
    './story/assets/splash.png',
  ]);

  const customCandidates = getSplashPngCandidates('./story', 'assets/capa.svg');
  assert.deepEqual(customCandidates, [
    './story/splash/splash-start.png',
    './story/splash.png',
    './story/assets/splash.png',
    './story/assets/capa.png',
  ]);

  const found = await resolveFirstExistingAsset(candidates, async (url) => url === './story/splash/splash-start.png');
  assert.equal(found, './story/splash/splash-start.png');

  const fallback = await resolveFirstExistingAsset(candidates, async () => false);
  assert.equal(fallback, '');
});

test('map/map.md mapeia todos os locais da cidade e substitui códigos em falas e textos', () => {
  const cityMap = new CityMap();
  const mapRaw = fs.readFileSync(path.join(storyDir, 'map/map.md'), 'utf8');
  const locationNames = parseMapMarkdown(mapRaw, 'map/map.md');

  assert.equal(locationNames.get('COM-001'), 'Farmácia Bom Preço');
  assert.equal(locationNames.get('RUA-001'), 'Av. Aurélio Valporto');
  assert.equal(locationNames.get('CASA-002'), 'Casa do Mauro');

  for (const code of cityMap.locationsByCode.keys()) {
    assert.ok(locationNames.has(code), `Código ausente em map/map.md: ${code}`);
    assert.ok(locationNames.get(code).length > 0);
  }

  const speech = 'leve essa encomenda para a [CASA-002] na [RUA-002] e ignore CASA-002 sem colchetes';
  assert.equal(
    replaceLocationCodesWithNames(speech, locationNames),
    'leve essa encomenda para a **__Casa do Mauro__** na **__Rua dos Guararapes__** e ignore CASA-002 sem colchetes'
  );
});

test('resolve cenários PNG/JPG de cutscene por código ou tipo (RUA, PRACA, COM, CASA) e possui exemplos', async () => {
  for (const prefix of ['rua', 'praca', 'com', 'casa']) {
    const hasExample = [`${prefix}.png`, `${prefix}.jpg`, `${prefix}-1.png`, `${prefix}-1.jpg`]
      .some((name) => fs.existsSync(path.join(storyDir, 'map', name)));
    assert.equal(hasExample, true, `Ausente: story/map/${prefix}(-1).png ou .jpg`);
  }

  const candidates = getCutsceneBackgroundCandidates('./story', 'Frente da CASA-001', 'CASA-001');
  assert.deepEqual(candidates, [
    './story/map/CASA-001.png',
    './story/map/CASA-001.jpg',
    './story/map/casa-001.png',
    './story/map/casa-001.jpg',
    './story/map/casa.png',
    './story/map/casa.jpg',
  ]);

  const resolved = await resolveFirstExistingAsset(candidates, async (url) => url === './story/map/casa.png');
  assert.equal(resolved, './story/map/casa.png');
});

test('coleta URLs únicas e pré-carrega assets da história reportando progresso até 100%', async () => {
  const fakeStory = {
    splashUrl: './story/splash.png',
    characters: new Map([
      ['alex', { sprites: { top: './story/assets/alex-top.svg', left: './story/characters/alex.png', right: './story/characters/alex.png' } }],
      ['clara', { sprites: { front: './story/assets/clara-front.svg', empty: '' } }],
    ]),
    missions: [
      {
        introCutscene: { backgroundImage: './story/map/casa.png' },
        outroCutscene: { backgroundImage: './story/map/com.jpg' },
      },
      {
        introCutscene: { backgroundImage: './story/map/casa.png' },
        outroCutscene: { backgroundImage: '' },
      },
    ],
  };

  const urls = collectStoryAssetUrls(fakeStory);
  assert.deepEqual(urls, [
    './story/splash.png',
    './story/assets/alex-top.svg',
    './story/characters/alex.png',
    './story/assets/clara-front.svg',
    './story/map/casa.png',
    './story/map/com.jpg',
  ]);

  const progressEvents = [];
  const summary = await preloadStoryAssets(fakeStory, {
    loadImageFn: async (url) => !url.endsWith('com.jpg'),
    onProgress: (ev) => progressEvents.push(ev),
  });

  assert.equal(summary.total, 6);
  assert.equal(summary.loaded, 6);
  assert.deepEqual(summary.failed, ['./story/map/com.jpg']);
  assert.equal(progressEvents.length, 6);
  assert.equal(progressEvents.at(-1).ratio, 1);
});

test('pré-carrega apenas splash e recursos da missão 0 na abertura e carrega delta nas missões seguintes', async () => {
  clearLoadedAssets();
  const story = {
    splashUrl: './story/splash.png',
    characters: new Map([
      ['guanabara', { sprites: { left: './story/characters/guanabara.png' } }],
      ['beto', { sprites: { right: './story/characters/beto.png' } }],
      ['clara', { sprites: { right: './story/characters/clara.png' } }],
    ]),
    items: new Map([
      ['maleta', { imageUrl: './story/assets/item-maleta.svg' }],
      ['chave', { imageUrl: './story/assets/item-chave.svg' }],
    ]),
    missions: [
      {
        giveItem: 'maleta',
        requireItem: '',
        introCutscene: { leftChar: 'guanabara', rightChar: 'beto', backgroundImage: './story/map/casa.png' },
        outroCutscene: { leftChar: 'guanabara', rightChar: 'beto', backgroundImage: './story/map/rua.png' },
      },
      {
        giveItem: '',
        requireItem: 'chave',
        introCutscene: { leftChar: 'guanabara', rightChar: 'clara', backgroundImage: './story/map/com.jpg' },
        outroCutscene: { leftChar: 'guanabara', rightChar: 'clara', backgroundImage: './story/map/praca.png' },
      },
    ],
  };

  const preloadedUrls = new Set();
  const m0Summary = await preloadMissionAssets(story, 0, {
    includeSplash: true,
    preloadedUrls,
    loadImageFn: async () => true,
  });

  assert.equal(m0Summary.total, 6);
  assert.equal(preloadedUrls.has('./story/splash.png'), true);
  assert.equal(preloadedUrls.has('./story/characters/clara.png'), false);
  assert.equal(preloadedUrls.has('./story/assets/item-chave.svg'), false);

  const pendingM1 = getPendingMissionAssetUrls(story, 1, preloadedUrls, { includeSplash: false });
  assert.deepEqual(pendingM1, [
    './story/map/com.jpg',
    './story/map/praca.png',
    './story/characters/clara.png',
    './story/assets/item-chave.svg',
  ]);

  const m1Summary = await preloadMissionAssets(story, 1, {
    includeSplash: false,
    preloadedUrls,
    loadImageFn: async () => true,
  });
  assert.equal(m1Summary.total, 4);
  assert.equal(getPendingMissionAssetUrls(story, 1, preloadedUrls, { includeSplash: false }).length, 0);
});

test('detecta variantes numeradas por tipo e sorteia cenários evitando repetições consecutivas', async () => {
  const existing = new Set([
    './story/map/casa-1.png',
    './story/map/casa-2.jpg',
    './story/map/casa-3.jpg',
  ]);
  const pool = await discoverTypeBackgroundPool('./story', 'casa', async (url) => existing.has(url));
  assert.deepEqual(pool, [
    './story/map/casa-1.png',
    './story/map/casa-2.jpg',
    './story/map/casa-3.jpg',
  ]);

  const seen = new Set();
  let recent = [];
  for (let i = 0; i < 3; i += 1) {
    const res = pickCutsceneBackground(pool, recent, () => 0);
    assert.equal(seen.has(res.url), false);
    seen.add(res.url);
    recent = res.nextRecent;
  }
  assert.equal(seen.size, 3);

  const afterCycle = pickCutsceneBackground(pool, recent, () => 0);
  assert.notEqual(afterCycle.url, recent[recent.length - 1]);
});

test('lê page_title opcional do story.md para personalizar o título da aba', () => {
  const custom = parseStoryManifest(
    '---\ntitle: Minha História\npage_title: Título da Aba\ncharacters: guanabara\nmissions: 01-caixa-secreta\n---\n',
    'story.md'
  );
  assert.equal(custom.title, 'Minha História');
  assert.equal(custom.pageTitle, 'Título da Aba');

  const fallback = parseStoryManifest(
    '---\ntitle: Minha História\ncharacters: guanabara\nmissions: 01-caixa-secreta\n---\n',
    'story.md'
  );
  assert.equal(fallback.pageTitle, '');
});

test('prioriza favicon na raiz de story e faz fallback para ícone padrão quando ausente', async () => {
  const withSvg = await resolveStoryFaviconUrl('./story', async (url) => url === './story/favicon.svg');
  assert.equal(withSvg, './story/favicon.svg');

  const withPng = await resolveStoryFaviconUrl('./story', async (url) => url === './story/favicon.png');
  assert.equal(withPng, './story/favicon.png');

  const fallback = await resolveStoryFaviconUrl('./story', async () => false);
  assert.equal(fallback, './icon.svg');
});

test('pré-carrega itens extras na abertura quando includeExtras está ativo', async () => {
  const story = {
    splashUrl: './story/splash.png',
    characters: new Map(),
    items: new Map([
      ['caixa', { id: 'caixa', imageUrl: './story/items/caixa.png' }],
      ['disquete', { id: 'disquete', imageUrl: './story/items/disquete.png' }],
      ['caneca', { id: 'caneca', imageUrl: './story/items/caneca.png' }],
    ]),
    extraItems: [
      { id: 'disquete', location: 'PRACA-003', rarity: 'especial', imageUrl: './story/items/disquete.png' },
      { id: 'caneca', location: 'CASA-001', rarity: 'normal', imageUrl: './story/items/caneca.png' },
    ],
    missions: [
      { id: 'm1', giveItem: 'caixa', requireItem: null, introCutscene: null, outroCutscene: null },
    ],
  };

  const preloadedUrls = new Set();
  const summary = await preloadMissionAssets(story, 0, {
    includeSplash: false,
    includeExtras: true,
    preloadedUrls,
    loadImageFn: async () => true,
  });

  assert.equal(summary.total, 3);
  assert.equal(preloadedUrls.has('./story/items/disquete.png'), true);
  assert.equal(preloadedUrls.has('./story/items/caneca.png'), true);
});

test('registra arquivos já carregados em memória e evita recarregamento desnecessário', async () => {
  clearLoadedAssets();
  const story = {
    splashUrl: './story/splash.png',
    characters: new Map([
      ['guanabara', { id: 'guanabara', sprites: { right: './story/characters/guanabara.png' } }],
    ]),
    items: new Map(),
    missions: [],
  };

  let fetchCount = 0;
  const first = await preloadStoryAssets(story, {
    loadImageFn: async () => {
      fetchCount += 1;
      return true;
    },
  });
  assert.equal(first.total, 2);
  assert.equal(fetchCount, 2);
  assert.equal(isAssetLoaded('./story/splash.png'), true);
  assert.equal(isAssetLoaded('./story/characters/guanabara.png'), true);

  // Segunda chamada sem Set explícito ainda evita recarregar os já registrados em memória
  const second = await preloadStoryAssets(story, {
    loadImageFn: async () => {
      fetchCount += 1;
      return true;
    },
  });
  assert.equal(second.total, 0);
  assert.equal(fetchCount, 2);
  clearLoadedAssets();
});

test('parseNpcLinesMarkdown lê falas de NPCs de story/npc-lines.md ignorando cabeçalhos e marcadores', () => {
  const sampleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../story/vibe-coding');
  const raw = fs.readFileSync(path.join(sampleDir, 'npc-lines.md'), 'utf-8');
  const lines = parseNpcLinesMarkdown(raw);
  assert.ok(lines.length >= 200, `esperado >= 200 falas, obtido ${lines.length}`);
  assert.ok(lines.every((l) => l.length > 0 && l.length <= 60 && !l.startsWith('#') && !l.startsWith('- ')));

  const filtered = parseNpcLinesMarkdown(`- Mensagem curta\n- ${'a'.repeat(61)}\n`);
  assert.deepEqual(filtered, ['Mensagem curta']);

  const wrongRaw = fs.readFileSync(path.join(sampleDir, 'wrong-item-lines.md'), 'utf-8');
  const wrongLines = parseNpcLinesMarkdown(wrongRaw);
  assert.ok(wrongLines.length >= 40, `esperado >= 40 falas de item errado, obtido ${wrongLines.length}`);
  assert.ok(wrongLines.every((l) => l.length > 0 && l.length <= 60));
});

test('parseMissionMarkdown interpreta diretiva - LINK: com rótulo personalizado e padrão "Visualizar o link"', () => {
  const md = `---
id: m-link
title: Teste Link
start: RUA-001-01
target: COM-001-01
---
## CUTSCENE_INICIO
left: prota
right: mentor
bg: RUA
- prota: Olha esse site aqui!
- LINK: Acessar Curso -> https://www.cursoemvideo.com/
- mentor: Também tem esse outro endereço.
- LINK: https://www.cursoemvideo.com/cursos
`;
  const mission = parseMissionMarkdown(md, 'm-link.md');
  assert.equal(mission.introCutscene.steps.length, 2);
  assert.deepEqual(mission.introCutscene.steps[0].link, {
    label: 'Acessar Curso',
    url: 'https://www.cursoemvideo.com/',
  });
  assert.deepEqual(mission.introCutscene.steps[1].link, {
    label: 'Visualizar o link',
    url: 'https://www.cursoemvideo.com/cursos',
  });
});

test('parseMissionMarkdown rejeita - LINK: inválido, protocolo proibido ou sem fala anterior', () => {
  const baseHeader = `---
id: m-link-err
title: Erro Link
start: RUA-001-01
target: COM-001-01
---
## CUTSCENE_INICIO
left: prota
right: mentor
`;

  assert.throws(
    () =>
      parseMissionMarkdown(
        `${baseHeader}- prota: Fala\n- LINK: Clique -> javascript:alert(1)\n`,
        'm-link-err.md',
      ),
    StoryParseError,
  );

  assert.throws(
    () =>
      parseMissionMarkdown(
        `${baseHeader}- prota: Fala\n- LINK: Clique -> url-invalida\n`,
        'm-link-err.md',
      ),
    StoryParseError,
  );

  assert.throws(
    () =>
      parseMissionMarkdown(
        `${baseHeader}- LINK: Sem fala -> https://www.cursoemvideo.com/\n`,
        'm-link-err.md',
      ),
    StoryParseError,
  );
});

test('parseEncounterMarkdown lê encontro extra em construção e rejeita local não edificável', () => {
  const map = new CityMap();
  const sampleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../story/vibe-coding');
  const raw = fs.readFileSync(path.join(sampleDir, 'missions/extra-casa-hostnet.md'), 'utf-8');
  const encounter = parseEncounterMarkdown(raw, 'missions/extra-casa-hostnet.md', map);

  assert.equal(encounter.id, 'extra-casa-hostnet');
  assert.ok(encounter.npc);
  assert.equal(encounter.location, 'CASA-063');
  assert.match(encounter.roofColor, /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  assert.ok(encounter.cutscene.steps.length >= 2);

  const defaultEncounter = parseEncounterMarkdown(
    `---\nid: def\nnpc: maltmon\nlocation: CASA-063\n---\n## CUTSCENE\n- maltmon: Oi\n`,
    'def.md',
    map,
  );
  assert.equal(defaultEncounter.roofColor, '#d6282e');
  assert.equal(defaultEncounter.roofLogo, '');

  const customEncounter = parseEncounterMarkdown(
    `---\nid: custom\nnpc: maltmon\nlocation: CASA-063\nroof_color: #2563eb\nroof_logo: assets/alex-front.svg\n---\n## CUTSCENE\n- maltmon: Oi\n`,
    'custom.md',
    map,
  );
  assert.equal(customEncounter.roofColor, '#2563eb');
  assert.equal(customEncounter.roofLogo, 'assets/alex-front.svg');

  assert.throws(
    () =>
      parseEncounterMarkdown(
        `---\nid: badcolor\nnpc: maltmon\nlocation: CASA-063\nroof_color: azul\n---\n## CUTSCENE\n- maltmon: Oi\n`,
        'badcolor.md',
        map,
      ),
    StoryParseError,
  );

  assert.throws(
    () =>
      parseEncounterMarkdown(
        `---\nid: bad\nnpc: maltmon\nlocation: RUA-004\n---\n## CUTSCENE\n- maltmon: Oi\n`,
        'bad.md',
        map,
      ),
    StoryParseError,
  );
});

test('parseStoryCatalog valida stories.json real, entrada direta para 1 história e rejeita catálogo inválido', () => {
  const catalogPath = path.resolve(storyDir, '../stories.json');
  const raw = fs.readFileSync(catalogPath, 'utf8');
  const entries = parseStoryCatalog(raw, 'stories.json');
  assert.equal(entries.length, 2);
  const original = entries.find((entry) => entry.id === 'vibe-coding');
  assert.equal(original.path, './story/vibe-coding');
  const rescue = entries.find((entry) => entry.id === 'codigo-de-resgate');
  assert.equal(rescue.path, './story/codigo-de-resgate');
  assert.equal(shouldShowStorySelector(entries), true);

  const singleStory = parseStoryCatalog(JSON.stringify({ stories: [original] }));
  assert.equal(shouldShowStorySelector(singleStory), false);

  const twoStories = parseStoryCatalog(JSON.stringify({
    stories: [
      { id: 'vibe-coding', title: 'Vibe Coding' },
      { id: 'historia-dois', title: 'História Dois', description: 'Teste' },
    ],
  }));
  assert.equal(twoStories.length, 2);
  assert.equal(twoStories[1].path, './story/historia-dois');
  assert.equal(shouldShowStorySelector(twoStories), true);

  assert.throws(() => parseStoryCatalog('{invalid', 'stories.json'), StoryParseError);
  assert.throws(() => parseStoryCatalog('{"stories":[]}', 'stories.json'), StoryParseError);
  assert.throws(
    () => parseStoryCatalog(JSON.stringify({ stories: [{ id: '../hack', title: 'X' }] }), 'stories.json'),
    StoryParseError,
  );
});

test('parseMapMarkdown e parseMapRoofsMarkdown leem roof_color e roof_logo opcionais por edificação', () => {
  const sample = [
    'RUA-001: Av. Central',
    'CASA-010: Casa Azul | roof_color=#2563eb | roof_logo=assets/hostnet.svg',
    'COM-002: Loja Verde | roof_color=#16a34a',
  ].join('\n');

  const names = parseMapMarkdown(sample, 'map/map.md');
  assert.equal(names.get('RUA-001'), 'Av. Central');
  assert.equal(names.get('CASA-010'), 'Casa Azul');
  assert.equal(names.get('COM-002'), 'Loja Verde');

  const roofs = parseMapRoofsMarkdown(sample, 'map/map.md');
  assert.deepEqual(roofs.get('CASA-010'), { roofColor: '#2563eb', roofLogo: 'assets/hostnet.svg' });
  assert.deepEqual(roofs.get('COM-002'), { roofColor: '#16a34a', roofLogo: '' });
  assert.equal(roofs.has('RUA-001'), false);

  assert.throws(
    () => parseMapRoofsMarkdown('RUA-001: Av. Central | roof_color=#2563eb', 'map/map.md'),
    StoryParseError,
  );
  assert.throws(
    () => parseMapRoofsMarkdown('CASA-010: Casa | roof_color=azul', 'map/map.md'),
    StoryParseError,
  );
});

test('parseCharacterMarkdown lê sprite_cutscene opcional para retratos PNG em assets/', () => {
  const customChar = parseCharacterMarkdown(
    '---\nid: test\nname: Teste\nsprite_top: assets/t.svg\nsprite_cutscene: assets/test.png\n---\n',
    'test.md',
  );
  assert.equal(customChar.sprites.cutscene, 'assets/test.png');
});

test('replaceStoryPlaceholders substitui locais, itens e personagens entre colchetes com negrito/sublinhado e parseRichTextTokens interpreta estilos', () => {
  const locationNames = new Map([['CASA-001', 'Casa Inicial'], ['RUA-002', 'Rua dos Guararapes']]);
  const items = new Map([['machado', { id: 'machado', name: 'Machado Dourado' }]]);
  const characters = new Map([['guanabara', { id: 'guanabara', name: 'Guanabara' }]]);

  const resolved = replaceStoryPlaceholders(
    'Vá até a [CASA-001] na [RUA-002], pegue o [ITEM-MACHADO] e entregue para [Guanabara].',
    { locationNames, items, characters },
  );
  assert.equal(
    resolved,
    'Vá até a **__Casa Inicial__** na **__Rua dos Guararapes__**, pegue o **__Machado Dourado__** e entregue para **__Guanabara__**.',
  );

  const tokens = parseRichTextTokens('Texto **negrito**, *itálico*, __sublinhado__ e **__Destaque__**');
  assert.deepEqual(tokens, [
    { text: 'Texto ', bold: false, italic: false, underline: false },
    { text: 'negrito', bold: true, italic: false, underline: false },
    { text: ', ', bold: false, italic: false, underline: false },
    { text: 'itálico', bold: false, italic: true, underline: false },
    { text: ', ', bold: false, italic: false, underline: false },
    { text: 'sublinhado', bold: false, italic: false, underline: true },
    { text: ' e ', bold: false, italic: false, underline: false },
    { text: 'Destaque', bold: true, italic: false, underline: true },
  ]);
});

test('parseMissionMarkdown lê seção ## ITENS com item-id, location e rarity', () => {
  const cityMap = new CityMap();
  const mission = parseMissionMarkdown(
    `---
id: 01-teste
title: Missão Teste
start: CASA-001
target: COM-001
---

## CUTSCENE_INICIO
left: p1
right: p2
bg: CASA-001
- P1: Olá!

## CUTSCENE_FIM
left: p1
right: p2
bg: COM-001
- P2: Obrigado!

## ITENS
- item-extra | PRACA-002 | especial
- outro-item | RUA-004 x RUA-036 NE
`,
    'missions/01-teste.md',
    cityMap,
  );
  assert.equal(mission.extraItems.length, 2);
  assert.deepEqual(mission.extraItems[0], {
    itemId: 'item-extra',
    location: 'PRACA-002',
    rarity: 'especial',
    lineNum: 20,
  });
  assert.deepEqual(mission.extraItems[1], {
    itemId: 'outro-item',
    location: 'RUA-004 x RUA-036 NE',
    rarity: 'normal',
    lineNum: 21,
  });
});

test('loadStoryPackage rejeita o mesmo item posicionado em dois locais diferentes', async () => {
  const { loadStoryPackage } = await import('../src/story/story-loader.js');
  const cityMap = new CityMap();
  const files = {
    './story/dup/story.md': `---
title: Duplicado
splash: splash/s.png
characters: p1
items: item-a
collectibles: item-a @ PRACA-002 (normal)
missions: 01-m
---
`,
    './story/dup/characters/p1.md': '---\nid: p1\nname: P1\nsprite_top: assets/p1.svg\n---\n',
    './story/dup/items/item-a.md': '---\nid: item-a\nname: Item A\ndescription: Desc\nimage: assets/a.svg\n---\n',
    './story/dup/missions/01-m.md': `---
id: 01-m
title: M1
start: CASA-001
target: COM-001
---
## CUTSCENE_INICIO
left: p1
right: -
bg: CASA-001
- P1: Oi

## CUTSCENE_FIM
left: p1
right: -
bg: COM-001
- P1: Fim

## ITENS
- item-a | CASA-001 | normal
`,
  };
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const cleanUrl = String(url).split('?')[0];
    if (cleanUrl in files) {
      return { ok: true, status: 200, text: async () => files[cleanUrl] };
    }
    return { ok: false, status: 404, text: async () => '' };
  };
  try {
    await assert.rejects(
      () => loadStoryPackage('./story/dup', cityMap, { forceReload: true }),
      (err) => err?.name === 'StoryParseError' && /mais de um local/i.test(err.message),
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});
