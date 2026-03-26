import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import DarkVeil from '../../../components/DarkVeil';
import { ShieldAlert, ArrowRight, Loader, UserCog, User } from 'lucide-react';
import authService from '../../../services/authService';
import { BackToHomeLink } from './BackToHomeLink';

export function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'info' | 'role'>('info');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [roleData, setRoleData] = useState({
    role: 'user' as 'user' | 'staff',
    specialization: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateInfo = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateInfo()) {
      setStep('role');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (roleData.role === 'staff' && !roleData.specialization.trim()) {
      setError('Specialization is required for staff members');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: roleData.role,
        specialization: roleData.specialization || undefined,
      });
      const kind = result.outcome === 'staff_application_submitted' ? 'staff' : 'user'
      navigate(`/login?registered=${encodeURIComponent(kind)}`, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
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

          {step === 'info' ? (
            <>
              <div className="mb-8">
                <h2 className="text-white mb-1" style={{ fontWeight: 700 }}>Create your account</h2>
                <p className="text-white/60 text-sm">Step 1 of 2: Basic information</p>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm text-white/80 mb-1.5" style={{ fontWeight: 500 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInfoChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors bg-white/10 backdrop-blur"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/80 mb-1.5" style={{ fontWeight: 500 }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInfoChange}
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
                    name="password"
                    value={formData.password}
                    onChange={handleInfoChange}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-2.5 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors bg-white/10 backdrop-blur"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/80 mb-1.5" style={{ fontWeight: 500 }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInfoChange}
                    placeholder="Confirm your password"
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
                  type="button"
                  onClick={handleNextStep}
                  className="w-full bg-black text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="text-center text-xs text-white/60 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-red-400 hover:text-red-300 hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-white mb-1" style={{ fontWeight: 700 }}>Choose your role</h2>
                <p className="text-white/60 text-sm">Step 2 of 2: Select your role and specialization</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-3">
                  <label className="block text-sm text-white/80" style={{ fontWeight: 500 }}>
                    Role
                  </label>

                  {/* User Role */}
                  <button
                    type="button"
                    onClick={() => {
                      setRoleData({ ...roleData, role: 'user', specialization: '' });
                      setError('');
                    }}
                    className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                      roleData.role === 'user'
                        ? 'border-white/40 bg-white/10 backdrop-blur'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-red-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Regular User</p>
                        <p className="text-xs text-white/60">Submit and track complaints</p>
                      </div>
                    </div>
                  </button>

                  {/* Staff Role */}
                  <button
                    type="button"
                    onClick={() => {
                      setRoleData({ ...roleData, role: 'staff' });
                      setError('');
                    }}
                    className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                      roleData.role === 'staff'
                        ? 'border-white/40 bg-white/10 backdrop-blur'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserCog className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Staff Member</p>
                        <p className="text-xs text-white/60">Resolve assigned complaints</p>
                      </div>
                    </div>
                  </button>
                </div>

                {roleData.role === 'staff' && (
                  <div>
                    <label className="block text-sm text-white/80 mb-1.5" style={{ fontWeight: 500 }}>
                      Specialization(s) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={roleData.specialization}
                      onChange={e => {
                        setRoleData({ ...roleData, specialization: e.target.value });
                        setError('');
                      }}
                      placeholder="e.g., Technical Support, Billing, Account & Access"
                      className="w-full px-4 py-2.5 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors bg-white/10 backdrop-blur"
                      required={roleData.role === 'staff'}
                    />
                    <p className="text-xs text-white/50 mt-1.5">Separate multiple specializations with commas</p>
                    <p className="mt-2 text-xs text-amber-200/90">
                      Staff signups are reviewed by an administrator. You will not be able to sign in until your
                      application is approved (you may receive an email when a decision is made).
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-600/10 backdrop-blur border border-red-500/30 rounded-lg">
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('info');
                      setError('');
                    }}
                    className="flex-1 border-2 border-white/20 text-white py-2.5 rounded-xl text-sm hover:border-white/40 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-black text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontWeight: 600 }}
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <p className="text-center text-xs text-white/60 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-red-400 hover:text-red-300 hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
