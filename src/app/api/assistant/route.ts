/**
 * POST /api/assistant
 * Body: { messages: [{ role: 'user'|'assistant', content: string }], mode?: 'ask'|'draft' }
 * Streams Server-Sent Events:
 *   "event: context" {activities, deliverables, milestones, generatedAt}  — what the answer is grounded in
 *   "event: delta"   {text}                                                — streamed tokens
 *   "event: done"    {usage, stop_reason}
 *   "event: error"   {error}
 *
 * Grounded in a live, RLS-scoped snapshot of the caller's project data (see
 * lib/project-data.ts), so the assistant only knows what the user may see.
 */
import { NextRequest } from 'next/server';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';
import { getLiveSnapshotText } from '@/lib/project-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_BASE = `You are the Villa Ajloun project assistant inside Villa Master, a construction intelligence platform.
You speak with calm authority: short declarative sentences, specific names, dates and numbers.
Tone: editorial, owner-respectful, never breathless. No emoji, no exclamation marks.

The PROJECT SNAPSHOT below is live data read from the project database at the moment of the question.
Treat it as the only source of facts. Never invent activities, contractors, dates, costs or figures.
If the snapshot cannot answer, say so plainly and name the smallest next step to find out.
Keep facts and advice visibly separate: state facts first; put any recommendation on its own line starting with "Suggestion:".

Formatting: plain paragraphs; use "- " bullet lists only for 3+ parallel items; **bold** sparingly for names or numbers that matter.

In "ask" mode: answer in 2–6 short sentences or a short list. Cite activities, contractors and deliverables by name.
In "draft" mode: write the requested artefact —
- weekly owner update: 3 paragraphs, ~180 words, no lists
- contractor RFI reply: one direct paragraph
- decision summary: one short paragraph plus the options on the table`;

function sse(data: object, event = 'message') {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json(401, { error: 'unauthorized', message: 'Sign in to use the project assistant.' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return json(500, { error: 'config', message: 'The assistant is not configured: ANTHROPIC_API_KEY is not set on the server.' });
  }

  let body: { messages?: Array<{ role: 'user' | 'assistant'; content: string }>; mode?: 'ask' | 'draft' };
  try { body = await req.json(); }
  catch { return json(400, { error: 'bad_json', message: 'Bad JSON' }); }

  const mode = body.mode === 'draft' ? 'draft' : 'ask';
  const messages = (body.messages ?? [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-24);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json(400, { error: 'empty', message: 'Ask a question first.' });

  let snapshot: Awaited<ReturnType<typeof getLiveSnapshotText>>;
  try { snapshot = await getLiveSnapshotText(); }
  catch (e: unknown) { return json(502, { error: 'snapshot', message: `Could not read project data: ${e instanceof Error ? e.message : 'unknown error'}` }); }

  const system = `${SYSTEM_BASE}\n\nMODE: ${mode}.\n\nPROJECT SNAPSHOT:\n${snapshot.text}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(sse({ ...snapshot.counts, generatedAt: new Date().toISOString() }, 'context')));
      try {
        const resp = anthropic.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: mode === 'draft' ? 1200 : 700,
          system,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        });
        req.signal.addEventListener('abort', () => resp.abort());

        for await (const event of resp) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(sse({ text: event.delta.text }, 'delta')));
          }
        }
        const final = await resp.finalMessage();
        controller.enqueue(encoder.encode(sse({ usage: final.usage, stop_reason: final.stop_reason }, 'done')));
      } catch (err: unknown) {
        if (!req.signal.aborted) controller.enqueue(encoder.encode(sse({ error: err instanceof Error ? err.message : 'unknown' }, 'error')));
      } finally {
        try { controller.close(); } catch { /* already closed by abort */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
