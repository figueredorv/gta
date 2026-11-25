export class StoryParseError extends Error {
  constructor(fileName, line, message) {
    const loc = line ? `${fileName}:${line}` : fileName;
    super(`[${loc}] ${message}`);
    this.name = 'StoryParseError';
    this.fileName = fileName;
    this.line = line || 0;
  }
}

export function validateAssetPath(rawPath, fileName, line = 1) {
  const value = String(rawPath || '').trim();
  if (!value) return '';
  if (
    value.startsWith('/') ||
    value.startsWith('\\') ||
    value.includes('..') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)
  ) {
    throw new StoryParseError(
      fileName,
      line,
      `Caminho de recurso inválido "${value}". Use apenas caminhos relativos dentro da pasta da história.`,
    );
  }
  return value.replace(/^\.\//, '');
}

export function parseFrontmatter(rawText, fileName = 'arquivo.md') {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  if (lines[0]?.trim() !== '---') {
    throw new StoryParseError(fileName, 1, 'Cabeçalho frontmatter "---" ausente na primeira linha.');
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    throw new StoryParseError(fileName, 1, 'Fechamento "---" do frontmatter não encontrado.');
  }

  const meta = {};
  for (let i = 1; i < endIndex; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex <= 0) {
      throw new StoryParseError(fileName, i + 1, `Linha inválida no frontmatter: "${trimmed}". Esperado "chave: valor".`);
    }

    const key = trimmed.slice(0, colonIndex).trim();
    const val = trimmed.slice(colonIndex + 1).trim();
    meta[key] = val;
  }

  const body = lines.slice(endIndex + 1).join('\n').trim();
  return { meta, body, bodyStartLine: endIndex + 2 };
}

