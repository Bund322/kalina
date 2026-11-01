// /piercing: 3D-голова с точками проколов. Данные приходят из <script type="application/json"> в разметке,
// выбор прокола — всплывающее событие `piercing:select` (detail.ids; пустой список — снять выбор).
// Его шлют маркеры, список, карточки «Проколы на теле» и попап; слушают все на document.
import type * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { createStage, hasWebGL, type Stage, type View } from './three/stage';

type Vec3 = [number, number, number];
interface PiercingPoint { p: Vec3; n: Vec3 }
interface PiercingData { id: string; name: string; group: string; points?: PiercingPoint[]; area?: PiercingPoint[]; bar?: boolean; spot?: string }

export interface SelectDetail { ids: string[] }

const VIEWS: Record<'full' | 'face' | 'ear', View> = {
  full: { target: [0, 1.47, 0.05], dir: [0.5, 0.1, 1], dist: 0.62 },
  face: { target: [0, 1.455, 0.12], dir: [0.18, 0.04, 1], dist: 0.34 },
  ear: { target: [0.072, 1.468, 0.042], dir: [1, 0.08, 0.3], dist: 0.16 },
};
const EAR_CENTER: Vec3 = [0.075, 1.468, 0.042];
/** Ближе этого расстояния до уха вместо одного маркера «Ухо» показываются отдельные точки. */
const EAR_DETAIL_DIST = 0.3;
/** Маркер приподнят над кожей, чтобы не утонуть в поверхности. */
const LIFT = 0.0025;
const SIZE = { base: 15, active: 22, cluster: 30, end: 9 };
/** Толщина линий зон и штанги, px. */
const LINE = { base: 2.5, active: 4 };

const root = document.querySelector<HTMLElement>('[data-piercing-stage]');
if (root) init(root);

function init(root: HTMLElement) {
  const data: PiercingData[] = JSON.parse(root.querySelector('script[type="application/json"]')!.textContent!);
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;

  // Выбор работает и без 3D: список кнопок рассылает то же событие.
  let selected: string[] = [];
  const select = (ids: string[]) =>
    root.dispatchEvent(new CustomEvent<SelectDetail>('piercing:select', { detail: { ids }, bubbles: true }));
  root.querySelectorAll<HTMLButtonElement>('[data-piercing]').forEach((b) =>
    b.addEventListener('click', () => select([b.dataset.piercing!])),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
    b.addEventListener('click', () => stage?.flyTo(VIEWS[b.dataset.view as keyof typeof VIEWS])),
  );
  document.addEventListener('piercing:select', (e) => {
    const ids = (selected = (e as CustomEvent<SelectDetail>).detail.ids);
    root.querySelectorAll<HTMLButtonElement>('[data-piercing]').forEach((b) =>
      b.setAttribute('aria-pressed', String(ids.includes(b.dataset.piercing!))),
    );
  });

  if (!hasWebGL()) {
    root.classList.add('no-webgl');
    status.textContent = 'Ваш браузер не показывает 3D — выберите прокол из списка.';
    return;
  }

  let stage: Stage | null = createStage(canvas, {
    fadeFromY: 1.36,
    fadeToY: 1.4,
    minDistance: 0.3,
    maxDistance: 0.75,
  });
  stage.flyTo(VIEWS.full, true);
  // В dev-режиме сцена доступна из консоли — так снимаются координаты точек для piercings.json.
  if (import.meta.env.DEV) Object.assign(window, { __stage: stage, __views: VIEWS });
  // Подсказка «вращайте модель» нужна только до первого действия.
  stage.controls.addEventListener('start', () => root.classList.add('touched'));
  document.addEventListener('piercing:select', () => root.classList.add('touched'));

  stage
    .load('/models/head.glb')
    .then(() => {
      root.classList.add('ready');
      status.textContent = '';
      setupMarkers(stage!, data, () => selected, select);
    })
    .catch(() => {
      root.classList.add('no-webgl');
      status.textContent = 'Не удалось загрузить модель — выберите прокол из списка.';
      stage = null;
    });

  // Перелёт к выбранному проколу: ухо — крупным планом, остальное — лицо.
  document.addEventListener('piercing:select', (e) => {
    const p = data.find((d) => d.id === (e as CustomEvent<SelectDetail>).detail.ids[0]);
    if (!stage || !p?.points) return;
    stage.flyTo(p.group === 'ear' ? VIEWS.ear : VIEWS.face);
  });
}

