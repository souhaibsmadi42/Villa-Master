/**
 * GET /api/insight
 * One short "editor's note" paragraph about the project, written by Claude from the
 * caller's live, RLS-scoped project snapshot. Returns { paragraph, generated }.
 * Without an API key it returns { paragraph: null, generated: false, reason } —
 * it never substitutes invented text.
 */
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { getLiveSnapshotText } from '@/lib/project-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ paragraph: null, generated: false, reason: 'unauthorized' }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ paragraph: null, generated: false, reason: 'not_configured' });

  const { text } = await getLiveSnapshotText();
  const out = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 220,
    system: `You write the insight note for the Villa Ajloun project dashboard.
Tone: Financial Times dispatch. One paragraph, 3–4 sentences, ≤ 70 words.
Use only facts in the snapshot; cite activity names, contractors and dates. No emoji, lists, headings or markdown.

CURRENT STATE:
${text}`,
    messages: [{ role: 'user', content: "Write today's insight paragraph." }],
  });

  const paragraph = out.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map(b => b.text).join('').trim();

  return Response.json({ paragraph, generated: true });
}
