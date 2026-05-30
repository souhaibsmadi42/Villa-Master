/**
 * Villa Ajloun real project data + a seedDatabase() routine.
 * Used by both `supabase/seed.ts` (CLI) and `/api/seed` (one-click on Vercel).
 * Pass any Supabase client with write access (service-role, or admin session).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const START = new Date(2026, 5, 1); // 1 Jun 2026
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addWeeks = (n: number) => { const d = new Date(START); d.setDate(d.getDate() + n * 7); return d; };

const CONTRACTORS: Record<string, { name: string; scope: string; color: string }> = {
  design:     { name: 'Design / Admin',      scope: 'Design & approvals',   color: '#8C7B6B' },
  boundary:   { name: 'Boundary Wall Co.',   scope: 'Walls, gates',         color: '#C47C3A' },
  excavation: { name: 'Excavation',          scope: 'Earthworks',           color: '#BDB5A6' },
  steel:      { name: 'Steel Structure Co.', scope: 'Structure & finishes', color: '#7A9E7E' },
  konn:       { name: 'KONN — Precast',      scope: 'Precast envelope',     color: '#3C8EBF' },
  courts:     { name: 'Courts Co.',          scope: 'Sport courts',         color: '#7A6B8A' },
  fitout:     { name: 'Fit-out Co.',         scope: 'Interior & joinery',   color: '#B06070' },
  all:        { name: 'All Contractors',     scope: 'Shared / site-wide',   color: '#7BA7BC' },
};
const STAGES = [
  { ord: 0, name: 'Design & Approvals' },
  { ord: 1, name: 'Stage 1 — Boundary, Courts & Gym' },
  { ord: 2, name: 'Stage 2 — Main Structural Works' },
  { ord: 3, name: 'Stage 3 — Fit-out, Finishes & External Works' },
];
const BUILDINGS = [
  { key: 'main_chalet', name: 'Main Chalet (Duplex)' }, { key: 'private_suite', name: 'Private Suite' },
  { key: 'wellness', name: 'Wellness Center & Gym' }, { key: 'courts', name: 'Tennis / Paddle Courts' },
  { key: 'boundary_wall', name: 'Boundary Wall' }, { key: 'pool', name: 'Pool' }, { key: 'guard_house', name: 'Guard House' },
];
const MILESTONES = [
  { name: 'Site boundary complete', date: '29 Jul 2026' }, { name: 'Courts ready for play', date: '7 Sep 2026' },
  { name: 'Municipality approval received', date: '13 Dec 2026' }, { name: 'Structural works complete', date: '30 May 2027' },
  { name: 'Pool commissioned', date: '22 Aug 2027' }, { name: 'Fit-out complete', date: '31 Oct 2027' }, { name: 'Final handover', date: '5 Dec 2027' },
];
type Phase = { name: string; start: number; dur: number; c: string; stage: string; notes: string };
const PHASES: Phase[] = [
  { name: 'Concept design + owner review', start: 0, dur: 5, c: 'design', stage: 'Stage 0', notes: 'Architect drafts layouts, massing studies, circulation diagrams. Owner reviews.' },
  { name: 'Schematic design + review', start: 5, dur: 6, c: 'design', stage: 'Stage 0', notes: 'Plans, sections, elevations developed for each building.' },
  { name: 'Design development + materials', start: 11, dur: 7, c: 'design', stage: 'Stage 0', notes: 'Full DD package, material shortlist and pricing in parallel.' },
  { name: 'Municipality submission & approval', start: 18, dur: 10, c: 'design', stage: 'Stage 0', notes: 'Submission to Ajloun Municipality, 8–10 weeks with comment cycles.' },
  { name: 'BIM model development (post-approval)', start: 30, dur: 6, c: 'design', stage: 'Stage 0', notes: 'Federated Revit model at LOD 300.' },
  { name: 'Boundary wall construction', start: 4, dur: 4, c: 'boundary', stage: 'Stage 1', notes: 'Stone-clad boundary wall defining site perimeter.' },
  { name: 'Guard house — excavation', start: 4, dur: 1, c: 'excavation', stage: 'Stage 1', notes: 'Small excavation for the guard studio foundations.' },
  { name: 'Guard house — structure & build', start: 5, dur: 4, c: 'steel', stage: 'Stage 1', notes: 'Light steel structure with internal storage.' },
  { name: 'Courts & gym — excavation (together)', start: 8, dur: 2, c: 'excavation', stage: 'Stage 1', notes: 'Combined excavation for courts and gym base.' },
  { name: 'Football court — subbase, surface, fencing', start: 8, dur: 6, c: 'courts', stage: 'Stage 1', notes: 'Subbase, sport surface, fencing and lighting.' },
  { name: 'Paddle court — structure, surface, enclosure', start: 8, dur: 6, c: 'courts', stage: 'Stage 1', notes: 'Steel frame, sport surface, full glass enclosure.' },
  { name: 'Separate fenced access to courts', start: 12, dur: 2, c: 'courts', stage: 'Stage 1', notes: 'Independent gated path from the lower street.' },
  { name: 'Gym (wellness upper floor) — steel structure', start: 10, dur: 6, c: 'steel', stage: 'Stage 1', notes: 'Steel structure for the upper-floor gym.' },
  { name: 'Site mobilisation + setting out', start: 32, dur: 2, c: 'all', stage: 'Stage 2', notes: 'All contractors mobilise; setting out verified against BIM.' },
  { name: 'Excavation, retaining walls, foundations', start: 34, dur: 6, c: 'steel', stage: 'Stage 2', notes: 'Critical on sloped site; geotechnical sign-off at each level.' },
  { name: 'Private suite — KONN precast structure', start: 36, dur: 13, c: 'konn', stage: 'Stage 2', notes: 'KONN precast panels for the standalone private suite.' },
  { name: 'Chalet (duplex) — steel structure + slab', start: 36, dur: 13, c: 'steel', stage: 'Stage 2', notes: 'Two-storey steel frame, composite slab.' },
  { name: 'Mini wellness center — steel structure', start: 38, dur: 10, c: 'steel', stage: 'Stage 2', notes: 'Two-floor wellness building.' },
  { name: 'Roofing + waterproofing (all buildings)', start: 48, dur: 4, c: 'steel', stage: 'Stage 2', notes: 'Membrane, 48-hour flood test before screed.' },
  { name: 'Block work + plaster (all buildings)', start: 50, dur: 8, c: 'steel', stage: 'Stage 2', notes: 'Plaster only after MEP rough-in sign-off.' },
  { name: 'MEP first fix — rough-in', start: 51, dur: 7, c: 'steel', stage: 'Stage 2', notes: 'Electrical conduit, plumbing pressure tests, HVAC supports.' },
  { name: 'External stone cladding', start: 55, dur: 7, c: 'steel', stage: 'Stage 2', notes: 'Natural stone cladding; weather-sensitive.' },
  { name: 'Pool construction + plant room', start: 58, dur: 6, c: 'steel', stage: 'Stage 2', notes: '12 m × 5 m pool; 48-hour leak test before tiling.' },
  { name: 'Internal finishes — floors, walls, ceilings', start: 59, dur: 11, c: 'fitout', stage: 'Stage 3', notes: 'Marble, tiles, paint, gypsum ceilings.' },
  { name: 'Kitchens + joinery + walk-in closet', start: 65, dur: 5, c: 'fitout', stage: 'Stage 3', notes: 'Mostly off-site fabrication.' },
  { name: 'Bathrooms + sanitary ware', start: 65, dur: 6, c: 'fitout', stage: 'Stage 3', notes: 'Sanitary fixtures level and pressure-tested.' },
  { name: 'Wellness fit-out (jacuzzi, sauna, steam, gym)', start: 66, dur: 5, c: 'fitout', stage: 'Stage 3', notes: 'Specialist sub-contractors.' },
  { name: 'MEP second fix + commissioning', start: 69, dur: 4, c: 'steel', stage: 'Stage 3', notes: 'Fixtures, switches; switchboard megger and earth tests.' },
  { name: 'Landscape, terraces, fruit trees, paths', start: 68, dur: 6, c: 'steel', stage: 'Stage 3', notes: 'Fruit trees, paths, terrace drainage falls.' },
  { name: 'BBQ, campfire, camping, greenhouse', start: 70, dur: 4, c: 'steel', stage: 'Stage 3', notes: 'BBQ, campfire/camping zone, greenhouse.' },
  { name: 'External lighting + final MEP', start: 71, dur: 3, c: 'steel', stage: 'Stage 3', notes: 'Path, façade accent lighting commissioned at night.' },
  { name: 'Snagging round 1 + corrections', start: 73, dur: 3, c: 'all', stage: 'Stage 3', notes: 'Full walk-through; snag list by trade with photos.' },
  { name: 'Snagging round 2 + handover', start: 76, dur: 2, c: 'all', stage: 'Stage 3', notes: 'Re-inspection, closure, handover dossier issued.' },
];
const CAT: Record<string, string | null> = { 'Shop Drawings': 'shop_drawings', 'Material Approval': 'material_submittals', 'Report': 'reports', 'Drawings': 'architectural', 'BIM': 'architectural' };
const STATUS: Record<string, string> = { pending: 'not_started', 'in-progress': 'in_progress', submitted: 'submitted', approved: 'approved', rejected: 'rejected' };
const PRIO: Record<string, string> = { high: 'high', med: 'medium', low: 'low' };

function deliverablesFor(p: Phase) {
  const mk = (rows: [string, string, string?, string?, string?][]) => rows.map(r => ({
    name: r[0], category: CAT[r[1]] ?? null, status: STATUS[r[2] || 'pending'] || 'not_started',
    priority: PRIO[r[3] || 'med'] || 'medium', due: r[4] ? iso(new Date(r[4])) : null,
  }));
  const n = p.name;
  if (p.c === 'design') {
    if (n.includes('Concept')) return mk([['Concept design package (PDF)', 'Drawings', 'in-progress', 'high', '5 Jul 2026'], ['Owner brief acknowledgement', 'Report', 'approved', 'high', '8 Jun 2026'], ['Site analysis & solar studies', 'Drawings', 'in-progress', 'med', '20 Jun 2026'], ['Massing model (3D)', 'BIM', 'pending', 'med', '28 Jun 2026']]);
    if (n.includes('Schematic')) return mk([['Schematic plans, sections, elevations', 'Drawings', 'submitted', 'high', '10 Aug 2026'], ['Area & GFA schedule', 'Report', 'pending', 'high', '10 Aug 2026'], ['Cost estimate — class C', 'Report', 'pending', 'high', '14 Aug 2026']]);
    if (n.includes('Design development')) return mk([['Full DD drawing set', 'Drawings', 'pending', 'high', '30 Sep 2026'], ['Material schedule + samples board', 'Material Approval', 'pending', 'high', '25 Sep 2026'], ['Updated cost estimate — class B', 'Report', 'pending', 'high', '4 Oct 2026']]);
    if (n.includes('Municipality')) return mk([['Permit drawing package', 'Drawings', 'pending', 'high', '5 Oct 2026'], ['Structural calculations', 'Report', 'pending', 'high', '5 Oct 2026'], ['Final approval certificate', 'Handover', 'pending', 'high', '13 Dec 2026']]);
    if (n.includes('BIM')) return mk([['Architectural federated model (LOD 300)', 'BIM', 'pending', 'high', '10 Jan 2027'], ['Clash detection report', 'QA/QC', 'pending', 'high', '25 Jan 2027']]);
  }
  if (p.c === 'boundary') return mk([['Wall construction shop drawings', 'Shop Drawings', 'pending', 'high', '1 Jul 2026'], ['Stone cladding sample approval', 'Material Approval', 'pending', 'med', '5 Jul 2026'], ['As-built wall record', 'Handover', 'pending', 'med', '29 Jul 2026']]);
  if (p.c === 'courts') return mk([['Sport surface sample sign-off', 'Material Approval', 'pending', 'high', '10 Aug 2026'], ['Fencing & lighting layout', 'Shop Drawings', 'pending', 'med', '15 Aug 2026'], ['Court line marking record', 'Handover', 'pending', 'low', '7 Sep 2026']]);
  if (p.c === 'excavation') return mk([['Excavation method statement', 'Coordination', 'pending', 'high'], ['Soil test results', 'QA/QC', 'pending', 'high'], ['Trench safety inspection', 'Inspection', 'pending', 'high']]);
  if (p.c === 'konn') return mk([['Precast shop drawings', 'Shop Drawings', 'pending', 'high', '10 Feb 2027'], ['Mix design & cube test reports', 'QA/QC', 'pending', 'high', '15 Feb 2027'], ['Handover quality dossier', 'Handover', 'pending', 'high', '2 May 2027']]);
  if (p.c === 'steel') return mk([['Structural shop drawings', 'Shop Drawings', 'pending', 'high'], ['Steel mill certificates', 'QA/QC', 'pending', 'med'], ['Weld / bolt inspection report', 'Inspection', 'pending', 'high'], ['As-built records', 'Handover', 'pending', 'med']]);
  if (p.c === 'fitout') return mk([['Material samples board', 'Material Approval', 'pending', 'high'], ['Finishes shop drawings', 'Shop Drawings', 'pending', 'med'], ['Snag-free sign-off', 'QA/QC', 'pending', 'high']]);
  if (p.c === 'all') return mk([['Mobilisation / snag plan', 'Coordination', 'pending', 'high'], ['Handover dossier', 'Handover', 'pending', 'high']]);
  return [];
}
function buildingKeyFor(name: string): string | null {
  const s = name.toLowerCase();
  if (s.includes('guard')) return 'guard_house'; if (s.includes('boundary')) return 'boundary_wall';
  if (s.includes('court')) return 'courts'; if (s.includes('gym') || s.includes('wellness')) return 'wellness';
  if (s.includes('chalet')) return 'main_chalet'; if (s.includes('suite')) return 'private_suite';
  if (s.includes('pool')) return 'pool'; return null;
}
const CRITICAL = new Set(['Concept design + owner review', 'Schematic design + review', 'Design development + materials', 'Municipality submission & approval', 'BIM model development (post-approval)', 'Site mobilisation + setting out', 'Excavation, retaining walls, foundations', 'Chalet (duplex) — steel structure + slab', 'Roofing + waterproofing (all buildings)', 'Block work + plaster (all buildings)', 'Internal finishes — floors, walls, ceilings', 'MEP second fix + commissioning', 'Snagging round 1 + corrections', 'Snagging round 2 + handover']);
const DEPS: [string, string][] = [
  ['Schematic design + review', 'Concept design + owner review'], ['Design development + materials', 'Schematic design + review'],
  ['Municipality submission & approval', 'Design development + materials'], ['BIM model development (post-approval)', 'Municipality submission & approval'],
  ['Guard house — structure & build', 'Guard house — excavation'], ['Football court — subbase, surface, fencing', 'Courts & gym — excavation (together)'],
  ['Paddle court — structure, surface, enclosure', 'Courts & gym — excavation (together)'], ['Gym (wellness upper floor) — steel structure', 'Courts & gym — excavation (together)'],
  ['Excavation, retaining walls, foundations', 'Site mobilisation + setting out'], ['Private suite — KONN precast structure', 'Excavation, retaining walls, foundations'],
  ['Chalet (duplex) — steel structure + slab', 'Excavation, retaining walls, foundations'], ['Mini wellness center — steel structure', 'Excavation, retaining walls, foundations'],
  ['Roofing + waterproofing (all buildings)', 'Chalet (duplex) — steel structure + slab'], ['Block work + plaster (all buildings)', 'Roofing + waterproofing (all buildings)'],
  ['MEP first fix — rough-in', 'Block work + plaster (all buildings)'], ['External stone cladding', 'Block work + plaster (all buildings)'],
  ['Pool construction + plant room', 'External stone cladding'], ['Internal finishes — floors, walls, ceilings', 'Block work + plaster (all buildings)'],
  ['Kitchens + joinery + walk-in closet', 'Internal finishes — floors, walls, ceilings'], ['Bathrooms + sanitary ware', 'MEP first fix — rough-in'],
  ['MEP second fix + commissioning', 'Internal finishes — floors, walls, ceilings'], ['Landscape, terraces, fruit trees, paths', 'External stone cladding'],
  ['External lighting + final MEP', 'Landscape, terraces, fruit trees, paths'], ['Snagging round 1 + corrections', 'MEP second fix + commissioning'],
  ['Snagging round 2 + handover', 'Snagging round 1 + corrections'],
];

export async function seedDatabase(sb: SupabaseClient) {
  await sb.from('project').delete().eq('name', 'Villa Ajloun'); // cascades

  const { data: proj, error: pe } = await sb.from('project').insert({
    name: 'Villa Ajloun', location: 'Ajloun, Jordan', client_name: 'Mr. Khalid Al Smadi',
    start_date: iso(START), end_date: '2027-12-05', budget: 0, currency: 'JOD',
  }).select().single();
  if (pe) throw pe;
  const projectId = proj!.id;

  const { data: contractors } = await sb.from('contractor').insert(Object.entries(CONTRACTORS).map(([key, c]) => ({ project_id: projectId, key, name: c.name, scope: c.scope, color: c.color }))).select();
  const cId: Record<string, string> = {}; contractors!.forEach(c => (cId[c.key] = c.id));
  const { data: stages } = await sb.from('stage').insert(STAGES.map(s => ({ project_id: projectId, ord: s.ord, name: s.name }))).select();
  const sId: Record<number, string> = {}; stages!.forEach(s => (sId[s.ord] = s.id));
  const { data: buildings } = await sb.from('building').insert(BUILDINGS.map(b => ({ project_id: projectId, key: b.key, name: b.name }))).select();
  const bId: Record<string, string> = {}; buildings!.forEach(b => (bId[b.key] = b.id));
  await sb.from('milestone').insert(MILESTONES.map((m, i) => ({ project_id: projectId, name: m.name, planned_date: iso(new Date(m.date)), status: 'planned', ord: i })));

  const actId: Record<string, string> = {}; let sort = 0, delivCount = 0;
  for (const p of PHASES) {
    const stageOrd = parseInt(p.stage.replace('Stage ', ''), 10);
    const start = addWeeks(p.start), end = addWeeks(p.start + p.dur), bk = buildingKeyFor(p.name);
    const { data: act, error: ae } = await sb.from('activity').insert({
      project_id: projectId, stage_id: sId[stageOrd] ?? null, contractor_id: cId[p.c] ?? null, building_id: bk ? bId[bk] : null,
      name: p.name, description: p.notes, baseline_start: iso(start), baseline_end: iso(end), start_date: iso(start), end_date: iso(end),
      progress: 0, weight: p.dur, status: 'not_started', is_critical: CRITICAL.has(p.name), is_milestone: false, sort: sort++,
    }).select().single();
    if (ae) throw ae;
    actId[p.name] = act!.id;
    const dels = deliverablesFor(p);
    if (dels.length) { await sb.from('deliverable').insert(dels.map(d => ({ activity_id: act!.id, project_id: projectId, contractor_id: cId[p.c] ?? null, name: d.name, category: d.category, priority: d.priority, status: d.status, due_date: d.due }))); delivCount += dels.length; }
  }
  const depRows = DEPS.filter(([s, p]) => actId[s] && actId[p]).map(([s, p]) => ({ successor_id: actId[s], predecessor_id: actId[p], type: 'FS' }));
  if (depRows.length) await sb.from('activity_dependency').insert(depRows);

  return { activities: PHASES.length, deliverables: delivCount, dependencies: depRows.length, milestones: MILESTONES.length, contractors: Object.keys(CONTRACTORS).length };
}
