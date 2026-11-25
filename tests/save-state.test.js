import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_STORAGE_KEY,
  getSaveStorageKey,
  createSaveSnapshot,
  saveGameState,
  loadGameState,
  clearGameState,
  formatContinueLabel,
  getNewMissionIndex,
} from '../src/core/save-state.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('salva, carrega e limpa estado do jogo e inventário com escopo por história', () => {
  const storage = createMemoryStorage();
  const snapshot = createSaveSnapshot({
    storyKey: 'Missão Vibe Coding',
    currentMissionIndex: 2,
    freeRoamMode: false,
    itemPickedUp: true,
    inventorySlots: [
      { id: 'caixa-secreta', name: 'Caixa', description: 'Desc', imageUrl: './story/items/caixa.png', category: 'missao', rarity: '' },
      { id: 'mouse-ouro', name: 'Mouse', description: 'Raro', imageUrl: './story/items/mouse.png', category: 'extra', rarity: 'raro' },
      null,
    ],
    collectedExtraIds: ['mouse-ouro'],
    completedNpcPoints: [{ x: 100, y: 200 }],
    player: { x: 450, y: 820, angle: 1.5, health: 87 },
  });

  assert.equal(saveGameState(snapshot, storage), true);
  assert.ok(storage.getItem(getSaveStorageKey('Missão Vibe Coding')));

  const loaded = loadGameState('Missão Vibe Coding', storage);
  assert.ok(loaded);
  assert.equal(loaded.currentMissionIndex, 2);
  assert.equal(loaded.itemPickedUp, true);
  assert.equal(loaded.inventorySlots[1].rarity, 'raro');
  assert.deepEqual(loaded.collectedExtraIds, ['mouse-ouro']);
  assert.equal(loaded.player.x, 450);
  assert.equal(loaded.player.health, 87);

  assert.equal(loadGameState('Outra História', storage), null);
  assert.equal(clearGameState('Missão Vibe Coding', storage), true);
  assert.equal(loadGameState('Missão Vibe Coding', storage), null);
});

test('formatContinueLabel exibe missão atual ou modo livre', () => {
  assert.equal(formatContinueLabel(null), 'Entrar na Cidade');
  assert.equal(formatContinueLabel({ currentMissionIndex: 1, freeRoamMode: false }), 'Continuar (Missão 2)');
  assert.equal(formatContinueLabel({ currentMissionIndex: 4, freeRoamMode: true }), 'Continuar (Modo Livre)');
});

test('oferece o novo capítulo a quem concluiu a versão anterior, preservando o save', () => {
  const storage = createMemoryStorage();
  const completedChapter = createSaveSnapshot({
    storyKey: 'codigo-de-resgate',
    currentMissionIndex: 0,
    freeRoamMode: true,
    inventorySlots: [{ id: 'caneca-ruan', name: 'Caneca do Ruan', category: 'extra' }],
    collectedExtraIds: ['caneca-ruan'],
    player: { x: 228, y: 317, health: 87 },
  });
  saveGameState(completedChapter, storage);
  const loaded = loadGameState('codigo-de-resgate', storage);
  const before = JSON.stringify(loaded);
  assert.equal(getNewMissionIndex(loaded, 2), 1);
  assert.equal(formatContinueLabel(loaded, 2), 'Continuar (Missão 2)');
  assert.equal(JSON.stringify(loaded), before);
  assert.equal(loaded.inventorySlots[0].id, 'caneca-ruan');
  assert.equal(loaded.player.health, 87);

  assert.equal(getNewMissionIndex(loaded, 1), null);
  assert.equal(formatContinueLabel(loaded, 1), 'Continuar (Modo Livre)');
  assert.equal(getNewMissionIndex({ ...loaded, freeRoamMode: false }, 2), null);
  assert.equal(formatContinueLabel({ ...loaded, freeRoamMode: false }, 2), 'Continuar (Missão 1)');
  assert.equal(getNewMissionIndex({ ...loaded, currentMissionIndex: 1 }, 2), null);
  assert.equal(getNewMissionIndex(null, 2), null);
  assert.equal(getNewMissionIndex({ ...loaded, currentMissionIndex: -1 }, 2), null);
});

test('persiste missões desbloqueadas e mantém apenas a primeira missão no novo jogo', () => {
  const storage = createMemoryStorage();
  const initial = createSaveSnapshot({
    storyKey: 'Missão Vibe Coding',
    currentMissionIndex: 0,
    player: { x: 10, y: 20, angle: 0, health: 100 },
  });
  saveGameState(initial, storage);
  const loadedInitial = loadGameState('Missão Vibe Coding', storage);
  assert.deepEqual(loadedInitial.unlockedMissionIndices, [0]);

  const progressed = createSaveSnapshot({
    storyKey: 'Missão Vibe Coding',
    currentMissionIndex: 1,
    unlockedMissionIndices: [0, 1],
    player: { x: 30, y: 40, angle: 0, health: 95 },
  });
  saveGameState(progressed, storage);
  const loadedProgressed = loadGameState('Missão Vibe Coding', storage);
  assert.deepEqual(loadedProgressed.unlockedMissionIndices, [0, 1]);

  // Save antigo sem campo unlockedMissionIndices mantém missões até currentMissionIndex
  clearGameState('Missão Vibe Coding', storage);
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
    version: 1,
    storyKey: 'Missão Vibe Coding',
    currentMissionIndex: 2,
    freeRoamMode: false,
    player: { x: 50, y: 60, angle: 0, health: 100 },
  }));
  const loadedLegacy = loadGameState('Missão Vibe Coding', storage);
  assert.deepEqual(loadedLegacy.unlockedMissionIndices, [0, 1, 2]);
});

test('saveGameState mantém progresso isolado por história sem sobrescrever outra campanha', () => {
  const storage = createMemoryStorage();
  const snapA = createSaveSnapshot({
    storyKey: 'vibe-coding',
    currentMissionIndex: 3,
    player: { x: 100, y: 200, angle: 0, health: 90 },
  });
  const snapB = createSaveSnapshot({
    storyKey: 'outra-historia',
    currentMissionIndex: 1,
    player: { x: 300, y: 400, angle: 1, health: 75 },
  });

  assert.equal(saveGameState(snapA, storage), true);
  assert.equal(saveGameState(snapB, storage), true);

  const loadedA = loadGameState('vibe-coding', storage);
  const loadedB = loadGameState('outra-historia', storage);
  assert.equal(loadedA.currentMissionIndex, 3);
  assert.equal(loadedA.player.x, 100);
  assert.equal(loadedB.currentMissionIndex, 1);
  assert.equal(loadedB.player.x, 300);

  clearGameState('vibe-coding', storage);
  assert.equal(loadGameState('vibe-coding', storage), null);
  assert.equal(loadGameState('outra-historia', storage).currentMissionIndex, 1);
});
