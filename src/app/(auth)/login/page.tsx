'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Read ?next= without useSearchParams (avoids the static-export bailout).
  function nextPath() {
    if (typeof window === 'undefined') return '/dashboard';
    return new URLSearchParams(window.location.search).get('next') || '/dashboard';
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) { setMsg({ kind: 'err', text: error.message }); return; }
    setStep('code');
    setMsg({ kind: 'ok', text: 'Check your email for the 6-digit code.' });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(), token: code.trim(), type: 'email',
    });
    setBusy(false);
    if (error) { setMsg({ kind: 'err', text: error.message }); return; }
    router.push(nextPath());
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 hero-ambient">
      <GlassPanel radius="hero" elev={4} className="w-full max-w-[420px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-bark to-[#2A3E2C] text-cream p-7">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[10px] bg-gradient-to-br from-cream to-olive-mist text-bark grid place-items-center font-display text-xl font-semibold">V</div>
            <div>
              <div className="font-display text-[20px] leading-none">Villa Ajloun</div>
              <div className="text-[10px] tracking-eyebrow uppercase text-sand mt-1">Construction Programme</div>
            </div>
          </div>
          <div className="font-display text-[28px] font-light mt-5">Sign in</div>
          <div className="text-[12.5px] text-sand mt-1">
            {step === 'email' ? 'Enter your email to receive a one-time code.' : 'Enter the 6-digit code we emailed you.'}
          </div>
        </div>

        <div className="p-7">
          {msg && (
            <div className={`mb-4 rounded-xl px-3 py-2.5 text-[12.5px] ${msg.kind === 'ok'
              ? 'bg-olive/12 text-[#3F6B45] border border-olive/30'
              : 'bg-iron/12 text-[#8A3E4E] border border-iron/30'}`}>{msg.text}</div>
          )}

          {step === 'email' ? (
            <form onSubmit={sendCode} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Eyebrow>Email address</Eyebrow>
                <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[14px] outline-none focus:border-olive" />
              </div>
              <button disabled={busy} className="rounded-xl bg-bark text-cream py-3 text-[13.5px] font-semibold disabled:opacity-50">
                {busy ? 'Sending…' : 'Send sign-in code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Eyebrow>6-digit code</Eyebrow>
                <input inputMode="numeric" required autoFocus value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••" maxLength={6}
                  className="num rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[24px] text-center tracking-[0.5em] font-semibold outline-none focus:border-olive" />
              </div>
              <button disabled={busy} className="rounded-xl bg-bark text-cream py-3 text-[13.5px] font-semibold disabled:opacity-50">
                {busy ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button type="button" onClick={() => { setStep('email'); setMsg(null); }}
                className="text-[12px] text-stone hover:text-bark">← Use a different email</button>
            </form>
          )}
          <p className="text-[11.5px] text-stone text-center mt-5 leading-relaxed">
            Access is restricted to invited team members.<br />Contact the project administrator for access.
          </p>
        </div>
      </GlassPanel>
    </main>
  );
}
