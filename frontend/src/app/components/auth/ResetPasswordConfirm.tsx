import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ShieldAlert, Loader, ArrowRight } from 'lucide-react';
import DarkVeil from '../../../components/DarkVeil';
import authService from '../../../services/authService';
import { BackToHomeLink } from './BackToHomeLink';

type TokenState = 'checking' | 'valid' | 'invalid';

export function ResetPasswordConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get('token') ?? '').trim(), [searchParams]);

  const [tokenState, setTokenState] = useState<TokenState>('checking');
  const [tokenMessage, setTokenMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenState('invalid');
      setTokenMessage('This reset link is invalid. Please request a new one from the login page.');
      return;
    }

    let cancelled = false;

    const validateToken = async () => {
      setTokenState('checking');
      try {
        const message = await authService.validatePasswordResetToken(token);
        if (!cancelled) {
          setTokenState('valid');
          setTokenMessage(message);
        }
      } catch (err: any) {
        if (!cancelled) {
          setTokenState('invalid');
          setTokenMessage(err.message || 'This reset link is invalid or expired.');
        }
      }
    };

    void validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.completePasswordReset(token, newPassword);
      navigate('/login?reset=done', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please request a new reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-dvh max-h-dvh w-full max-w-[100vw] flex-col overflow-hidden bg-white/5 backdrop-blur lg:flex-row">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <DarkVeil hueShift={237} />
      </div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center px-8 py-10 md:px-16 lg:px-20 lg:py-12">
          <div className="mx-auto w-full max-w-md">
            <BackToHomeLink className="mb-6" />

            <div className="mb-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-600">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <h2 className="mb-1 text-white" style={{ fontWeight: 700 }}>
                Reset your password
              </h2>
              <p className="text-sm text-white/60">
                Confirmed. Set a new password for your account.
              </p>
            </div>

            {tokenState === 'checking' && (
              <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-white/75">
                <div className="flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin" />
                  Verifying reset link...
                </div>
              </div>
            )}

            {tokenState === 'invalid' && (
              <div className="space-y-4 rounded-xl border border-red-500/30 bg-red-600/10 p-4">
                <p className="text-sm text-red-200">{tokenMessage || 'This reset link is invalid or expired.'}</p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white transition-colors hover:bg-red-600"
                  style={{ fontWeight: 600 }}
                >
                  Back to login
                </Link>
              </div>
            )}

            {tokenState === 'valid' && (
              <>
                <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="text-xs text-emerald-200">{tokenMessage}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm text-white/80" style={{ fontWeight: 500 }}>
                      New password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => {
                        setNewPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Enter new password"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 transition-colors focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm text-white/80" style={{ fontWeight: 500 }}>
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Re-enter new password"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 transition-colors focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-600/10 p-3">
                      <p className="text-xs text-red-300">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-2.5 text-sm text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ fontWeight: 600 }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      <>
                        Save new password
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
