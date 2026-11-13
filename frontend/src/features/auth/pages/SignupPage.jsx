import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useNotification } from '../../../context/NotificationContext.jsx';
import { Lock, Mail, User, Phone, School, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    school_name: '',
    password: '',
    confirmPassword: '',
    consent: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const navigate = useNavigate();
  const { signup } = useAuth();
  const { showError, showSuccess, showLoading } = useNotification();

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }
    if (!formData.school_name.trim()) errors.school_name = 'School / Institution name is required';
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.consent) {
      errors.consent = 'You must acknowledge the terms and student privacy guidelines';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!validate()) {
      showError('Please correct the errors in the form');
      return;
    }

    setIsLoading(true);
    const toastId = showLoading('Creating your staff account...');

    try {
      const result = await signup({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: 'staff', // Enforced staff role
        phone: formData.phone.trim() || null,
        school_name: formData.school_name.trim(),
      });

      if (result.success) {
        showSuccess('Staff account registered successfully! Redirecting...');
        setTimeout(() => navigate('/'), 300);
      } else {
        showError(result.error || 'Failed to create account');
      }
    } catch (error) {
      showError(error.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden py-10">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-xl">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/50">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-lg shadow-emerald-500/20 mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Staff Registration
            </h1>
            <p className="text-xs uppercase tracking-wider font-semibold text-emerald-400 mt-1">
              Santulita PM POSHAN System
            </p>
            <p className="text-slate-400 text-xs mt-1.5 max-w-md mx-auto">
              Join your school's mid-day meal nutrition tracking & dietary monitoring team
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            
            {/* Row 1: Full Name & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Smt. Ananya Sharma"
                    className={`w-full bg-slate-950/60 border ${validationErrors.name ? 'border-red-500' : 'border-slate-700/80'} rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.name && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {validationErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Work Email & School Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Official Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="staff@school.gov.in"
                    className={`w-full bg-slate-950/60 border ${validationErrors.email ? 'border-red-500' : 'border-slate-700/80'} rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {validationErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  School / Institution *
                </label>
                <div className="relative">
                  <School className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input
                    type="text"
                    value={formData.school_name}
                    onChange={(e) => handleChange('school_name', e.target.value)}
                    placeholder="Govt. Model Primary School"
                    className={`w-full bg-slate-950/60 border ${validationErrors.school_name ? 'border-red-500' : 'border-slate-700/80'} rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.school_name && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {validationErrors.school_name}
                  </p>
                )}
              </div>
            </div>

            {/* Role Notice */}
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-400">Assigned Role: School Staff Member</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Authorized for meal distribution tracking, student registry, and report access
                </p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                Staff
              </span>
            </div>

            {/* Row 3: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Min. 6 characters"
                    className={`w-full bg-slate-950/60 border ${validationErrors.password ? 'border-red-500' : 'border-slate-700/80'} rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {validationErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full bg-slate-950/60 border ${validationErrors.confirmPassword ? 'border-red-500' : 'border-slate-700/80'} rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} /> {validationErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Consent checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 text-xs text-slate-400 hover:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.consent}
                  onChange={(e) => handleChange('consent', e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                />
                <span>
                  I confirm I am an authorized school representative and agree to uphold student health data privacy in accordance with PM POSHAN operational guidelines.
                </span>
              </label>
              {validationErrors.consent && (
                <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} /> {validationErrors.consent}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registering Account...
                </span>
              ) : (
                'Complete Registration'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors underline-offset-4 hover:underline ml-1"
              >
                Sign In to Santulita
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SignupPage;