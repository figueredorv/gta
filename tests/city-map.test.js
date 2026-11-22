import test from 'node:test';
import assert from 'node:assert/strict';
import { CityMap } from '../src/world/city-map.js';
import { TrafficManager } from '../src/world/traffic-manager.js';
import { Minimap } from '../src/ui/minimap.js';

test('gera cidade-base 30x30 com códigos únicos de ruas, casas, comércios e praças', () => {
  const map = new CityMap();
  assert.equal(map.blocks.length, 30);
  assert.equal(map.blocks[0].length, 30);

  const rua1 = map.resolveLocationCode('RUA-001');
  const casa1 = map.resolveLocationCode('CASA-001');
  const com1 = map.resolveLocationCode('COM-001');
  const praca1 = map.resolveLocationCode('PRACA-001');

  assert.equal(rua1.type, 'road');
  assert.equal(casa1.type, 'house');
  assert.equal(com1.type, 'commerce');
  assert.equal(praca1.type, 'plaza');

  assert.ok(casa1.interior.walls.length > 0);
  assert.ok(casa1.roofRect.w > 0);
  assert.ok(casa1.doormat.w > 0);

  const uniqueWidths = new Set(map.colWidths);
  const uniqueHeights = new Set(map.rowHeights);
  assert.ok(uniqueWidths.size > 1);
  assert.ok(uniqueHeights.size > 1);
});

test('sinaliza erro descritivo ao resolver código de local inexistente', () => {
  const map = new CityMap();
  assert.throws(() => map.resolveLocationCode('NAO-EXISTE-99'), /Código de local inexistente/);
  assert.throws(() => map.resolveLocationCode(''), /Código de local inválido/);
});

test('identifica entrada em interior térreo pelo getLocationAt', () => {
  const map = new CityMap();
  const casa = map.resolveLocationCode('CASA-001');
  const centerX = casa.bounds.x + casa.bounds.w * 0.5;
  const centerY = casa.bounds.y + casa.bounds.h * 0.5;

  const detected = map.getLocationAt(centerX, centerY);
  assert.equal(detected?.code, 'CASA-001');
});

test('gera veículos variados de cada tipo (carro, moto, van)', () => {
  const map = new CityMap();
  const kinds = new Set(map.vehicleSpawns.map((v) => v.kind));
  assert.ok(kinds.has('car'));
  assert.ok(kinds.has('moto'));
  assert.ok(kinds.has('van'));
});

test('gera hospitais espalhados pela cidade com telhado branco e interior acessível', () => {
  const map = new CityMap();
  const hospitals = [];
  for (const row of map.blocks) {
    for (const block of row) {
      for (const b of block.buildings) {
        if (b.type === 'hospital') hospitals.push(b);
      }
    }
  }

  assert.equal(hospitals.length, 40);
  const hosp1 = map.resolveLocationCode('HOSP-001');
  const hosp40 = map.resolveLocationCode('HOSP-040');
  assert.equal(hosp40.type, 'hospital');
  assert.equal(hosp1.type, 'hospital');
  assert.equal(hosp1.roofColor, '#ffffff');
  assert.ok(hosp1.interior.walls.length > 0);

  const detected = map.getLocationAt(
    hosp1.bounds.x + hosp1.bounds.w * 0.5,
    hosp1.bounds.y + hosp1.bounds.h * 0.5
  );
  assert.equal(detected?.code, 'HOSP-001');
  assert.equal(detected?.type, 'hospital');

  // Garante que locais usados pelas missões continuam válidos
  for (const code of ['CASA-001', 'COM-001', 'COM-024', 'COM-320', 'CASA-353', 'COM-554', 'CASA-656']) {
    assert.ok(map.resolveLocationCode(code));
  }
});

test('resolveItemLocation posiciona itens em praças, interiores e esquinas entre duas ruas', () => {
  const map = new CityMap();
  const plazaPt = map.resolveItemLocation('PRACA-003');
  assert.equal(plazaPt.kind, 'plaza');
  assert.ok(Number.isFinite(plazaPt.x) && Number.isFinite(plazaPt.y));

  const interiorPt = map.resolveItemLocation('HOSP-005');
  assert.equal(interiorPt.kind, 'interior');
  assert.equal(interiorPt.code, 'HOSP-005');

  const cornerPt = map.resolveItemLocation('RUA-004 x RUA-036 NE');
  assert.equal(cornerPt.kind, 'corner');
  const cornerLoc = map.getLocationAt(cornerPt.x, cornerPt.y);
  assert.equal(cornerLoc?.type, 'road');
  assert.ok(['RUA-004', 'RUA-036'].includes(cornerLoc?.code));
});

