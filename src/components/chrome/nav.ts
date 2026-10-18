import { LayoutGrid, SquareChartGantt, Milestone, MapPinned, Box, HardHat, FileCheck2, FolderOpen, ScrollText, Crown, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/rbac';

export type NavItem = { href: string; label: string; hint: string; icon: LucideIcon; roles: Role[] };
export type NavGroup = { label: string; items: NavItem[] };

const ALL: Role[] = ['admin', 'owner', 'consultant', 'contractor'];

// Every entry points at a real route. Visibility mirrors server-side guards and RLS.
export const NAV: NavGroup[] = [
  { label: 'Project', items: [
    { href: '/dashboard',  label: 'Overview',     hint: 'Project control',            icon: LayoutGrid,       roles: ALL },
    { href: '/timeline',   label: 'Timeline',     hint: 'Programme & dependencies',   icon: SquareChartGantt, roles: ALL },
    { href: '/milestones', label: 'Milestones',   hint: 'Planned vs actual',          icon: Milestone,        roles: ALL },
    { href: '/map',        label: 'Site map',     hint: 'Progress by building',       icon: MapPinned,        roles: ALL },
    { href: '/site',       label: 'Model viewer', hint: '3D / BIM models',            icon: Box,              roles: ALL },
  ] },
  { label: 'Delivery', items: [
    { href: '/contractors',  label: 'Contractors',  hint: 'Scopes, progress, actions', icon: HardHat,    roles: ['admin', 'owner', 'consultant'] },
    { href: '/deliverables', label: 'Deliverables', hint: 'Submissions & approvals',   icon: FileCheck2, roles: ALL },
    { href: '/documents',    label: 'Documents',    hint: 'Drawings, versions, files', icon: FolderOpen, roles: ALL },
  ] },
  { label: 'Oversight', items: [
    { href: '/reports', label: 'Reports',       hint: 'Weekly owner updates', icon: ScrollText, roles: ['admin', 'owner', 'consultant'] },
    { href: '/owner',   label: 'Owner view',    hint: 'Executive summary',    icon: Crown,      roles: ['admin', 'owner'] },
    { href: '/team',    label: 'Team & access', hint: 'People and roles',     icon: Users,      roles: ['admin'] },
  ] },
];

export const navFor = (role: Role) =>
  NAV.map(g => ({ ...g, items: g.items.filter(i => i.roles.includes(role)) })).filter(g => g.items.length);

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/');

export function labelForPath(pathname: string) {
  for (const g of NAV) for (const i of g.items) if (isActive(pathname, i.href)) return i.label;
  return null;
}
