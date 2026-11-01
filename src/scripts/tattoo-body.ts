// /tattoo: 3D-манекен с зонами для татуировки. У каждой вершины body.glb есть атрибут _zone — номер зоны,
// порядок зон лежит в самой модели (gltf.scene.userData.zones). Зона подсвечивается шейдером целиком.
// Выбор зоны — событие `tattoo:select` (detail.ids) на document, как у проколов.
import * as THREE from 'three';
import { createStage, hasWebGL, reducedMotion, type View } from './three/stage';
import type { SelectDetail } from './popup';

interface ZoneData { id: string; name: string; pain: number }

const VIEWS: Record<'front' | 'back', View> = {
  front: { target: [0, 0.8, 0.02], dir: [0.25, 0.08, 1], dist: 4 },
  back: { target: [0, 0.8, 0.02], dir: [-0.25, 0.08, -1], dist: 4 },
};
/** Максимум зон, которые понимает шейдер. */
const MAX_ZONES = 32;
const COLOR = { base: '#D2C6B3', hover: '#B3A28A', selected: '#7F372C' };

const root = document.querySelector<HTMLElement>('[data-tattoo-stage]');
if (root) init(root);

function init(root: HTMLElement) {
  const data: ZoneData[] = JSON.parse(root.querySelector('script[type="application/json"]')!.textContent!);
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;

  const select = (ids: string[]) =>
    root.dispatchEvent(new CustomEvent<SelectDetail>('tattoo:select', { detail: { ids }, bubbles: true }));
  root.querySelectorAll<HTMLButtonElement>('[data-zone]').forEach((b) =>
    b.addEventListener('click', () => select([b.dataset.zone!])),
  );
  let selected: string | null = null;
  document.addEventListener('tattoo:select', (e) => {
    const ids = (e as CustomEvent<SelectDetail>).detail.ids;
    selected = ids[0] ?? null;
    root.classList.add('touched');
    root.querySelectorAll<HTMLButtonElement>('[data-zone]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.zone === selected)),
    );
  });

  if (!hasWebGL()) {
    root.classList.add('no-webgl');
    status.textContent = 'Ваш браузер не показывает 3D — выберите зону из списка.';
    return;
  }

  const stage = createStage(canvas, { minDistance: 1, maxDistance: 4.2, polar: [0.3, 0.6] });
  stage.flyTo(VIEWS.front, true);
  stage.controls.addEventListener('start', () => root.classList.add('touched'));
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
    b.addEventListener('click', () => stage.flyTo(VIEWS[b.dataset.view as keyof typeof VIEWS])),
  );

  stage
    .load('/models/body.glb')
    .then((model) => {
      const zones: string[] = model.userData.zones ?? [];
      const missing = data.filter((d) => !zones.includes(d.id)).map((d) => d.id);
      if (missing.length) console.warn('tattoo-zones.json: этих зон нет в body.glb —', missing.join(', '));
      setup(zones);
      root.classList.add('ready');
      status.textContent = '';
    })
    .catch(() => {
      root.classList.add('no-webgl');
      status.textContent = 'Не удалось загрузить модель — выберите зону из списка.';
    });

  function setup(zones: string[]) {
    // Шейдер красит треугольник по номеру зоны его вершины (flat — без смешивания на стыках).
    const uniforms = {
      uColors: { value: Array.from({ length: MAX_ZONES }, () => new THREE.Color(COLOR.base)) },
    };
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nattribute float _zone;\nflat out int vZone;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\nvZone = int(_zone + 0.5);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nflat in int vZone;\nuniform vec3 uColors[${MAX_ZONES}];`)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * uColors[vZone], opacity );');
    };
    stage.meshes.forEach((m) => (m.material = material));

    const zoneIndex = (id: string | null) => (id ? zones.indexOf(id) : -1);

    // Центр и «лицевая» сторона каждой зоны — для перелёта камеры при выборе из списка.
    // Парные зоны (руки, ноги) считаем по одной стороне, иначе центр окажется между ними.
    const centers = zones.map(() => ({ sum: new THREE.Vector3(), normal: new THREE.Vector3(), n: 0 }));
    const p = new THREE.Vector3(), nrm = new THREE.Vector3();
    for (const m of stage.meshes) {
      const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, zone = g.attributes._zone;
      if (!zone) continue;
      for (let i = 0; i < pos.count; i += 3) {
        p.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        if (p.x < -0.04) continue;
        nrm.fromBufferAttribute(nor, i).transformDirection(m.matrixWorld);
        const c = centers[Math.round(zone.getX(i))];
        if (!c) continue;
        c.sum.add(p); c.normal.add(nrm); c.n++;
      }
    }
    const viewOf = (id: string): View | null => {
      const c = centers[zoneIndex(id)];
      if (!c?.n) return null;
      const center = c.sum.clone().divideScalar(c.n);
      const dir = c.normal.clone().normalize();
      dir.y = Math.max(dir.y, 0.05);
      // Голова и шея смотрят вперёд; вид сбоку для них неудобен.
      if (Math.abs(dir.z) < 0.3) dir.z += Math.sign(dir.z || 1) * 0.6;
      return { target: center.toArray(), dir: dir.toArray(), dist: 1.5 };
    };

    let hovered: string | null = null;
    const paint = () => {
      uniforms.uColors.value.forEach((c, i) => {
        const id = zones[i];
        c.set(id && id === selected ? COLOR.selected : id && id === hovered ? COLOR.hover : COLOR.base);
      });
    };
    paint();
    // В dev-режиме разметку зон можно раскрасить из консоли: __tattoo.uniforms.uColors.value[i].set(...).
    if (import.meta.env.DEV) Object.assign(window, { __tattoo: { uniforms, zones, stage } });

    document.addEventListener('tattoo:select', (e) => {
      paint();
      // С модели зону выбирают там, где её видно; перелёт — только при выборе из списка.
      const fromList = (e.target as Element | null)?.closest?.('[data-tattoo-stage]') && !(e as CustomEvent).detail.fromModel;
      const id = (e as CustomEvent<SelectDetail>).detail.ids[0];
      const v = id && fromList ? viewOf(id) : null;
      if (v) stage.flyTo(v, reducedMotion());
    });

    const zoneAt = (e: PointerEvent): string | null => {
      const ray = stage.pointerRay(e);
      const h = ray.intersectObjects(stage.meshes, false)[0];
      if (!h?.face) return null;
      const attr = (h.object as THREE.Mesh).geometry.attributes._zone;
      return attr ? zones[Math.round(attr.getX(h.face.a))] ?? null : null;
    };

    let down: { x: number; y: number } | null = null;
    canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const z = zoneAt(e);
      if (z !== hovered) { hovered = z; paint(); }
      canvas.style.cursor = z ? 'pointer' : 'grab';
      canvas.title = z ? data.find((d) => d.id === z)?.name ?? '' : '';
    });
    canvas.addEventListener('pointerleave', () => { hovered = null; paint(); });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const z = zoneAt(e);
      if (z) root.dispatchEvent(new CustomEvent('tattoo:select', { detail: { ids: [z], fromModel: true }, bubbles: true }));
    });
  }
}
