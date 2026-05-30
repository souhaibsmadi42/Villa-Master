'use client';
import { Area, AreaChart, CartesianGrid, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function SCurve({ data, todayLabel, todayPlanned, todayActual }: {
  data: { label: string; planned: number; earned?: number | null }[];
  todayLabel?: string; todayPlanned?: number; todayActual?: number;
}) {
  const hasEarned = data.some(d => d.earned != null);
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="plan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7A9E7E" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7A9E7E" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-sand)" strokeOpacity={0.5} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--c-stone)' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: 'var(--c-stone)' }} domain={[0, 100]} unit="%" />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--c-sand)' }} formatter={(v: number) => `${v}%`} />
          <Area type="monotone" dataKey="planned" stroke="#7A9E7E" strokeWidth={2} fill="url(#plan)" name="Planned" />
          {hasEarned && <Line type="monotone" dataKey="earned" stroke="#C4853A" strokeWidth={2.5} dot={false} connectNulls name="Actual (earned)" />}
          {todayLabel && (
            <>
              <ReferenceLine x={todayLabel} stroke="#B06070" strokeDasharray="4 3" label={{ value: 'today', fontSize: 10, fill: '#B06070', position: 'top' }} />
              {todayActual != null && <ReferenceDot x={todayLabel} y={todayActual} r={5} fill="#C4853A" stroke="#fff" strokeWidth={1.5} />}
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 text-[11px] text-stone mt-1 px-2">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-olive/60" /> Planned cumulative</span>
        {todayActual != null && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" /> Actual today ({todayActual}%)</span>}
        {todayPlanned != null && <span className="num">planned by today: {todayPlanned}%</span>}
      </div>
    </div>
  );
}