function parseListField(rawValue) {
  return String(rawValue || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const VALID_RARITIES = new Set(['normal', 'especial', 'lendario']);

function normalizeRarity(rawRarity, fileName, lineNum = 2) {
  const clean = String(rawRarity || 'normal').trim().toLowerCase();
  if (!VALID_RARITIES.has(clean)) {
    throw new StoryParseError(
      fileName,
      lineNum,
      `Raridade inválida "${rawRarity}". Use "normal", "especial" ou "lendario".`,
    );
  }
  return clean;
}

function parseStoryCollectiblesField(rawValue, fileName = 'story.md') {
  const entries = parseListField(rawValue);
  return entries.map((entry) => {
    const match = entry.match(/^([^\s@]+)\s*@\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/);
    if (!match) {
      throw new StoryParseError(
        fileName,
        2,
        `Colecionável malformado em story.md: "${entry}". Use "item-id @ LOCAL (raridade)".`,
      );
    }
    const itemId = match[1].trim();
    const location = match[2].trim();
    const rarity = normalizeRarity(match[3] || 'normal', fileName, 2);
    if (!itemId || !location) {
      throw new StoryParseError(
        fileName,
        2,
        `Colecionável incompleto em story.md: "${entry}". Informe item-id e LOCAL.`,
      );
    }
    return { itemId, location, rarity };
  });
}

export function parseStoryManifest(rawText, fileName = 'story.md') {
  const { meta, body } = parseFrontmatter(rawText, fileName);

  if (!meta.title) {
    throw new StoryParseError(fileName, 2, 'Campo obrigatório "title" ausente em story.md.');
  }

  const characters = parseListField(meta.characters);
  if (characters.length === 0) {
    throw new StoryParseError(fileName, 2, 'Campo obrigatório "characters" deve listar ao menos um personagem.');
  }

  const missions = parseListField(meta.missions);
  if (missions.length === 0) {
    throw new StoryParseError(fileName, 2, 'Campo obrigatório "missions" deve listar ao menos uma missão.');
  }

  const items = parseListField(meta.items);
  const collectibles = parseStoryCollectiblesField(meta.collectibles, fileName);
  const encounters = parseListField(meta.encounters);
  const protagonist = String(meta.protagonist || '').trim();

  return {
    title: meta.title,
    pageTitle: meta.page_title || '',
    subtitle: meta.subtitle || '',
    splash: validateAssetPath(meta.splash || '', fileName, 2),
    protagonist,
    completionTitle: meta.completion_title || '',
    completionMessage: meta.completion_message || '',
    characters,
    missions,
    items,
    collectibles,
    encounters,
    description: body,
  };
}

export function parseItemMarkdown(rawText, fileName = 'item.md') {
  const { meta, body } = parseFrontmatter(rawText, fileName);

  if (!meta.id || !meta.name) {
    throw new StoryParseError(fileName, 2, 'Item deve definir "id" e "name" no frontmatter.');
  }

  return {
    id: meta.id,
    name: meta.name,
    description: meta.description || body || '',
    image: validateAssetPath(meta.image || '', fileName, 2),
  };
}

export function parseCharacterMarkdown(rawText, fileName = 'character.md') {
  const { meta } = parseFrontmatter(rawText, fileName);

  if (!meta.id || !meta.name) {
    throw new StoryParseError(fileName, 2, 'Personagem deve definir "id" e "name" no frontmatter.');
  }

  return {
    id: meta.id,
    name: meta.name,
    profile: meta.profile || '',
    traits: meta.traits || '',
    skinColor: String(meta.skin_color || '#f1c27d').trim() || '#f1c27d',
    sprites: {
      top: validateAssetPath(meta.sprite_top || '', fileName, 2),
      front: validateAssetPath(meta.sprite_front || '', fileName, 2),
      left: validateAssetPath(meta.sprite_left || '', fileName, 2),
      right: validateAssetPath(meta.sprite_right || '', fileName, 2),
      cutscene: validateAssetPath(meta.sprite_cutscene || meta.cutscene_image || '', fileName, 2),
    },
  };
}

function parseCutsceneBlock(blockLines, startLine, fileName) {
  const cutscene = {
    leftChar: '',
    rightChar: '',
    background: '',
    steps: [],
  };

  let pendingChoices = null;

  for (let i = 0; i < blockLines.length; i += 1) {
    const lineNum = startLine + i;
    const trimmed = blockLines[i].trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('- ENTREGAR:')) {
      const itemId = trimmed.slice('- ENTREGAR:'.length).trim();
      pendingChoices = null;
      cutscene.steps.push({
        type: 'deliver',
        itemId,
        speaker: '',
        text: '',
      });
      continue;
    }

    if (trimmed.startsWith('- LINK:')) {
      const linkBody = trimmed.slice('- LINK:'.length).trim();
      const arrowIdx = linkBody.indexOf('->');
      const label = arrowIdx === -1
        ? 'Visualizar o link'
        : (linkBody.slice(0, arrowIdx).trim() || 'Visualizar o link');
      const rawUrl = arrowIdx === -1 ? linkBody : linkBody.slice(arrowIdx + 2).trim();

      if (!rawUrl) {
        throw new StoryParseError(
          fileName,
          lineNum,
          'Link vazio em "- LINK:". Use "- LINK: Texto -> https://..." ou "- LINK: https://...".',
        );
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        throw new StoryParseError(
          fileName,
          lineNum,
          `URL inválida "${rawUrl}" em "- LINK:". Use uma URL completa com http:// ou https://.`,
        );
      }

      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new StoryParseError(
          fileName,
          lineNum,
          `Protocolo não permitido "${parsedUrl.protocol}" em "- LINK:". Use apenas http:// ou https://.`,
        );
      }

      const lastStep = cutscene.steps[cutscene.steps.length - 1];
      if (!lastStep || lastStep.type === 'deliver') {
        throw new StoryParseError(
          fileName,
          lineNum,
          'A diretiva "- LINK:" deve vir logo após uma fala de personagem.',
        );
      }
      if (lastStep.link) {
        throw new StoryParseError(
          fileName,
          lineNum,
          'Cada fala pode ter apenas uma diretiva "- LINK:".',
        );
      }

      pendingChoices = null;
      lastStep.link = {
        label,
        url: parsedUrl.href,
      };
      continue;
    }

    if (trimmed.startsWith('- OPCAO:')) {
      const optionBody = trimmed.slice('- OPCAO:'.length).trim();
      const arrowIdx = optionBody.indexOf('->');
      if (arrowIdx === -1) {
        throw new StoryParseError(
          fileName,
          lineNum,
          'Opção malformada. Use "- OPCAO: Texto -> COMPLETE" ou "-> GAMEOVER: motivo".',
        );
      }

      const label = optionBody.slice(0, arrowIdx).trim();
      const targetRaw = optionBody.slice(arrowIdx + 2).trim();
      let outcome = 'complete';
      let reason = '';

      if (targetRaw.toUpperCase().startsWith('GAMEOVER')) {
        outcome = 'gameover';
        const colonIdx = targetRaw.indexOf(':');
        reason = colonIdx !== -1 ? targetRaw.slice(colonIdx + 1).trim() : 'Você fez a escolha errada.';
      } else if (targetRaw.toUpperCase() === 'NEXT') {
        outcome = 'next';
      } else if (targetRaw.toUpperCase() === 'COMPLETE') {
        outcome = 'complete';
      } else {
        throw new StoryParseError(
          fileName,
          lineNum,
          `Destino de opção desconhecido "${targetRaw}". Use COMPLETE, NEXT ou GAMEOVER: motivo.`,
        );
      }

      if (!pendingChoices) {
        if (cutscene.steps.length === 0) {
          cutscene.steps.push({ speaker: '', text: 'Escolha uma ação:', choices: [] });
        }
        const lastStep = cutscene.steps[cutscene.steps.length - 1];
        lastStep.choices = lastStep.choices || [];
        pendingChoices = lastStep.choices;
      }

      pendingChoices.push({ label, outcome, reason });
      continue;
    }

    pendingChoices = null;

    if (trimmed.startsWith('- ')) {
      const speech = trimmed.slice(2).trim();
      const colonIdx = speech.indexOf(':');
      if (colonIdx <= 0) {
        throw new StoryParseError(fileName, lineNum, `Fala malformada: "${trimmed}". Use "- Personagem: Fala".`);
      }
      const speaker = speech.slice(0, colonIdx).trim();
      const text = speech.slice(colonIdx + 1).trim();
      cutscene.steps.push({ speaker, text });
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const value = trimmed.slice(colonIdx + 1).trim();
      const normalizeChar = (val) => (/^(?:none|nenhum|-)$/i.test(val) ? '' : val);
      if (key === 'left') cutscene.leftChar = normalizeChar(value);
      else if (key === 'right') cutscene.rightChar = normalizeChar(value);
      else if (key === 'bg') cutscene.background = value;
    }
  }

  return cutscene;
}

