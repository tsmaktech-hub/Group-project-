
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthViewProps {
  mode: 'login' | 'signup';
  onAuth: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ mode, onAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlaceholder = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your_supabase_project_url';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlaceholder) {
      setError('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
      return;
    }
    setLoading(true);
    setError(null);
    
    try {
      if (mode === 'signup') {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role: 'lecturer'
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // We rely on a database trigger to create the profile record.
          // This avoids RLS issues with unconfirmed emails.
          onAuth({
            id: authData.user.id,
            name,
            email,
            role: 'lecturer'
          });
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profileError) throw profileError;

          onAuth({
            id: authData.user.id,
            name: profile.name,
            email,
            role: profile.role
          });
        }
      }
    } catch (err: any) {
      let message = err.message || 'An error occurred during authentication';
      if (message === 'Invalid login credentials') {
        message = 'Invalid email or password. If you just signed up, please check your email for a confirmation link (or disable "Confirm Email" in your Supabase Auth settings).';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 text-white p-4 rounded-2xl mb-4 shadow-lg">
            <i className="fas fa-id-badge text-3xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AttendX Institutional</h1>
          <p className="text-gray-500 mt-2 text-center">
            {mode === 'login' ? 'Welcome back, lecturer. Sign in to your dashboard.' : 'Create your lecturer account to get started.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center space-x-3">
            <i className="fas fa-exclamation-circle flex-shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <i className="fas fa-user"></i>
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="e.g. Dr. Jane Doe"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <i className="fas fa-envelope"></i>
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="lecturer@university.edu"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <i className="fas fa-lock"></i>
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <i className="fas fa-circle-notch fa-spin"></i>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <i className="fas fa-arrow-right"></i>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-500 text-sm">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <Link to={mode === 'login' ? '/signup' : '/'} className="text-blue-600 font-bold hover:underline">
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </Link>
          </p>
        </div>
      </div>
      <p className="mt-8 text-blue-600 text-xs font-bold uppercase tracking-widest opacity-60">
        Engineered by SIENA Group
      </p>
    </div>
  );
};
