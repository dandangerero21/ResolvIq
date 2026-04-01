import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import DarkVeil from '../../../components/DarkVeil';
import { ShieldAlert, ArrowRight, Loader } from 'lucide-react';
import authService from '../../../services/authService';
import { BackToHomeLink } from './BackToHomeLink';

export function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const registeredParam = searchParams.get('registered');
  const registeredBanner =
    registeredParam === 'user' || registeredParam === 'staff' ? registeredParam : null;

  const dismissRegisteredBanner = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('registered');
    setSearchParams(next, { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await authService.login(email, password);
      login(user);
      
      const routes: Record<string, string> = {
        user: '/user/dashboard',
        staff: '/staff/dashboard',
        admin: '/admin/dashboard',
      };
      navigate(routes[user.role]);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-dvh max-h-dvh w-full max-w-[100vw] flex-col overflow-hidden bg-white/5 backdrop-blur lg:flex-row">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <DarkVeil hueShift={237} />
      </div>
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden lg:flex-row">
        {/* Left Panel - Transparent */}
        <div className="hidden min-h-0 min-w-0 shrink-0 flex-col justify-center px-8 md:px-16 lg:flex lg:w-[45%] lg:px-20">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-12">
              <BackToHomeLink className="mb-6" />
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-white uppercase tracking-widest font-semibold mb-8">
                Role-Based Issue Tracking
              </p>
              <h1 className="text-5xl text-white" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                Every complaint, <span className="text-red-600">resolved.</span>
              </h1>
            </div>
            <p className="text-white text-base leading-relaxed mb-6">
              A structured platform where users submit issues, staff resolve them, and admins keep everything on track.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-red-600 mt-1">•</span>
                <span className="text-white text-sm">Smart complaint routing</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 mt-1">•</span>
                <span className="text-white text-sm">Real-time chat with staff</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 mt-1">•</span>
                <span className="text-white text-sm">Solution proposal system</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 mt-1">•</span>
                <span className="text-white text-sm">Resolution history & ratings</span>
              </li>
            </ul>
          </div>
        </div>
        {/* Right Panel */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center px-8 py-10 md:px-16 lg:px-20 lg:py-12">
          <div className="mx-auto w-full max-w-md">
          <BackToHomeLink className="mb-6 lg:hidden" />
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <span className="text-white" style={{ fontWeight: 700 }}>ResolvIQ</span>
          </div>

          <div className="mb-8">
            <h2 className="text-white mb-1" style={{ fontWeight: 700 }}>Welcome back</h2>
            <p className="text-white/60 text-sm">Sign in to your account to continue</p>
          </div>


          {registeredBanner === 'user' && (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-xs text-emerald-200">
                Account created. Sign in with the email and password you just used.
              </p>
              <button
                type="button"
                onClick={dismissRegisteredBanner}
                className="mt-2 text-[11px] font-semibold text-emerald-300/90 underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
          {registeredBanner === 'staff' && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-xs text-amber-100">
                Your staff application was submitted. An administrator will review it. You will be notified by email when
                there is a decision (if email is configured). Do not try to sign in until you are approved.
              </p>
              <button
                type="button"
                onClick={dismissRegisteredBanner}
                className="mt-2 text-[11px] font-semibold text-amber-200/90 underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-white/80 mb-1.5" style={{ fontWeight: 500 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors bg-white/10 backdrop-blur"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1.5" style={{ fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
              className="w-full px-4 py-2.5 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors bg-white/10 backdrop-blur"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-600/10 backdrop-blur border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontWeight: 600 }}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/60 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-red-400 hover:text-red-300 hover:underline font-semibold">
              Sign up
            </Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
