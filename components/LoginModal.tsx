
import React, { useState } from 'react';
import { db } from '../api/database';

interface LoginModalProps {
  onLogin: (success: boolean) => void;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await db.auth.signIn(username, password);
      if (result.success) {
        onLogin(true);
      } else {
        setError(result.error || 'Authentication failed.');
      }
    } catch (err) {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 md:p-10 border border-gray-100 transform animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[#414042] tracking-tight">Admin Console</h2>
            <div className="h-1 w-12 bg-[#C80A37] rounded-full"></div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[#C80A37] transition-colors p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Admin ID (Email)</label>
            <input 
              type="email" 
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#C80A37]/20 focus:border-[#C80A37] outline-none transition-all disabled:bg-gray-50 font-medium"
              placeholder="name@bellows-systems.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Security Credentials</label>
            <input 
              type="password" 
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#C80A37]/20 focus:border-[#C80A37] outline-none transition-all disabled:bg-gray-50 font-medium"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-3 text-[#C80A37] text-sm font-bold bg-red-50 p-4 rounded-xl border border-red-100 animate-in shake">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span>{error}</span>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#C80A37] hover:bg-[#a0082c] text-white py-4 md:py-5 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-red-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Authorize Access'}
          </button>
        </form>
        
        <p className="mt-8 text-center text-xs text-gray-400 font-medium">
          Protected by Enterprise-Grade Encryption
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