function splitMarkdownSections(body, bodyStartLine, allowedNames) {
  const lines = body ? body.split('\n') : [];
  const sections = {};
  const sectionStarts = {};
  for (const name of allowedNames) {
    sections[name] = [];
    sectionStarts[name] = bodyStartLine;
  }
  let activeSection = null;

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('## ')) {
      const name = trimmed.slice(3).trim().toUpperCase();
      if (allowedNames.includes(name)) {
        activeSection = name;
        sectionStarts[name] = bodyStartLine + i + 1;
      } else {
        activeSection = null;
      }
      continue;
    }
    if (activeSection) {
      sections[activeSection].push(lines[i]);
    }
  }

  return { sections, sectionStarts };
}

function parseMissionItemsBlock(lines, startLine, fileName, cityMap = null) {
  const entries = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    const lineNum = startLine + idx;
    const trimmed = lines[idx].trim();
    if (!trimmed) continue;
    const clean = trimmed.startsWith('- ') ? trimmed.slice(2).trim() : trimmed;
    const parts = clean.split('|').map((p) => p.trim());
    if (parts.length < 2 || parts.length > 3 || !parts[0] || !parts[1]) {
      throw new StoryParseError(
        fileName,
        lineNum,
        `Item extra malformado em ## ITENS: "${trimmed}". Use "- item-id | LOCAL | raridade".`,
      );
    }
    const [itemId, location, rawRarity = 'normal'] = parts;
    const rarity = normalizeRarity(rawRarity, fileName, lineNum);
    if (cityMap?.resolveItemLocation) {
      try {
        cityMap.resolveItemLocation(location);
      } catch (err) {
        throw new StoryParseError(
          fileName,
          lineNum,
          `Local inválido para item "${itemId}" ("${location}"): ${err.message}`,
        );
      }
    }
    entries.push({ itemId, location, rarity, lineNum });
  }
  return entries;
}

