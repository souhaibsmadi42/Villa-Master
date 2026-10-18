// Lightweight format helpers (no three.js) so the viewer page stays small until a model is opened.
export const MODEL_EXTS = ['glb', 'gltf', 'fbx', 'obj', 'stl', 'ply', 'dae', '3mf'] as const;
export type ModelExt = (typeof MODEL_EXTS)[number];
export const ACCEPT = [...MODEL_EXTS, 'mtl', 'bin', 'png', 'jpg', 'jpeg', 'webp', 'tga', 'bmp'].map(e => `.${e}`).join(',');
export const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
export const isModelFile = (name: string) => (MODEL_EXTS as readonly string[]).includes(extOf(name));
