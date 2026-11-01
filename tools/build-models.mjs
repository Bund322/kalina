// Готовит 3D-модели для сайта из исходника в assets-src/ (CC0, female base mesh с Fab).
// head.glb — голова с шеей для /piercing. Скелет и UV убираются (модель статичная, без текстур),
// геометрия квантуется и сжимается meshopt — в браузере её распаковывает MeshoptDecoder.
// Запуск: npm run models
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { prune, dedup, weld, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'assets-src/fab-body-kit/female-base-mesh-base_female.glb');
const OUT = join(root, 'public/models');
/** Всё, что ниже этой высоты (в метрах модели), в голову не попадает: срез проходит по шее, где рёбра сетки почти горизонтальны. */
const HEAD_CUT_Y = 1.355;

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

/** Убирает скелет: модель показывается в исходной позе. */
function stripSkin(doc) {
  const root = doc.getRoot();
  for (const node of root.listNodes()) node.setSkin(null);
  for (const skin of root.listSkins()) skin.dispose();
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const sem of ['JOINTS_0', 'WEIGHTS_0', 'TEXCOORD_0']) {
        const a = prim.getAttribute(sem);
        if (a) { prim.setAttribute(sem, null); a.dispose(); }
      }
    }
  }
  // Кости — пустые узлы без меша; после удаления скина они не нужны.
  for (const node of root.listNodes()) {
    if (!node.getMesh() && !node.listChildren().some((c) => c.getMesh())) node.dispose();
  }
}

/** Оставляет только треугольники, все вершины которых выше minY. */
function cropAbove(doc, minY) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const idx = prim.getIndices();
      const keep = [];
      const v = [0, 0, 0];
      for (let i = 0; i < idx.getCount(); i += 3) {
        const tri = [idx.getScalar(i), idx.getScalar(i + 1), idx.getScalar(i + 2)];
        if (tri.every((t) => pos.getElement(t, v)[1] > minY)) keep.push(...tri);
      }
      if (keep.length === 0) { prim.dispose(); continue; }
      idx.setArray(new Uint32Array(keep));
    }
    if (mesh.listPrimitives().length === 0) mesh.dispose();
  }
}

async function build(name, edit) {
  const doc = await io.read(SRC);
  stripSkin(doc);
  edit(doc);
  for (const m of doc.getRoot().listMaterials()) m.setName('clay');
  await doc.transform(prune(), dedup(), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, name);
  await io.write(file, doc);
  const prims = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
  const verts = prims.reduce((s, p) => s + p.getAttribute('POSITION').getCount(), 0);
  console.log(`${name}: примитивов ${prims.length}, вершин ${verts}`);
}

await build('head.glb', (doc) => cropAbove(doc, HEAD_CUT_Y));
