
import React, { useState } from 'react';
import { User } from '../types';

interface ResetConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: User | null;
}

export const ResetConfirmation: React.FC<ResetConfirmationProps> = ({ isOpen, onClose, onConfirm, user }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleVerifyAndReset = () => {
    if (email === user?.email && password.length >= 6) { // Basic password length check for demo
      onConfirm();
      setEmail('');
      setPassword('');
      setError('');
    } else {
      setError('Invalid credentials. Access denied.');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <i className="fas fa-database text-red-600 text-2xl"></i>
          </div>
          <h3 className="text-xl font-black text-gray-900">Reset Semester Data?</h3>
          <p className="text-gray-500 text-sm mt-2">
            This action will <strong>permanently delete</strong> all attendance records and sessions. This cannot be undone.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Verify Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm transition-all"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold flex items-center space-x-2">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col space-y-3 pt-4">
            <button 
              onClick={handleVerifyAndReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-sm"
            >
              Wipe All Data
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
