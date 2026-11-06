// Общая 3D-сцена для страниц с моделями (/piercing, /tattoo): рендерер с прозрачным фоном,
// мягкий свет, вращение мышью и пальцем, плавные перелёты камеры, загрузка сжатых meshopt-моделей.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface View {
  target: [number, number, number];
  /** Направление от цели к камере (нормализуется). */
  dir: [number, number, number];
  dist: number;
}

export interface StageOptions {
  /** Ниже этой высоты модель плавно растворяется в фоне – скрывает срез шеи. */
  fadeFromY?: number;
  fadeToY?: number;
  minDistance: number;
  maxDistance: number;
  /** Пределы наклона камеры в долях π (0 – сверху, 1 – снизу). */
  polar?: [number, number];
  color?: string;
}

/** Насколько может сдвинуться указатель, чтобы это ещё было нажатие, а не поворот: палец дрожит сильнее мыши. */
export const tapSlop = (e: PointerEvent) => (e.pointerType === 'mouse' ? 6 : 12);

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export function createStage(canvas: HTMLCanvasElement, opts: StageOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  scene.add(new THREE.HemisphereLight('#fff6ea', '#7d6e5c', 1.5));
  const key = new THREE.DirectionalLight('#fff3e2', 1.9);
  key.position.set(0.8, 1.6, 1.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#e9d9c4', 0.7);
  rim.position.set(-1, 0.6, -1.2);
  scene.add(rim);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  // Колесо мыши не трогаем – иначе страница перестаёт прокручиваться над моделью. Приближение – кнопками видов.
  controls.enableZoom = false;
  controls.minDistance = opts.minDistance;
  controls.maxDistance = opts.maxDistance;
  // Снизу на модель не заглянуть – там срез.
  const polar = [Math.PI * (opts.polar?.[0] ?? 0.22), Math.PI * (opts.polar?.[1] ?? 0.62)];
  controls.minPolarAngle = polar[0];
  controls.maxPolarAngle = polar[1];

  // Пальцем: вертикальный свайп прокручивает страницу (touch-action: pan-y в CSS), горизонтальный крутит
  // модель вокруг оси – наклон на время касания замораживаем; двумя пальцами – приближение щипком.
  // OrbitControls ставит холсту touch-action: none – возвращаем странице вертикальную прокрутку.
  canvas.style.touchAction = 'pan-y';
  const touches = new Set<number>();
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    if (!touches.size) {
      controls.minPolarAngle = controls.maxPolarAngle = controls.getPolarAngle();
      controls.enableZoom = true;
    }
    touches.add(e.pointerId);
  }, { capture: true });
  const release = (e: PointerEvent) => {
    if (!touches.delete(e.pointerId) || touches.size) return;
    [controls.minPolarAngle, controls.maxPolarAngle] = polar;
    controls.enableZoom = false;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  const material = new THREE.MeshStandardMaterial({ color: opts.color ?? '#D2C6B3', roughness: 0.85, metalness: 0 });
  if (opts.fadeFromY !== undefined && opts.fadeToY !== undefined) {
    material.transparent = true;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFade = { value: new THREE.Vector2(opts.fadeFromY!, opts.fadeToY!) };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vWorldY;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vWorldY;\nuniform vec2 uFade;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(uFade.x, uFade.y, vWorldY);');
    };
  }

  const meshes: THREE.Mesh[] = [];

  async function load(url: string) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url);
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.material = material;
        meshes.push(m);
      }
    });
    scene.add(gltf.scene);
    scene.updateMatrixWorld(true);
    return gltf.scene;
  }

  // Перелёт камеры: интерполяция цели и положения, с prefers-reduced-motion – мгновенно.
  let flight: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number; dur: number } | null = null;

  function viewPosition(v: View) {
    const target = new THREE.Vector3(...v.target);
    const pos = new THREE.Vector3(...v.dir).normalize().multiplyScalar(v.dist).add(target);
    return { target, pos };
  }

  function flyTo(v: View, instant = reducedMotion()) {
    const { target, pos } = viewPosition(v);
    // Ограничения дистанции не должны мешать перелёту к крупному плану.
    controls.minDistance = Math.min(opts.minDistance, v.dist);
    controls.maxDistance = Math.max(opts.maxDistance, v.dist);
    if (instant) {
      flight = null;
      camera.position.copy(pos);
      controls.target.copy(target);
      controls.update();
      return;
    }
    flight = { from: camera.position.clone(), to: pos, tFrom: controls.target.clone(), tTo: target, start: performance.now(), dur: 900 };
  }

  const frameHandlers: (() => void)[] = [];
  const onFrame = (fn: () => void) => frameHandlers.push(fn);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Рисуем только пока сцена видна на экране.
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  renderer.setAnimationLoop((now) => {
    if (!visible) return;
    if (flight) {
      const t = Math.min(1, (now - flight.start) / flight.dur);
      const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(flight.from, flight.to, k);
      controls.target.lerpVectors(flight.tFrom, flight.tTo, k);
      if (t === 1) flight = null;
    }
    controls.update();
    frameHandlers.forEach((fn) => fn());
    renderer.render(scene, camera);
  });
  controls.addEventListener('start', () => { flight = null; });

  const raycaster = new THREE.Raycaster();
  function pointerRay(e: { clientX: number; clientY: number }) {
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(ndc, camera);
    return raycaster;
  }

  return { THREE, renderer, scene, camera, controls, meshes, raycaster, load, flyTo, onFrame, pointerRay };
}

export type Stage = ReturnType<typeof createStage>;
