// Domain status → visual tone + human label. One place, used everywhere.
export type Tone = 'neutral' | 'success' | 'warning' | 'critical' | 'accent' | 'info';

const label = (s: string) => s.replace(/_/g, ' ');

export const ACTIVITY_STATUSES = ['not_started', 'in_progress', 'on_hold', 'done', 'delayed'] as const;
export const DELIVERABLE_STATUSES = ['not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'delivered'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const MILESTONE_STATUSES = ['planned', 'in_progress', 'achieved', 'missed'] as const;
export const DOC_CATEGORIES = ['architectural', 'structural', 'mep', 'landscape', 'boq', 'rfi', 'shop_drawings', 'material_submittals', 'contracts', 'reports'] as const;

const activityTone: Record<string, Tone> = { not_started: 'neutral', in_progress: 'info', on_hold: 'warning', done: 'success', delayed: 'critical' };
const deliverableTone: Record<string, Tone> = {
  not_started: 'neutral', in_progress: 'info', submitted: 'accent', under_review: 'warning',
  approved: 'success', rejected: 'critical', delivered: 'success',
};
const priorityTone: Record<string, Tone> = { low: 'neutral', medium: 'info', high: 'warning', critical: 'critical' };
const milestoneTone: Record<string, Tone> = { planned: 'neutral', in_progress: 'info', achieved: 'success', missed: 'critical' };

export const activityStatus = (s: string) => ({ tone: activityTone[s] ?? 'neutral', label: label(s) });
export const deliverableStatus = (s: string) => ({ tone: deliverableTone[s] ?? 'neutral', label: label(s) });
export const priorityStatus = (s: string) => ({ tone: priorityTone[s] ?? 'neutral', label: label(s) });
export const milestoneStatus = (s: string) => ({ tone: milestoneTone[s] ?? 'neutral', label: label(s) });
export const humanize = label;

/** CSS colour for a tone (works in SVG and inline styles). */
export const toneColor: Record<Tone, string> = {
  neutral: 'rgb(var(--c-muted))', success: 'rgb(var(--c-success))', warning: 'rgb(var(--c-warning))',
  critical: 'rgb(var(--c-critical))', accent: 'rgb(var(--c-accent))', info: 'rgb(var(--c-info))',
};

/** Deliverables whose review is still open. */
export const isAwaitingDecision = (s: string) => s === 'submitted' || s === 'under_review';
export const isClosedDeliverable = (s: string) => s === 'approved' || s === 'delivered';
