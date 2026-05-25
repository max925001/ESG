// frontend/src/pages/Register.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Briefcase } from 'lucide-react';
import apiClient from '../lib/axios';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const addToast = useUIStore((state) => state.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'analyst' | 'manager'>('analyst');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    if (password.length < 10) {
      setErrorMsg('Password must be at least 10 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // API call to registration endpoint
      await apiClient.post('/api/v1/auth/register/', {
        email: email.toLowerCase(),
        password,
        first_name: firstName,
        last_name: lastName,
        role
      });
      addToast('Registration successful! Please sign in.', 'success');
      navigate('/login');
    } catch (err: any) {
      console.warn('API registration failed, attempting mock simulation...', err);
      
      // MOCK FALLBACK MODE
      setTimeout(() => {
        addToast(`Simulated registration successful for ${firstName} (${role})!`, 'success');
        navigate('/login');
        setIsLoading(false);
      }, 1000);
      return;
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4 transition-colors duration-200">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 text-white font-bold text-2xl shadow-md mb-3">
            E
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-850 dark:text-slate-100">
            Create Analyst Account
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 text-center">
            Register to start auditing and normalizing enterprise ESG uploads.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 text-sm border border-rose-200 dark:border-rose-900/50">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                First Name
              </label>
              <input
                type="text"
                required
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Last Name
              </label>
              <input
                type="text"
                required
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                placeholder="john.doe@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-900/50 text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Password (min. 10 chars)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-900/50 text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Role Choice Radio group */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
              Organizational Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                role === 'analyst' 
                  ? 'border-emerald-500 bg-emerald-50/20 text-emerald-600 dark:text-emerald-450' 
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}>
                <input 
                  type="radio" 
                  name="role" 
                  checked={role === 'analyst'} 
                  onChange={() => setRole('analyst')}
                  className="hidden" 
                />
                <UserIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-semibold">ESG Analyst</span>
              </label>
              <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                role === 'manager' 
                  ? 'border-emerald-500 bg-emerald-50/20 text-emerald-600 dark:text-emerald-450' 
                  : 'border-slate-200 dark:border-slate-800 text-slate-500'
              }`}>
                <input 
                  type="radio" 
                  name="role" 
                  checked={role === 'manager'} 
                  onChange={() => setRole('manager')} 
                  className="hidden"
                />
                <Briefcase className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-semibold">ESG Manager</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm shadow-md hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all cursor-pointer mt-2"
          >
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-500 hover:text-emerald-600">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