export function parseMissionMarkdown(rawText, fileName = 'mission.md', cityMap = null) {
  const { meta, body, bodyStartLine } = parseFrontmatter(rawText, fileName);

  if (!meta.id || !meta.title || !meta.start || !meta.target) {
    throw new StoryParseError(
      fileName,
      2,
      'Missão deve definir "id", "title", "start" e "target" no frontmatter.',
    );
  }

  if (cityMap) {
    try {
      cityMap.resolveLocationCode(meta.start);
    } catch (err) {
      throw new StoryParseError(fileName, 2, `Local de início inválido ("start: ${meta.start}"): ${err.message}`);
    }
    try {
      cityMap.resolveLocationCode(meta.target);
    } catch (err) {
      throw new StoryParseError(fileName, 2, `Local de destino inválido ("target: ${meta.target}"): ${err.message}`);
    }
    if (meta.pickup) {
      try {
        cityMap.resolveLocationCode(meta.pickup);
      } catch (err) {
        throw new StoryParseError(fileName, 2, `Local de coleta inválido ("pickup: ${meta.pickup}"): ${err.message}`);
      }
    }
  }

  const { sections, sectionStarts } = splitMarkdownSections(body, bodyStartLine, [
    'CUTSCENE_INICIO',
    'CUTSCENE_FIM',
    'ITENS',
  ]);

  return {
    id: meta.id,
    title: meta.title,
    startLocation: meta.start,
    pickupLocation: String(meta.pickup || '').trim(),
    pickupObjective: String(meta.pickup_objective || '').trim(),
    targetLocation: meta.target,
    objective: meta.objective || `Vá até ${meta.target}`,
    giveItem: String(meta.give_item || '').trim(),
    requireItem: String(meta.require_item || '').trim(),
    deliveryPrompt: String(meta.delivery_prompt || '').trim(),
    wrongItemMessage: String(meta.wrong_item_message || '').trim(),
    extraItems: parseMissionItemsBlock(sections.ITENS, sectionStarts.ITENS, fileName, cityMap),
    introCutscene: parseCutsceneBlock(sections.CUTSCENE_INICIO, sectionStarts.CUTSCENE_INICIO, fileName),
    outroCutscene: parseCutsceneBlock(sections.CUTSCENE_FIM, sectionStarts.CUTSCENE_FIM, fileName),
  };
}