test('getLocationAt identifica a rua correspondente quando o jogador está na calçada', () => {
  const map = new CityMap();
  const block = map.blocks[1][1];
  const rx = map.blockXOffsets[1];
  const ry = map.blockYOffsets[1];
  const rw = map.colWidths[1];
  const rh = map.rowHeights[1];
  const northSidewalk = map.getLocationAt(rx + rw * 0.5, ry + 4);
  assert.equal(northSidewalk?.type, 'road');
  assert.equal(northSidewalk?.code, map.horizontalRoads[1].code);

  const westSidewalk = map.getLocationAt(rx + 4, ry + rh * 0.5);
  assert.equal(westSidewalk?.type, 'road');
  assert.equal(westSidewalk?.code, map.verticalRoads[1].code);
});

test('resolveItemLocation posiciona item interno perto da parede oposta à porta da construção', () => {
  const map = new CityMap();
  const byDoorSide = new Map();
  for (const row of map.blocks) {
    for (const block of row) {
      for (const b of block.buildings) {
        if (!byDoorSide.has(b.doorSide)) {
          byDoorSide.set(b.doorSide, b);
        }
      }
    }
  }

  for (const side of ['north', 'south', 'east', 'west']) {
    const b = byDoorSide.get(side);
    assert.ok(b, `esperado prédio com doorSide=${side}`);
    const pt = map.resolveItemLocation(b.code);
    assert.equal(pt.kind, 'interior');
    const { x, y, w, h } = b.bounds;
    if (side === 'north') assert.ok(pt.y > y + h * 0.5);
    if (side === 'south') assert.ok(pt.y < y + h * 0.55);
    if (side === 'west') assert.ok(pt.x > x + w * 0.5);
    if (side === 'east') assert.ok(pt.x < x + w * 0.5);
  }
});

test('divide a cidade em chunks ativos com cerca de 2 veículos variados por quarteirão dirigidos por NPCs', () => {
  const map = new CityMap();
  assert.equal(map.chunkCols * map.chunkRows, 100);
  assert.equal(map.vehicleSpawns.length, map.gridBlocks * map.gridBlocks * 2);
  assert.ok(map.vehicleSpawns.every((v) => v.driver === 'npc' && v.isParked === false));

  const casa1 = map.resolveLocationCode('CASA-001');
  const localChunks = map.getActiveChunks(
    casa1.spawnPoint.x - 10,
    casa1.spawnPoint.y - 10,
    casa1.spawnPoint.x + 10,
    casa1.spawnPoint.y + 10,
    1,
  );
  assert.ok(localChunks.length >= 4 && localChunks.length <= 9);
  for (const chunk of localChunks) {
    assert.equal(chunk.vehicleSpawns.length, chunk.blocks.length * 2);
    assert.ok(chunk.trashBinSpawns.length > 0);
    const kinds = new Set(chunk.vehicleSpawns.map((v) => v.kind));
    assert.ok(kinds.size >= 2);
  }

  const traffic = new TrafficManager(map, { chunkManaged: true });
  assert.equal(traffic.pedestrians.length, 0);
  const nextKeys = new Set(localChunks.map((c) => c.key));
  traffic.syncPedestrianChunks(localChunks, nextKeys, { x: casa1.spawnPoint.x, y: casa1.spawnPoint.y });
  assert.ok(traffic.pedestrians.length > 0);

  // Ao mover para um chunk distante, os pedestres antigos fora da vizinhança são removidos
  const farCorner = map.resolveLocationCode('CASA-656');
  const farChunks = map.getActiveChunks(
    farCorner.spawnPoint.x - 10,
    farCorner.spawnPoint.y - 10,
    farCorner.spawnPoint.x + 10,
    farCorner.spawnPoint.y + 10,
    1,
  );
  const farKeys = new Set(farChunks.map((c) => c.key));
  traffic.syncPedestrianChunks(farChunks, farKeys, { x: farCorner.spawnPoint.x, y: farCorner.spawnPoint.y }, nextKeys);
  assert.ok(traffic.pedestrians.every((p) => farKeys.has(p.chunkKey)));
});

