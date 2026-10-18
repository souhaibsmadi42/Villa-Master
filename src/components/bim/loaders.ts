import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';

import { extOf, isModelFile } from './formats';

export type LoadProgress = (fraction: number | null) => void;

const neutral = () => new THREE.MeshStandardMaterial({ color: 0xd9d1c3, roughness: 0.85, metalness: 0.02 });

/**
 * Loads a model from either local files (drag & drop: the main model plus any
 * companions — .mtl, .bin, textures — resolved by file name) or a URL.
 * Returns a single Object3D. Throws with a readable message on failure.
 */
export async function loadModel(src: { files: File[] } | { url: string; name: string }, onProgress?: LoadProgress): Promise<THREE.Object3D> {
  const blobUrls: string[] = [];
  const manager = new THREE.LoadingManager();
  let mainUrl: string, mainName: string;

  if ('files' in src) {
    const main = src.files.find(f => isModelFile(f.name));
    if (!main) throw new Error('No supported model file found. Use GLB, glTF, FBX, OBJ, STL, PLY, DAE or 3MF.');
    const byName = new Map<string, string>();
    for (const f of src.files) {
      const u = URL.createObjectURL(f); blobUrls.push(u);
      byName.set(f.name.toLowerCase(), u);
    }
    // Resolve companion files (textures, .bin, .mtl) referenced by relative path.
    manager.setURLModifier(url => {
      if (url.startsWith('blob:') || url.startsWith('data:')) return url;
      const base = decodeURIComponent(url.split(/[\\/]/).pop() ?? '').toLowerCase();
      return byName.get(base) ?? url;
    });
    mainUrl = byName.get(main.name.toLowerCase())!;
    mainName = main.name;
  } else {
    mainUrl = src.url; mainName = src.name;
  }

  const progress = (e: ProgressEvent) => onProgress?.(e.lengthComputable && e.total ? e.loaded / e.total : null);
  const ext = extOf(mainName);

  try {
    switch (ext) {
      case 'glb':
      case 'gltf': {
        const gltf = await new GLTFLoader(manager).loadAsync(mainUrl, progress);
        return gltf.scene;
      }
      case 'fbx':
        return await new FBXLoader(manager).loadAsync(mainUrl, progress);
      case 'obj': {
        const loader = new OBJLoader(manager);
        if ('files' in src) {
          const mtl = src.files.find(f => extOf(f.name) === 'mtl');
          if (mtl) {
            const mtlUrl = URL.createObjectURL(mtl); blobUrls.push(mtlUrl);
            const materials = await new MTLLoader(manager).loadAsync(mtlUrl);
            materials.preload();
            loader.setMaterials(materials);
          }
        }
        return await loader.loadAsync(mainUrl, progress);
      }
      case 'stl': {
        const geo = await new STLLoader(manager).loadAsync(mainUrl, progress);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, neutral()); mesh.name = mainName;
        return mesh;
      }
      case 'ply': {
        const geo = await new PLYLoader(manager).loadAsync(mainUrl, progress);
        geo.computeVertexNormals();
        const mat = geo.hasAttribute('color') ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }) : neutral();
        const mesh = new THREE.Mesh(geo, mat); mesh.name = mainName;
        return mesh;
      }
      case 'dae': {
        const c = await new ColladaLoader(manager).loadAsync(mainUrl, progress);
        if (!c) throw new Error('The DAE file contains no scene.');
        return c.scene;
      }
      case '3mf':
        return await new ThreeMFLoader(manager).loadAsync(mainUrl, progress);
      default:
        throw new Error(`.${ext} files are not supported.`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(/draco/i.test(msg)
      ? 'This glTF uses Draco compression, which this viewer does not decode yet. Re-export without Draco.'
      : `Could not read ${mainName}: ${msg}`);
  } finally {
    // Give textures a moment to finish decoding before revoking their blob URLs.
    setTimeout(() => blobUrls.forEach(u => URL.revokeObjectURL(u)), 15000);
  }
}

export type ModelStats = { meshes: number; triangles: number; vertices: number; materials: number; size: THREE.Vector3 };

export function modelStats(root: THREE.Object3D): ModelStats {
  let meshes = 0, triangles = 0, vertices = 0;
  const mats = new Set<string>();
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    meshes++;
    const g = m.geometry as THREE.BufferGeometry;
    const pos = g.getAttribute('position');
    if (pos) vertices += pos.count;
    triangles += g.index ? g.index.count / 3 : (pos?.count ?? 0) / 3;
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => x && mats.add(x.uuid));
  });
  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  return { meshes, triangles: Math.round(triangles), vertices, materials: mats.size, size };
}
