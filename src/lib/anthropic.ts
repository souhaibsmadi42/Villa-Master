import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  // We don't throw here so the build doesn't fail on environments without the key —
  // the API route will return a clear error at request time.
  console.warn('[anthropic] ANTHROPIC_API_KEY is not set');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
