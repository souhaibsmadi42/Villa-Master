/**
 * POST /api/assistant
 * Body: { messages: [{ role: 'user'|'assistant', content: string }], mode?: 'ask'|'draft' }
 * Streams Server-Sent Events: "event: delta\ndata: {text...}\n\n" then "event: done\ndata: {}\n\n".
 *
 * Project-aware: we inject a snapshot of the current project into the system prompt
 * so the assistant can answer "what's blocked this week?" without tools.
 */
import { NextRequest } from 'next/server';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { DEMO_SNAPSHOT, snapshotForSystem } from '@/lib/project-context';

export const runtime = 'nodejs';

const SYSTEM_BASE = `You are the Villa Ajloun construction intelligence assistant.
You speak with calm authority: short declarative sentences, specific names, dates, and numbers.
Tone: editorial, owner-respectful, never breathless. Avoid emoji and exclamation marks.

You have a project snapshot below. Treat it as ground truth for the current state
of the project. If asked something the snapshot cannot answer, say so plainly and
suggest the smallest next step.

When the user is in "draft" mode, you write deliverable artefacts:
- weekly owner updates (3 paragraphs, ~180 words, no bullet vomit)
- contractor RFI replies (one paragraph, direct, no hedging)
- decision summaries (one short paragraph + the three options on the table)

When the user is in "ask" mode, you answer questions about the project. Prefer
2–5 short sentences. Cite the contractor or deliverable by name when relevant.

PROJECT SNAPSHOT:
${snapshotForSystem(DEMO_SNAPSHOT)}
`;

function sse(data: object, event = 'message') {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'config', message: 'ANTHROPIC_API_KEY is not set on the server.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { messages?: Array<{ role: 'user' | 'assistant'; content: string }>; mode?: 'ask' | 'draft' };
  try { body = await req.json(); }
  catch { return new Response('Bad JSON', { status: 400 }); }

  const mode = body.mode === 'draft' ? 'draft' : 'ask';
  const messages = (body.messages ?? []).slice(-24);
  if (!messages.length) return new Response('Empty', { status: 400 });

  const system = SYSTEM_BASE + `\n\nMODE: ${mode}.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const resp = await anthropic.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: mode === 'draft' ? 1200 : 600,
          system,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        });

        for await (const event of resp) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(sse({ text: event.delta.text }, 'delta')));
          }
        }
        const final = await resp.finalMessage();
        controller.enqueue(encoder.encode(sse({
          usage: final.usage,
          stop_reason: final.stop_reason,
        }, 'done')));
        controller.close();
      } catch (err: any) {
        controller.enqueue(encoder.encode(sse({ error: err?.message ?? 'unknown' }, 'error')));
        controller.close();
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