export function parseEncounterMarkdown(rawText, fileName = 'encounter.md', cityMap = null) {
  const { meta, body, bodyStartLine } = parseFrontmatter(rawText, fileName);

  if (!meta.id || !meta.npc || !meta.location) {
    throw new StoryParseError(
      fileName,
      2,
      'Encontro extra deve definir "id", "npc" e "location" no frontmatter.',
    );
  }

  if (cityMap) {
    try {
      cityMap.resolveIndoorOppositePosition(meta.location);
    } catch (err) {
      throw new StoryParseError(
        fileName,
        2,
        `Local inválido para encontro ("location: ${meta.location}"): ${err.message}`,
      );
    }
  }

  const { sections, sectionStarts } = splitMarkdownSections(body, bodyStartLine, [
    'CUTSCENE',
    'CUTSCENE_INICIO',
  ]);
  const useIntroFallback = sections.CUTSCENE.length === 0 && sections.CUTSCENE_INICIO.length > 0;
  const blockLines = useIntroFallback ? sections.CUTSCENE_INICIO : sections.CUTSCENE;
  const startLine = useIntroFallback ? sectionStarts.CUTSCENE_INICIO : sectionStarts.CUTSCENE;
  const cutscene = parseCutsceneBlock(blockLines, startLine, fileName);

  if (!cutscene.steps || cutscene.steps.length === 0) {
    throw new StoryParseError(
      fileName,
      startLine,
      'Encontro extra deve conter uma seção "## CUTSCENE" com ao menos uma fala.',
    );
  }

  const rawRoofColor = String(meta.roof_color || '').trim();
  const roofColor = rawRoofColor || '#d6282e';
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(roofColor)) {
    throw new StoryParseError(
      fileName,
      2,
      `Cor de telhado inválida ("roof_color: ${rawRoofColor}"). Use formato hexadecimal como #d6282e.`,
    );
  }
  const roofLogo = meta.roof_logo ? validateAssetPath(meta.roof_logo, fileName, 2) : '';

  return {
    id: String(meta.id).trim(),
    npc: String(meta.npc).trim(),
    location: String(meta.location).trim(),
    prompt: String(meta.prompt || '').trim(),
    roofColor,
    roofLogo,
    cutscene,
  };
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function parseMapLineSegments(rawValue, code, fileName, lineNum) {
  const parts = rawValue.split('|').map((part) => part.trim());
  const name = parts[0];
  let roofColor = '';
  let roofLogo = '';

  for (let p = 1; p < parts.length; p += 1) {
    const segment = parts[p];
    if (!segment) continue;
    const eqIdx = segment.indexOf('=');
    if (eqIdx <= 0) {
      throw new StoryParseError(fileName, lineNum, `Atributo inválido em "${fileName}": "${segment}". Use chave=valor.`);
    }
    const key = segment.slice(0, eqIdx).trim().toLowerCase();
    const val = segment.slice(eqIdx + 1).trim();
    if (key === 'roof_color') {
      if (code.startsWith('RUA-') || code.startsWith('PRACA-')) {
        throw new StoryParseError(fileName, lineNum, `Local "${code}" não é edificável e não aceita roof_color.`);
      }
      if (!HEX_COLOR_RE.test(val)) {
        throw new StoryParseError(fileName, lineNum, `Cor de telhado inválida ("roof_color=${val}"). Use #rrggbb.`);
      }
      roofColor = val.toLowerCase();
    } else if (key === 'roof_logo') {
      if (code.startsWith('RUA-') || code.startsWith('PRACA-')) {
        throw new StoryParseError(fileName, lineNum, `Local "${code}" não é edificável e não aceita roof_logo.`);
      }
      roofLogo = validateAssetPath(val, fileName, lineNum);
    }
  }
  return { name, roofColor, roofLogo };
}

export function parseMapRoofsMarkdown(rawText, fileName = 'map/map.md') {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const roofs = new Map();

  for (let i = 0; i < lines.length; i += 1) {
    let trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('<!--')) continue;
    if (trimmed.startsWith('- ')) {
      trimmed = trimmed.slice(2).trim();
    }
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx <= 0) continue;
    const code = trimmed.slice(0, colonIdx).trim().toUpperCase();
    const rawValue = trimmed.slice(colonIdx + 1).trim();
    if (!code || !rawValue) continue;
    const { roofColor, roofLogo } = parseMapLineSegments(rawValue, code, fileName, i + 1);
    if (roofColor || roofLogo) {
      roofs.set(code, {
        roofColor: roofColor || '#d6282e',
        roofLogo: roofLogo || '',
      });
    }
  }
  return roofs;
}

export function parseMapMarkdown(rawText, fileName = 'map/map.md') {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const locationNames = new Map();

  for (let i = 0; i < lines.length; i += 1) {
    let trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('<!--')) continue;
    if (trimmed.startsWith('- ')) {
      trimmed = trimmed.slice(2).trim();
    }
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx <= 0) {
      throw new StoryParseError(fileName, i + 1, `Linha malformada em "${fileName}": "${trimmed}". Use "CODIGO: Nome".`);
    }
    const code = trimmed.slice(0, colonIdx).trim().toUpperCase();
    const rawValue = trimmed.slice(colonIdx + 1).trim();
    const { name } = parseMapLineSegments(rawValue, code, fileName, i + 1);
    if (!code || !name) {
      throw new StoryParseError(fileName, i + 1, `Código ou nome vazio em "${fileName}": "${trimmed}".`);
    }
    locationNames.set(code, name);
  }

  return locationNames;
}

