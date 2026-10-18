'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Moon, Sun } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Elevation } from '@/components/scenes/Elevation';
import { Button } from '@/components/ui/Button';
import { ease } from '@/motion/tokens';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggle } = useTheme();

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
    setMsg({ kind: 'ok', text: `We sent a 6-digit code to ${email.trim().toLowerCase()}.` });
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
    <main className="grid min-h-[100svh] lg:grid-cols-[1.15fr_1fr]">
      {/* Cinematic side */}
      <section className="relative hidden overflow-hidden bg-[#0D0E0C] lg:block" aria-hidden>
        <motion.div className="absolute inset-0" initial={{ clipPath: 'inset(46% 0 46% 0)' }} animate={{ clipPath: 'inset(0% 0 0% 0)' }} transition={{ duration: 1.2, ease: ease.cinematic }}>
          <Elevation className="h-full w-full" frame="wide" align="xMaxYMid" />
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,14,12,.55),rgba(13,14,12,0)_35%,rgba(13,14,12,.85))]" />
        <div className="grain absolute inset-0" />
        <div className="absolute inset-x-0 top-0 p-10">
          <Link href="/" className="display text-[22px] text-chalk">Villa <em className="italic text-bronze">Master</em></Link>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-10">
          <div className="display max-w-[16ch] text-[clamp(40px,4vw,60px)] leading-[0.95] text-chalk">Every detail. <em className="italic text-bronze">Under control.</em></div>
          <div className="eyebrow mt-5 text-stone/80">Villa Ajloun · Ajloun, Jordan</div>
        </div>
      </section>

      {/* Form side */}
      <section className="relative flex flex-col bg-canvas px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"><ArrowLeft size={14} /> Villa Master</Link>
          <button onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} className="grid h-9 w-9 place-items-center rounded-[8px] text-muted hover:bg-ink/[0.05] hover:text-ink">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-16">
          <div className="eyebrow flex items-center gap-2"><span className="h-px w-4 bg-current opacity-50" />Project access</div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease: ease.swoop }}>
              <h1 className="display mt-4 text-[44px] text-ink">{step === 'email' ? <>Sign <em className="italic text-accent">in</em></> : <>Check your <em className="italic text-accent">inbox</em></>}</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                {step === 'email' ? 'Enter your email and we’ll send a one-time code. No passwords.' : 'Enter the 6-digit code from the email to continue.'}
              </p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {msg && (
              <motion.div role={msg.kind === 'err' ? 'alert' : 'status'} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className={`mt-6 rounded-[10px] border px-3.5 py-2.5 text-[12.5px] ${msg.kind === 'ok' ? 'border-success/25 bg-success/[0.07] text-success' : 'border-critical/25 bg-critical/[0.07] text-critical'}`}>{msg.text}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {step === 'email' ? (
            <form onSubmit={sendCode} className="mt-7 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="label">Email address</span>
                <input type="email" required autoFocus autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="field h-11 text-[14px]" />
              </label>
              <Button type="submit" variant="primary" size="lg" loading={busy} iconRight={!busy ? <ArrowRight size={15} /> : undefined}>{busy ? 'Sending code' : 'Send sign-in code'}</Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-7 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="label">6-digit code</span>
                <input inputMode="numeric" autoComplete="one-time-code" required autoFocus value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" maxLength={6}
                  className="field num h-14 text-center text-[26px] tracking-[0.5em]" />
              </label>
              <Button type="submit" variant="primary" size="lg" loading={busy} disabled={code.length < 6}>{busy ? 'Verifying' : 'Verify & sign in'}</Button>
              <button type="button" onClick={() => { setStep('email'); setMsg(null); setCode(''); }} className="text-[12.5px] text-muted hover:text-ink">← Use a different email</button>
            </form>
          )}

          <p className="mt-10 border-t border-line pt-5 text-[12px] leading-relaxed text-faint">
            Access is limited to invited team members. Contact the project administrator if you need access.
          </p>
        </div>
      </section>
    </main>
  );
}
