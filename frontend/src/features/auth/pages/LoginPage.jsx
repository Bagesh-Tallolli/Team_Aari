import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useNotification } from '../../../context/NotificationContext.jsx';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, HeartHandshake, HelpCircle } from 'lucide-react';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showDemoHelp, setShowDemoHelp] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const { showError, showSuccess, showLoading } = useNotification();

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('santulita_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    const toastId = showLoading('Signing in to Santulita...');

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('santulita_remembered_email', email.trim());
        } else {
          localStorage.removeItem('santulita_remembered_email');
        }
        showSuccess('Welcome back! Login successful.');
        setTimeout(() => navigate('/'), 150);
      } else {
        showError(result.error || 'Invalid email or password');
      }
    } catch (error) {
      showError(error.message || 'An unexpected error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setShowDemoHelp(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background subtle glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50">
          
          {/* Header & Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-lg shadow-emerald-500/20 mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Santulita
            </h1>
            <p className="text-xs uppercase tracking-wider font-semibold text-emerald-400 mt-1">
              Mid-Day Meal Nutrition Assurance
            </p>
            <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">
              Automated nutrition tracking & AI dietary assessment for PM POSHAN schools
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@school.gov.in"
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1 pb-1">
              <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                />
                Remember email
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              New school staff member?{' '}
              <Link
                to="/signup"
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors underline-offset-4 hover:underline ml-1"
              >
                Register Staff Account
              </Link>
            </p>
          </div>

          {/* Dev / Demo Helper (Non-intrusive collapsible) */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowDemoHelp(!showDemoHelp)}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-400 transition-colors"
            >
              <HelpCircle size={12} />
              <span>Development demo credentials</span>
            </button>
            {showDemoHelp && (
              <div className="mt-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-left text-xs space-y-2 text-slate-400 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-300">Admin Account</p>
                    <p className="text-[11px] text-slate-500">admin@nutrition.com</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('admin@nutrition.com', 'password123')}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition-colors"
                  >
                    Use
                  </button>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                  <div>
                    <p className="font-semibold text-slate-300">Staff Account</p>
                    <p className="text-[11px] text-slate-500">staff@nutrition.com</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('staff@nutrition.com', 'password123')}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-6 flex items-center justify-center gap-1.5">
          <HeartHandshake size={14} className="text-emerald-500" />
          PM POSHAN National School Meal Quality Assurance
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Lock size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Password Reset Assistance</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              For security compliance with school nutrition and student health data, credentials are managed by your Institution Administrator. Please reach out to your school admin to reset your credentials.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;