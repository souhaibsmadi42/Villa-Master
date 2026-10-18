import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  // We don't throw here so the build doesn't fail on environments without the key —
  // the API routes fall back to built-in answers at request time.
  console.warn('[anthropic] ANTHROPIC_API_KEY is not set');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';

/** Reads the API's own error message out of an SDK error, without the raw JSON. */
function apiMessage(err: InstanceType<typeof Anthropic.APIError>) {
  const body = err.error as { error?: { message?: string } } | undefined;
  return body?.error?.message ?? err.message;
}

/**
 * When the AI account itself is unusable (bad key, no permission, no credit, unknown model)
 * returns a short reason, so callers can fall back to built-in answers. Otherwise null.
 */
export function aiUnavailableReason(err: unknown): string | null {
  if (err instanceof Anthropic.AuthenticationError) return 'The AI key configured on this server was rejected.';
  if (err instanceof Anthropic.PermissionDeniedError) return 'The AI key on this server does not have access to the API.';
  if (err instanceof Anthropic.NotFoundError && /model/i.test(apiMessage(err))) return `The configured AI model (${ANTHROPIC_MODEL}) is not available.`;
  if (err instanceof Anthropic.APIError && /credit balance|billing/i.test(apiMessage(err))) return 'The AI account is out of credit.';
  return null;
}

/** A short, human-readable message for any other failure. */
export function aiErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return 'Claude is receiving too many requests right now — try again in a moment.';
  if (err instanceof Anthropic.APIError && (err.status === 529 || (err.status ?? 0) >= 500)) return 'Claude is temporarily unavailable — try again shortly.';
  if (err instanceof Anthropic.APIError) return apiMessage(err);
  return err instanceof Error ? err.message : 'Unknown error';
}
