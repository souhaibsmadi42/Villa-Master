/**
 * GET /api/insight
 * Returns a single, freshly-generated "editor's note" paragraph for the
 * dashboard Smart Insight panel. Non-streaming JSON — used by React Query.
 */
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { DEMO_SNAPSHOT, snapshotForSystem } from '@/lib/project-context';

export const runtime = 'nodejs';
export const revalidate = 60; // cache 60s

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback so the UI never breaks in dev.
    return Response.json({
      cached: false,
      paragraph:
        'Week 28. Foundations on schedule. KONN remains the bottleneck on shop drawings — three approvals slipped by an average of 2.1 days. The next owner decision is the stair stone finish, due Jul 3.',
      generated: false,
    });
  }

  const system = `You write the Smart Insight panel for the Villa Ajloun dashboard.
Tone: Financial Times dispatch. One paragraph, 3–4 sentences, ≤ 70 words.
Be specific: cite week numbers, contractor names, deliverable titles, dates.
Do not use emoji, lists, headings, or markdown. Plain prose only.

CURRENT STATE:
${snapshotForSystem(DEMO_SNAPSHOT)}`;

  const out = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 220,
    system,
    messages: [{ role: 'user', content: 'Write today\'s insight paragraph.' }],
  });

  const text = out.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();

  return Response.json({ paragraph: text, generated: true });
}