test('computeInitialExpandedView enquadra a maior dimensão mantendo jogador e destino visíveis', () => {
  const map = new CityMap();
  const minimap = new Minimap({ getContext: () => null });
  const canvas = { width: 300, height: 300 };

  // Jogador e destino próximos em tela retrato (iPhone)
  const nearPlayer = { x: map.worldWidth * 0.35, y: map.worldHeight * 0.2 };
  const nearObjective = { x: map.worldWidth * 0.55, y: map.worldHeight * 0.5 };
  const portraitView = minimap.computeInitialExpandedView(canvas, map, nearPlayer, nearObjective, 390, 844);
  assert.ok(portraitView.zoom > 1.3, `zoom deve preencher a maior dimensão (zoom=${portraitView.zoom})`);

  const baseScale = minimap.getExpandedBaseScale(canvas, map);
  const scale = baseScale * portraitView.zoom;
  const halfW = (canvas.width * 0.5) / scale;
  const halfH = (canvas.height * 0.5) / scale;
  assert.ok(Math.abs(nearPlayer.x - portraitView.centerX) <= halfW);
  assert.ok(Math.abs(nearPlayer.y - portraitView.centerY) <= halfH);
  assert.ok(Math.abs(nearObjective.x - portraitView.centerX) <= halfW);
  assert.ok(Math.abs(nearObjective.y - portraitView.centerY) <= halfH);

  // Jogador e destino em extremos opostos reduzem o zoom o suficiente para manter ambos visíveis
  const farPlayer = { x: map.worldWidth * 0.08, y: map.worldHeight * 0.1 };
  const farObjective = { x: map.worldWidth * 0.92, y: map.worldHeight * 0.9 };
  const farView = minimap.computeInitialExpandedView(canvas, map, farPlayer, farObjective, 390, 844);
  const farScale = baseScale * farView.zoom;
  const farHalfW = (canvas.width * 0.5) / farScale;
  assert.ok(Math.abs(farPlayer.x - farView.centerX) <= farHalfW);
  assert.ok(Math.abs(farObjective.x - farView.centerX) <= farHalfW);
});

test('getSurfaceAt diferencia asfalto, calçada e grama', () => {
  const map = new CityMap();
  const road = map.resolveLocationCode('RUA-001');
  assert.equal(map.getSurfaceAt(road.bounds.x + road.bounds.w * 0.5, road.bounds.y + road.bounds.h * 0.5), 'asphalt');

  const bx = map.blockXOffsets[0];
  const by = map.blockYOffsets[0];
  assert.equal(map.getSurfaceAt(bx + 6, by + 6), 'sidewalk');

  const plazaBlock = map.blocks.flat().find((b) => b.isPlaza && b.plaza);
  assert.ok(plazaBlock);
  const pb = plazaBlock.plaza.bounds;
  assert.equal(map.getSurfaceAt(pb.x + pb.w * 0.5, pb.y + pb.h * 0.5), 'grass');
});

test('resolveIndoorOppositePosition posiciona NPC na parede oposta à porta da CASA-063', () => {
  const map = new CityMap();
  const pos = map.resolveIndoorOppositePosition('CASA-063');
  const b = pos.building.bounds;
  assert.equal(pos.building.code, 'CASA-063');
  assert.equal(pos.building.doorSide, 'south');
  assert.ok(pos.y < b.y + b.h * 0.5, 'NPC deve ficar na metade norte (oposta à porta sul)');
  assert.ok(pos.x >= b.x && pos.x <= b.x + b.w);
  assert.equal(pos.angle, Math.PI * 0.5);
  assert.throws(() => map.resolveIndoorOppositePosition('RUA-004'));
});

test('resolveItemLocation posiciona item em rua isolada exatamente no centro horizontal e vertical da via', () => {
  const map = new CityMap();
  const hRoad = map.resolveLocationCode('RUA-001');
  const hPt = map.resolveItemLocation('RUA-001');
  assert.equal(hPt.kind, 'road');
  assert.equal(hPt.x, hRoad.bounds.x + hRoad.bounds.w * 0.5);
  assert.equal(hPt.y, hRoad.bounds.y + hRoad.bounds.h * 0.5);

  const vRoad = map.resolveLocationCode('RUA-035');
  const vPt = map.resolveItemLocation('RUA-035');
  assert.equal(vPt.kind, 'road');
  assert.equal(vPt.x, vRoad.bounds.x + vRoad.bounds.w * 0.5);
  assert.equal(vPt.y, vRoad.bounds.y + vRoad.bounds.h * 0.5);
});

test('getExpandedZoomMetrics escala ícones de jogador, destino e espessura da rota proporcionalmente ao zoom', () => {
  const minimap = new Minimap({ getContext: () => null });
  const z1 = minimap.getExpandedZoomMetrics(1);
  const z3 = minimap.getExpandedZoomMetrics(3);
  const z6 = minimap.getExpandedZoomMetrics(6);

  assert.equal(z1.routeLineWidth, 3);
  assert.equal(z1.objectiveRadius, 6);
  assert.equal(z1.playerScale, 1.25);

  assert.ok(z3.routeLineWidth > z1.routeLineWidth);
  assert.ok(z3.objectiveRadius > z1.objectiveRadius);
  assert.ok(z3.objectiveRingRadius > z1.objectiveRingRadius);
  assert.ok(z3.playerScale > z1.playerScale);

  assert.ok(z6.routeLineWidth > z3.routeLineWidth);
  assert.ok(z6.objectiveRadius > z3.objectiveRadius);
  assert.ok(z6.playerScale > z3.playerScale);
});
