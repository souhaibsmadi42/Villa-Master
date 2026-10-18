'use client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useEffect, useRef } from 'react';

// Plain three.js (no React renderer): Next's App Router runs React 19, and keeping
// the viewport imperative avoids coupling WebGL to React internals.

export type DisplayMode = 'materials' | 'clay' | 'wireframe';
export type UpAxis = 'y' | 'z';

type Props = {
  model: THREE.Object3D;
  upAxis: UpAxis;
  mode: DisplayMode;
  /** 0..1 height of a horizontal section cut; 1 = no cut. */
  section: number;
  hidden: Set<string>;
  selected: THREE.Object3D | null;
  onSelect: (o: THREE.Object3D | null) => void;
  resetNonce: number;
  onCanvas?: (c: HTMLCanvasElement) => void;
};

type Ctx = {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls;
  holder: THREE.Group; grid: THREE.GridHelper | null; box: THREE.Box3; plane: THREE.Plane; cut: boolean; helper: THREE.BoxHelper | null;
  invalidate: () => void;
};

const CLAY = new THREE.MeshStandardMaterial({ color: 0xbfb5a5, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
const AXES = [
  { v: new THREE.Vector3(1, 0, 0), c: '#C47C66', l: 'X' },
  { v: new THREE.Vector3(0, 1, 0), c: '#8FAB85', l: 'Y' },
  { v: new THREE.Vector3(0, 0, 1), c: '#7E9AB0', l: 'Z' },
];

const materialsOf = (m: THREE.Mesh) => (Array.isArray(m.material) ? m.material : [m.material]);

export default function ModelCanvas({ model, upAxis, mode, section, hidden, selected, onSelect, resetNonce, onCanvas }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const gizmo = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // Renderer, camera, controls, lighting — once.
  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.localClippingEnabled = true;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    onCanvas?.(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#121311');
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.add(new THREE.HemisphereLight(0xf7f5f0, 0x2b2a26, 0.55));
    const key = new THREE.DirectionalLight(0xfff1dc, 1.6); key.position.set(8, 14, 6); scene.add(key);
    const fill = new THREE.DirectionalLight(0xc9d4dc, 0.35); fill.position.set(-10, 6, -8); scene.add(fill);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
    camera.position.set(10, 8, 10);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.12;

    const holder = new THREE.Group();
    scene.add(holder);

    let dirty = true, frame = 0;
    const invalidate = () => { dirty = true; };
    controls.addEventListener('change', invalidate);

    const drawGizmo = () => {
      const g = gizmo.current; if (!g) return;
      const c = g.getContext('2d')!; const s = g.width, h = s / 2;
      c.clearRect(0, 0, s, s);
      const inv = camera.quaternion.clone().invert();
      AXES.map(a => ({ ...a, p: a.v.clone().applyQuaternion(inv) }))
        .sort((a, b) => a.p.z - b.p.z)
        .forEach(a => {
          const x = h + a.p.x * h * 0.62, y = h - a.p.y * h * 0.62;
          c.strokeStyle = a.c; c.lineWidth = 2 * (s / 90); c.globalAlpha = a.p.z < -0.2 ? 0.45 : 1;
          c.beginPath(); c.moveTo(h, h); c.lineTo(x, y); c.stroke();
          c.fillStyle = a.c; c.beginPath(); c.arc(x, y, 8 * (s / 90), 0, Math.PI * 2); c.fill();
          c.fillStyle = '#171916'; c.font = `600 ${10 * (s / 90)}px ui-monospace, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(a.l, x, y + 0.5);
        });
      c.globalAlpha = 1;
    };

    const loop = () => {
      frame = requestAnimationFrame(loop);
      controls.update();                     // applies damping; emits 'change' while moving
      if (!dirty) return;
      dirty = false;
      renderer.render(scene, camera);
      drawGizmo();
    };
    loop();

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate();
    });
    ro.observe(el);

    // Click-to-select (ignores drags).
    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) { down = null; return; }
      down = null;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      // Skip geometry removed by the section cut (points above the plane).
      const k = ctx.current;
      const hit = ray.intersectObject(holder, true).find(i => i.object.visible && (!k?.cut || k.plane.distanceToPoint(i.point) >= 0));
      selectRef.current(hit ? hit.object : null);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    ctx.current = { renderer, scene, camera, controls, holder, grid: null, box: new THREE.Box3(), plane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), cut: false, helper: null, invalidate };

    return () => {
      cancelAnimationFrame(frame); ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose(); env.dispose(); pmrem.dispose(); renderer.dispose();
      el.removeChild(renderer.domElement);
      ctx.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount the model; dispose the previous one.
  useEffect(() => {
    const k = ctx.current; if (!k) return;
    k.holder.add(model);
    return () => {
      k.holder.remove(model);
      model.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry?.dispose();
        const orig = (m.userData.__orig ?? m.material) as THREE.Material | THREE.Material[];
        (Array.isArray(orig) ? orig : [orig]).forEach(x => x?.dispose?.());
      });
      k.invalidate();
    };
  }, [model]);

  // Orientation + framing: sit the model on the ground, centred, camera fitted to its bounds.
  useEffect(() => {
    const k = ctx.current; if (!k) return;
    const g = k.holder;
    g.position.set(0, 0, 0);
    g.rotation.set(upAxis === 'z' ? -Math.PI / 2 : 0, 0, 0);
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    g.position.set(-c.x, -box.min.y, -c.z);
    g.updateMatrixWorld(true);
    k.box.setFromObject(model);
    const sphere = k.box.getBoundingSphere(new THREE.Sphere());
    const cam = k.camera;
    const dist = (sphere.radius / Math.sin((cam.fov * Math.PI) / 360)) * 1.12;
    cam.near = Math.max(0.01, sphere.radius / 500); cam.far = sphere.radius * 200; cam.updateProjectionMatrix();
    cam.position.copy(sphere.center).add(new THREE.Vector3(0.9, 0.62, 1).normalize().multiplyScalar(dist));
    k.controls.target.copy(sphere.center);
    k.controls.update();

    // Ground grid scaled to the model (1-2-5 steps).
    if (k.grid) { k.scene.remove(k.grid); k.grid.geometry.dispose(); (k.grid.material as THREE.Material).dispose(); }
    const size = Math.max(...k.box.getSize(new THREE.Vector3()).toArray());
    const step = Math.pow(10, Math.floor(Math.log10(Math.max(1e-3, size / 8))));
    const span = Math.ceil((size * 3) / step) * step;
    const grid = new THREE.GridHelper(span, Math.round(span / step), 0x6f6450, 0x2f312c);
    (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.7;
    grid.position.y = -0.0005 * size;
    k.scene.add(grid); k.grid = grid;
    k.invalidate();
  }, [model, upAxis, resetNonce]);

  // Display mode.
  useEffect(() => {
    const k = ctx.current; if (!k) return;
    model.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (!m.userData.__orig) m.userData.__orig = m.material;
      m.material = mode === 'clay' ? CLAY : m.userData.__orig;
      materialsOf(m).forEach(mat => { (mat as THREE.MeshStandardMaterial).wireframe = mode === 'wireframe'; mat.needsUpdate = true; });
    });
    k.invalidate();
  }, [model, mode]);

  // Horizontal section cut through the model's height.
  useEffect(() => {
    const k = ctx.current; if (!k) return;
    const cut = section < 0.999 && !k.box.isEmpty();
    k.cut = cut;
    k.plane.constant = k.box.min.y + (k.box.max.y - k.box.min.y) * section;
    const planes = cut ? [k.plane] : [];
    model.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const all = new Set([...materialsOf(m), ...(m.userData.__orig ? (Array.isArray(m.userData.__orig) ? m.userData.__orig : [m.userData.__orig]) : [])] as THREE.Material[]);
      all.forEach(mat => { mat.clippingPlanes = planes; mat.needsUpdate = true; });
    });
    CLAY.clippingPlanes = planes;
    k.invalidate();
  }, [model, section, upAxis, resetNonce]);

  // Part visibility.
  useEffect(() => {
    model.children.forEach(c => { c.visible = !hidden.has(c.uuid); });
    ctx.current?.invalidate();
  }, [model, hidden]);

  // Selection outline.
  useEffect(() => {
    const k = ctx.current; if (!k) return;
    if (k.helper) { k.scene.remove(k.helper); k.helper.dispose(); k.helper = null; }
    if (selected) { k.helper = new THREE.BoxHelper(selected, 0xc9af8c); k.scene.add(k.helper); }
    k.invalidate();
  }, [selected]);

  return (
    <div className="absolute inset-0">
      <div ref={host} className="absolute inset-0" />
      <canvas ref={gizmo} width={180} height={180} aria-hidden className="pointer-events-none absolute bottom-4 right-4 h-[90px] w-[90px]" />
    </div>
  );
}

