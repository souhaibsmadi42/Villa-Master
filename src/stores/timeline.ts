import { create } from 'zustand';

export type Zoom = 'week' | 'month' | 'quarter' | 'year';

// px per day at each zoom level
export const PX_PER_DAY: Record<Zoom, number> = { week: 18, month: 5, quarter: 2, year: 0.8 };

interface TimelineState {
  zoom: Zoom;
  contractorFilter: string | null;   // contractor id or null = all
  showCritical: boolean;
  showBaseline: boolean;
  setZoom: (z: Zoom) => void;
  setContractor: (id: string | null) => void;
  toggleCritical: () => void;
  toggleBaseline: () => void;
}

export const useTimeline = create<TimelineState>((set) => ({
  zoom: 'month',
  contractorFilter: null,
  showCritical: false,
  showBaseline: true,
  setZoom: (zoom) => set({ zoom }),
  setContractor: (contractorFilter) => set({ contractorFilter }),
  toggleCritical: () => set((s) => ({ showCritical: !s.showCritical })),
  toggleBaseline: () => set((s) => ({ showBaseline: !s.showBaseline })),
}));