function markerTexture(T: typeof THREE, fill: string, ring: string, label?: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.arc(64, 64, 56, 0, Math.PI * 2);
  g.fillStyle = ring;
  g.fill();
  g.beginPath();
  g.arc(64, 64, label ? 50 : 40, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (label) {
    g.fillStyle = ring;
    g.font = '600 30px "Golos Text", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 64, 66);
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

function setupMarkers(stage: Stage, data: PiercingData[], getSelected: () => string[], select: (ids: string[]) => void) {
  const { THREE: T, scene, camera, renderer, onFrame, flyTo } = stage;
  const tex = {
    base: markerTexture(T, '#7F372C', '#F1E9DC'),
    active: markerTexture(T, '#53512A', '#F1E9DC'),
    cluster: markerTexture(T, '#7F372C', '#F1E9DC', 'Ухо'),
  };

  // Цель для клика: маркер-точка или линия (зона прокола, штанга индастриала). У обеих — проколы ids.
  interface Marker { kind: 'marker'; sprite: THREE.Sprite; ids: string[]; ear: boolean }
  interface Track { kind: 'track'; line: Line2; mat: LineMaterial; samples: THREE.Vector3[]; ends: THREE.Sprite[]; ids: string[] }
  type Target = Marker | Track | 'cluster';
  const markers: Marker[] = [];
  const tracks: Track[] = [];
  const bySpot = new Map<string, Marker>();
  const lift = (pt: PiercingPoint) => new T.Vector3(...pt.p).addScaledVector(new T.Vector3(...pt.n).normalize(), LIFT);

  for (const d of data) {
    d.points?.forEach((pt, i) => {
      const key = d.spot ?? `${d.id}:${i}`;
      const existing = bySpot.get(key);
      if (existing) { existing.ids.push(d.id); return; }
      const sprite = new T.Sprite(new T.SpriteMaterial({ map: tex.base, sizeAttenuation: false, depthWrite: false }));
      sprite.position.copy(lift(pt));
      sprite.renderOrder = 2;
      scene.add(sprite);
      const m: Marker = { kind: 'marker', sprite, ids: [d.id], ear: d.group === 'ear' };
      markers.push(m);
      bySpot.set(key, m);
    });
  }

  // Зона прокола (area) — плавная линия по коже с точками на концах; штанга индастриала — прямая.
  function addTrack(id: string, pts: THREE.Vector3[], withEnds: boolean) {
    const samples = pts.length > 2 ? new T.CatmullRomCurve3(pts).getPoints(40) : pts;
    const geo = new LineGeometry();
    geo.setPositions(samples.flatMap((p) => [p.x, p.y, p.z]));
    const mat = new LineMaterial({ color: '#7F372C', linewidth: LINE.base, transparent: true, opacity: 0.75, depthWrite: false });
    const line = new Line2(geo, mat);
    line.renderOrder = 1;
    scene.add(line);
    const ends = withEnds
      ? [samples[0], samples[samples.length - 1]].map((p) => {
          const dot = new T.Sprite(new T.SpriteMaterial({ map: tex.base, sizeAttenuation: false, depthWrite: false }));
          dot.position.copy(p);
          dot.renderOrder = 2;
          scene.add(dot);
          return dot;
        })
      : [];
    tracks.push({ kind: 'track', line, mat, samples, ends, ids: [id] });
  }
  for (const d of data) {
    if (d.area && d.area.length >= 2) addTrack(d.id, d.area.map(lift), true);
    if (d.bar && d.points?.length === 2) addTrack(d.id, d.points.map(lift), false);
  }

  const cluster = new T.Sprite(new T.SpriteMaterial({ map: tex.cluster, sizeAttenuation: false, depthWrite: false }));
  cluster.position.set(EAR_CENTER[0] + 0.012, EAR_CENTER[1], EAR_CENTER[2]);
  cluster.renderOrder = 3;
  scene.add(cluster);
  const earCenter = new T.Vector3(...EAR_CENTER);

  let hovered: Target | null = null;
  const canvas = renderer.domElement;

  // Размер маркера задаётся в пикселях экрана: при sizeAttenuation=false масштаб считается в долях высоты кадра.
  const px = (n: number) => (n * 2) / (canvas.clientHeight * camera.projectionMatrix.elements[5]);
  // Зона подсвечивается и при наведении на её точку-маркер, и наоборот.
  const isActive = (ids: string[]) => {
    const sel = getSelected();
    const hov = hovered && hovered !== 'cluster' ? hovered.ids : [];
    return ids.some((id) => sel.includes(id) || hov.includes(id));
  };

  onFrame(() => {
    const detail = camera.position.distanceTo(earCenter) < EAR_DETAIL_DIST;
    cluster.visible = !detail;
    cluster.scale.setScalar(px(hovered === 'cluster' ? SIZE.cluster * 1.15 : SIZE.cluster));
    for (const m of markers) {
      m.sprite.visible = !m.ear || detail;
      const active = isActive(m.ids);
      m.sprite.material.map = active ? tex.active : tex.base;
      m.sprite.scale.setScalar(px(active ? SIZE.active : SIZE.base));
    }
    for (const t of tracks) {
      const active = isActive(t.ids);
      t.line.visible = detail;
      t.mat.resolution.set(canvas.clientWidth, canvas.clientHeight);
      t.mat.linewidth = active ? LINE.active : LINE.base;
      t.mat.opacity = active ? 1 : 0.75;
      t.mat.color.set(active ? '#53512A' : '#7F372C');
      t.ends.forEach((e) => {
        e.visible = detail;
        e.material.map = active ? tex.active : tex.base;
        e.scale.setScalar(px(SIZE.end));
      });
    }
  });

  // Попадание считаем в пикселях экрана: ближайшая видимая цель в радиусе (для пальца радиус больше).
  const v = new T.Vector3();
  const toCam = new T.Vector3();
  function occluded(pos: THREE.Vector3) {
    toCam.copy(pos).sub(camera.position);
    const dist = toCam.length();
    const ray = stage.raycaster;
    ray.set(camera.position, toCam.normalize());
    const h = ray.intersectObjects(stage.meshes, false)[0];
    return !!h && h.distance < dist - LIFT * 2;
  }
  function hit(e: PointerEvent): Target | null {
    const r = canvas.getBoundingClientRect();
    const radius = e.pointerType === 'mouse' ? 13 : 24;
    const screen = (p: THREE.Vector3) => {
      v.copy(p).project(camera);
      return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
    };
    const candidates: { m: Target; d: number; pos: THREE.Vector3 }[] = [];
    const consider = (m: Target, obj: THREE.Sprite, size: number) => {
      if (!obj.visible) return;
      const [sx, sy] = screen(obj.position);
      const d = Math.hypot(sx - e.clientX, sy - e.clientY);
      if (d <= Math.max(radius, size / 2)) candidates.push({ m, d, pos: obj.position });
    };
    markers.forEach((m) => consider(m, m.sprite, SIZE.base));
    consider('cluster', cluster, SIZE.cluster);
    // Линия проигрывает точке на том же расстоянии: точка — более точная цель.
    for (const t of tracks) {
      if (!t.line.visible) continue;
      let best = Infinity, at = t.samples[0];
      for (const p of t.samples) {
        const [sx, sy] = screen(p);
        const d = Math.hypot(sx - e.clientX, sy - e.clientY);
        if (d < best) { best = d; at = p; }
      }
      if (best <= radius * 0.7) candidates.push({ m: t, d: best + 4, pos: at });
    }
    candidates.sort((a, b) => a.d - b.d);
    return candidates.find((c) => !occluded(c.pos))?.m ?? null;
  }

  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    hovered = hit(e);
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerup', (e) => {
    // Клик, а не поворот модели.
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const h = hit(e);
    if (h === 'cluster') flyTo(VIEWS.ear);
    else if (h) select(h.ids);
  });
}
