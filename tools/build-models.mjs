// Готовит 3D-модели для сайта из исходника в assets-src/ (CC0, female base mesh с Fab).
// head.glb — голова с шеей для /piercing, body.glb — всё тело для /tattoo с атрибутом _ZONE (номер зоны
// из ZONES у каждой вершины). Скелет и UV убираются (модель статичная, без текстур),
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

/**
 * Зоны тела для /tattoo. Порядок важен: номер зоны в _ZONE — индекс в этом списке,
 * тот же список (id) лежит в src/data/tattoo-zones.json.
 */
export const ZONES = ['head', 'neck', 'collarbone', 'chest', 'ribs', 'belly', 'upper-back', 'lower-back', 'buttocks',
  'shoulder', 'elbow', 'forearm', 'wrist', 'hand', 'thigh', 'knee', 'shin', 'calf', 'ankle', 'foot'];
const Z = Object.fromEntries(ZONES.map((z, i) => [z, i]));

/**
 * Делит тело на зоны по костям скелета: у каждой вершины берётся кость с наибольшим весом.
 * Суставы (локоть, колено, запястье, щиколотка) — вершины, где вес заметно делится между двумя костями.
 * Перед/спина и бока различаются по нормали (модель смотрит в +Z, ось X — вбок).
 */
function assignZones(doc) {
  const skin = doc.getRoot().listSkins()[0];
  const names = skin.listJoints().map((j) => j.getName().replace(/.(L|R)$/, ''));
  const mixed = (w, a, b) => (w[a] ?? 0) > 0.2 && (w[b] ?? 0) > 0.2;
  const zoneOf = (w, n) => {
    if (mixed(w, 'upperarm02', 'lowerarm01')) return Z.elbow;
    if (mixed(w, 'lowerarm02', 'wrist')) return Z.wrist;
    if (mixed(w, 'upperleg02', 'lowerleg01')) return Z.knee;
    if (mixed(w, 'lowerleg02', 'foot')) return Z.ankle;
    const top = Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
    const front = n[2] > 0.25, back = n[2] < -0.25, side = Math.abs(n[0]) > 0.75;
    if (/^neck/.test(top)) return Z.neck;
    if (top === 'clavicle') return back ? Z['upper-back'] : Z.collarbone;
    if (top === 'breast') return Z.chest;
    if (top === 'spine01') return side ? Z.ribs : back ? Z['upper-back'] : Z.chest;
    if (top === 'spine02') return side ? Z.ribs : back ? Z['upper-back'] : Z.belly;
    if (/^spine0[34]$/.test(top)) return side && top === 'spine03' ? Z.ribs : back ? Z['lower-back'] : Z.belly;
    if (/^(spine05|pelvis|root)$/.test(top)) return back ? Z.buttocks : Z.belly;
    if (/^(shoulder01|upperarm0[12])$/.test(top)) return Z.shoulder;
    if (/^lowerarm0[12]$/.test(top)) return Z.forearm;
    if (/^(wrist|hand|finger|metacarpal|thumb)/.test(top)) return Z.hand;
    if (top === 'upperleg01') return back ? Z.buttocks : Z.thigh;
    if (top === 'upperleg02') return Z.thigh;
    if (/^lowerleg0[12]$/.test(top)) return front ? Z.shin : Z.calf;
    if (/^(foot|toe)/.test(top)) return Z.foot;
    return Z.head; // лицо, глаза, челюсть и прочие кости головы
  };
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), N = prim.getAttribute('NORMAL');
      const count = J.getCount();
      const zones = new Float32Array(count);
      const j = [], w = [], n = [];
      for (let i = 0; i < count; i++) {
        J.getElement(i, j); W.getElement(i, w); N.getElement(i, n);
        const byName = {};
        for (let k = 0; k < 4; k++) byName[names[j[k]]] = (byName[names[j[k]]] ?? 0) + w[k];
        zones[i] = zoneOf(byName, n);
      }
      prim.setAttribute('_ZONE', doc.createAccessor().setType('SCALAR').setArray(zones).setBuffer(J.getBuffer()));
    }
  }
}

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

async function build(name, edit, extras) {
  const doc = await io.read(SRC);
  edit(doc); // до stripSkin: разметке зон нужны веса костей
  // Порядок зон уходит в модель: в three.js он окажется в gltf.scene.userData.zones.
  if (extras) doc.getRoot().getDefaultScene().setExtras(extras);
  stripSkin(doc);
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
await build('body.glb', (doc) => assignZones(doc), { zones: ZONES });