const LOC_CODE_TOKEN_RE = /^(?:RUA|CASA|COM|PRACA)-\d+$/i;

function findItemByToken(items, token) {
  if (!items || !(items instanceof Map)) return null;
  const clean = token.trim();
  const withoutPrefix = /^item-/i.test(clean) ? clean.slice(5).trim() : '';
  const candidates = withoutPrefix ? [withoutPrefix, clean] : [clean];
  for (const cand of candidates) {
    const lower = cand.toLowerCase();
    if (items.has(cand)) return items.get(cand);
    if (items.has(lower)) return items.get(lower);
    for (const item of items.values()) {
      if (String(item.id || '').toLowerCase() === lower || String(item.name || '').toLowerCase() === lower) {
        return item;
      }
    }
  }
  return null;
}

function findCharacterByToken(characters, token) {
  if (!characters || !(characters instanceof Map)) return null;
  const lower = token.trim().toLowerCase();
  if (characters.has(lower)) return characters.get(lower);
  for (const char of characters.values()) {
    if (String(char.id || '').toLowerCase() === lower || String(char.name || '').toLowerCase() === lower) {
      return char;
    }
  }
  return null;
}

export function replaceStoryPlaceholders(text, { locationNames = null, items = null, characters = null } = {}) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  return text.replace(/\[([^\[\]\n]+)\]/g, (match, rawToken) => {
    const token = rawToken.trim();
    if (!token) return match;

    if (LOC_CODE_TOKEN_RE.test(token) && locationNames instanceof Map) {
      const resolved = locationNames.get(token.toUpperCase());
      if (resolved) return `**__${resolved}__**`;
    }

    if (/^item-/i.test(token)) {
      const item = findItemByToken(items, token);
      if (item?.name) return `**__${item.name}__**`;
    }

    const char = findCharacterByToken(characters, token);
    if (char?.name) return `**__${char.name}__**`;

    const itemFallback = findItemByToken(items, token);
    if (itemFallback?.name) return `**__${itemFallback.name}__**`;

    return match;
  });
}

export function replaceLocationCodesWithNames(text, locationNames, extras = {}) {
  return replaceStoryPlaceholders(text, {
    locationNames,
    items: extras?.items || null,
    characters: extras?.characters || null,
  });
}

const STORY_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseStoryCatalog(rawText, fileName = 'stories.json') {
  let parsed;
  try {
    parsed = JSON.parse(String(rawText || ''));
  } catch {
    throw new StoryParseError(fileName, 1, 'JSON inválido no catálogo de histórias.');
  }

  if (!parsed || !Array.isArray(parsed.stories) || parsed.stories.length === 0) {
    throw new StoryParseError(fileName, 1, 'O catálogo deve conter uma lista não vazia em "stories".');
  }

  const seenIds = new Set();
  return parsed.stories.map((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      throw new StoryParseError(fileName, idx + 1, 'Entrada de história inválida no catálogo.');
    }
    const id = String(entry.id || '').trim();
    if (!STORY_ID_RE.test(id)) {
      throw new StoryParseError(
        fileName,
        idx + 1,
        `Identificador de história inválido "${id}". Use apenas letras minúsculas, números e hífen.`,
      );
    }
    if (seenIds.has(id)) {
      throw new StoryParseError(fileName, idx + 1, `Identificador de história duplicado "${id}".`);
    }
    seenIds.add(id);

    const title = String(entry.title || '').trim();
    if (!title) {
      throw new StoryParseError(fileName, idx + 1, `História "${id}" sem título ("title").`);
    }

    const rawPath = String(entry.path || `./story/${id}`).trim();
    const safeRelPath = validateAssetPath(rawPath, fileName, idx + 1);
    const normalizedPath = `./${safeRelPath.replace(/\/+$/, '')}`;

    const rawCover = String(entry.cover || '').trim();
    const safeCover = rawCover ? `./${validateAssetPath(rawCover, fileName, idx + 1)}` : '';

    return {
      id,
      title,
      description: String(entry.description || '').trim(),
      cover: safeCover,
      path: normalizedPath,
    };
  });
}
