'use client';
import { useEffect, useState } from 'react';

/** True after the first client render — gate portals so SSR and hydration agree. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
