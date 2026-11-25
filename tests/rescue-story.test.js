import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CityMap } from '../src/world/city-map.js';
import { loadStoryPackage } from '../src/story/story-loader.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = './story/codigo-de-resgate';

test('carrega os dois capítulos de resgate com entregas, cenários e nomes para todas as vias', async (t) => {
  // Exercita o carregador real, incluindo resolução de imagens e referências.
  // Somente o transporte HTTP é substituído pelo acesso ao pacote no disco.
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, options = {}) => {
    const requested = path.resolve(root, String(url).split('?')[0]);
    if (!requested.startsWith(root + path.sep)) return new Response(null, { status: 403 });
    if (!fs.existsSync(requested) || !fs.statSync(requested).isFile()) {
      return new Response(null, { status: 404 });
    }
    return new Response(options.method === 'HEAD' ? null : fs.readFileSync(requested));
  };

  const city = new CityMap();
  const story = await loadStoryPackage(base, city);
  assert.equal(story.protagonist, 'ruan');
  assert.equal(story.completionTitle, 'CAPÍTULO 2 CONCLUÍDO');
  assert.match(story.completionMessage, /Fátima ainda aguarda resgate/);
  assert.equal(story.characters.get('ruan').name, 'Ruan Figueiredo');
  assert.equal(story.characters.get('fatima').name, 'Fátima Micaella');
  assert.equal(story.characters.get('camilla').name, 'Camilla');
  assert.equal(story.characters.get('davi').name, 'Davi');
  for (const characterId of ['ruan', 'fatima']) {
    const sprites = story.characters.get(characterId).sprites;
    assert.equal(sprites.cutscene, `${base}/assets/${characterId}-corpo-inteiro.png`);
    assert.equal(sprites.top, characterId === 'ruan'
      ? `${base}/assets/ruan-jogavel-top.svg`
      : `${base}/assets/fatima-mapa.png`);
    assert.notEqual(sprites.cutscene, sprites.top);
  }
  assert.equal(story.characters.get('ruan').sprites.front, `${base}/assets/ruan-jogavel-front.svg`);
  assert.match(story.characters.get('ruan').profile, /Programador/);
  for (const character of story.characters.values()) {
    for (const [view, url] of Object.entries(character.sprites)) {
      assert.ok(url, `Imagem ausente: ${character.id}/${view}`);
      assert.ok(fs.existsSync(path.resolve(root, url)), url);
    }
  }
  assert.ok(story.splashUrl.endsWith('/assets/capa.svg?v=2'));
  const streets = [...city.locationsByCode.keys()].filter(code => code.startsWith('RUA-'));
  assert.equal(streets.length, 62);
  assert.equal(new Set(streets.map(code => story.locationNames.get(code))).size, 62);
  for (const code of city.locationsByCode.keys()) {
    assert.ok(story.locationNames.get(code), `Local sem nome: ${code}`);
  }
  assert.equal(story.locationNames.get('RUA-001'), 'Rua São Cristóvão');
  assert.equal(story.locationNames.get('RUA-034'), 'Rua Nossa Senhora de Fátima');

  assert.equal(story.missions.length, 2);
  const mission = story.missions[0];
  assert.equal(mission.pickupLocation, 'PRACA-001');
  assert.equal(mission.targetLocation, 'COM-001');
  assert.equal(mission.giveItem, 'pendrive-feira');
  assert.equal(mission.requireItem, mission.giveItem);
  assert.ok(mission.outroCutscene.steps.some(step => step.type === 'deliver' && step.itemId === mission.requireItem));
  assert.ok(mission.outroCutscene.steps.some(step => /Fátima ainda precisa ser resgatada/.test(step.text)));
  for (const chapter of story.missions) {
    assert.ok(story.items.get(chapter.giveItem)?.imageUrl, 'Imagem do item de missão ausente');
    assert.equal(chapter.requireItem, chapter.giveItem);
    assert.ok(chapter.outroCutscene.steps.some(step => step.type === 'deliver' && step.itemId === chapter.requireItem));
    for (const cutscene of [chapter.introCutscene, chapter.outroCutscene]) {
      assert.ok(cutscene.backgroundImage, 'Cenário não resolvido');
      for (const step of cutscene.steps) {
        assert.doesNotMatch(step.text || '', /\[(?:ITEM-|CASA-|COM-|PRACA-|RUA-)/, 'Referência de texto não resolvida');
      }
    }
  }
  const investigation = story.missions[1];
  assert.equal(investigation.id, '02-um-cafe-e-uma-pista');
  assert.equal(investigation.startLocation, mission.targetLocation);
  assert.equal(investigation.pickupLocation, 'COM-003');
  assert.equal(investigation.targetLocation, 'COM-002');
  assert.equal(investigation.requireItem, 'modulo-diagnostico');
  assert.notEqual(investigation.requireItem, mission.requireItem);
  assert.equal(investigation.outroCutscene.rightChar, 'davi');
  assert.ok(investigation.outroCutscene.steps.some(step => /antiga sala de informática/.test(step.text)));
  assert.ok(investigation.outroCutscene.steps.some(step => /Fátima ainda precisa ser resgatada/.test(step.text)));
  assert.match(mission.objective, /Camilla/);
  assert.equal(mission.outroCutscene.rightChar, 'camilla');
  assert.equal(story.extraItems[0].id, 'caneca-ruan');
  assert.notEqual(story.extraItems[0].id, mission.requireItem);
  assert.equal(story.encounters[0].npc, 'caio');
});
