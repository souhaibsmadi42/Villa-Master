# BIM Viewer Integration — Decision Brief

> Where the "Site & BIM" scene becomes a real 3D model of Villa Ajloun.

---

## TL;DR — Pick **Speckle**.

For a single-project, owner-facing platform with a small architectural team using Revit/Rhino, **Speckle** is the right answer. It is:

- Open-source, vendor-neutral, web-first.
- Designed for *programmatic* access to BIM data (you can query it from React).
- Hostable yourself or on speckle.xyz (free for small teams).
- Plays well with Revit, Rhino, Grasshopper, AutoCAD, Blender, ArchiCAD.
- The viewer is a normal npm package: `@speckle/viewer`.

We'll use Speckle for the Site & BIM scene, with **IFC.js / `web-ifc-viewer`** kept as a fallback for ad-hoc IFC files (RFI attachments, contractor sketches). Forge / APS is overkill and ties the project to Autodesk's auth.

---

## Comparison

| Criterion | **Speckle** | **IFC.js / web-ifc** | **Autodesk Platform Services (Forge)** |
| --- | --- | --- | --- |
| Source format | Anything (.rvt, .rhino, .3dm, .ifc, .obj, .gltf) via plugins | IFC only | Anything Autodesk reads (.rvt, .nwd, .dwg, .ifc, .3dm…) |
| Hosting | Open-source server (self-host) or speckle.xyz | Client-only — no server needed | Autodesk cloud (mandatory) |
| Auth | Open, simple PATs / OAuth | None required for static IFC | OAuth2, separate Autodesk app |
| Pricing | Free (self-host) or freemium | Free | Pay per model translation + storage |
| Viewer | `@speckle/viewer` — Three.js based | `web-ifc-viewer` — Three.js based | Forge Viewer (custom WebGL stack) |
| Programmatic API | First-class GraphQL — query objects, properties, anything | Loads + traverses IFC tree client-side | REST + Viewer JS API |
| Tagging / metadata | Native commits & comments | None | Properties only |
| Owner-experience fit | Excellent — comments, versions, lineage | Limited — viewer only | Good but heavy chrome |
| Lock-in | None | None | High (Autodesk auth + storage) |
| Best for | Multi-disc collab + lineage | One-off IFC viewing | Heavy enterprise AEC pipelines |

---

## How it lands in our codebase

```
src/components/bim/
  SiteViewer.tsx        ← React shell, frame, our chrome
  speckle/
    useSpeckleStream.ts ← hook: fetch a stream, return viewer instance
    SpeckleCanvas.tsx   ← <canvas> + viewer mount
  ifc/
    IfcCanvas.tsx       ← fallback path for raw .ifc files
```

The **frame** is what we design. The viewer chrome is invisible until the user mouses near it. Click a zone → camera tweens, our React layer slides a glass panel up with what's planned there.

### Required env

```
NEXT_PUBLIC_SPECKLE_URL=https://speckle.xyz            # or your self-hosted URL
NEXT_PUBLIC_SPECKLE_STREAM_ID=abc123                   # the stream / project ID
NEXT_PUBLIC_SPECKLE_TOKEN=...                          # PAT or guest token
```

### Install

```bash
pnpm add @speckle/viewer
# Optional fallback for raw IFC files:
pnpm add web-ifc-viewer
```

### Usage in a page

```tsx
// app/site/page.tsx
import { SiteViewer } from '@/components/bim/SiteViewer';

export default function SitePage() {
  return (
    <main className="min-h-screen p-8">
      <SiteViewer
        streamId={process.env.NEXT_PUBLIC_SPECKLE_STREAM_ID!}
        zones={[
          { id: 'entry', label: 'Entry',     camera: { phi: 1.0, theta: -0.5, r: 18 } },
          { id: 'main',  label: 'Main house', camera: { phi: 0.7, theta:  0.2, r: 22 } },
          { id: 'courts',label: 'Tennis courts', camera: { phi: 1.1, theta: 1.4, r: 26 } },
          { id: 'pool',  label: 'Pool',      camera: { phi: 0.9, theta:  0.9, r: 14 } },
        ]}
      />
    </main>
  );
}
```

The viewer renders inside a tall glass card; zone buttons sit in a floating capsule top-left; on click the camera tweens and a side glass panel slides in with `<DecisionsForZone />` content.

---

## What about cost / hosting

- **Free path:** push commits to <https://speckle.xyz>, use a guest token in the env.
- **Self-host:** Speckle ships a Docker compose. ~$10/month VPS. Recommended once the project is past schematic design.

---

## Failure modes & how we handle them

| Risk | Mitigation |
| --- | --- |
| Architect doesn't have Speckle workflow yet | Accept .ifc uploads as fallback (`IfcCanvas.tsx`). Conversion is one Grasshopper script away. |
| Token leaked client-side | Use **guest** scopes only. Server-only `service_role` lives in API routes if we need write. |
| First load too heavy | Lazy-load the viewer chunk (`dynamic(() => import(...), { ssr: false })`); show a static still + "Loading model…" until ready. |
| Performance on phones | Below `md` breakpoint, swap to a poster image with "View on desktop" CTA. The 3D viewer is a desktop experience. |

---

## Roadmap

| Week | Step |
| --- | --- |
| 1 | Wire `SpeckleCanvas` against the architect's first commit. |
| 2 | Map model zones → our React glass panels. |
| 3 | Comment overlay: pin Speckle comments to React markers. |
| 4 | Link deliverables ↔ model objects (Speckle object ID stored on `deliverable.meta.bim_id`). |
| 5+ | IFC.js fallback for RFI attachments; mobile poster experience. |

The frame around the model is what makes it feel premium. The viewer is just the engine inside.
