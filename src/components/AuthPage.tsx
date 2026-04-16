import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { AlertTriangle, LogIn, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';

interface AuthPageProps {
  mode: 'login' | 'signup';
  onToggle: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onToggle }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = window.location.origin + (mode === 'login' ? '/auth/login' : '/auth/signup');
    const body = mode === 'login' ? { email, password } : { name, email, password };

    console.log(`[AUTH] Mode: ${mode}, URL: ${window.location.href}, Origin: ${window.location.origin}, Endpoint: ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body),
      });

      console.log(`[AUTH] Response Status: ${response.status} ${response.statusText}`);

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        if (response.status === 405) {
          throw new Error(`Server configuration error (405). Please refresh the page and try again. If the issue persists, contact support.`);
        }
        throw new Error(data.error || 'Authentication failed');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bento-card w-full max-w-md p-8 shadow-2xl shadow-accent-blue/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="text-2xl font-bold tracking-tighter flex items-center gap-1 mb-2">
            IRCC<span className="text-accent-red">.MONITOR</span>
          </div>
          <h2 className="text-lg font-bold text-text-main uppercase tracking-widest">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs text-text-muted mt-1">
            {mode === 'login' ? 'Access your immigration data pipeline' : 'Join the real-time monitoring system'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-3 bg-accent-red/10 border border-accent-red/20 rounded-xl text-red-300 text-xs flex items-center gap-3"
          >
            <AlertTriangle size={16} className="text-accent-red flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main focus:ring-1 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main focus:ring-1 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main focus:ring-1 focus:ring-accent-blue focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent-blue text-white rounded-xl py-3 font-bold text-sm hover:bg-accent-blue/90 transition-all shadow-lg shadow-accent-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-card-border text-center space-y-4">
          <button 
            onClick={onToggle}
            className="text-xs font-bold text-text-muted hover:text-accent-blue transition-colors block w-full"
          >
            {mode === 'login' ? "DON'T HAVE AN ACCOUNT? SIGN UP" : "ALREADY HAVE AN ACCOUNT? SIGN IN"}
          </button>

          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-[10px] text-text-muted/50 hover:text-text-muted transition-colors uppercase tracking-widest"
          >
            {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>

          {showDebug && (
            <div className="text-left bg-black/20 p-3 rounded-lg font-mono text-[10px] text-text-muted overflow-x-auto">
              <p>Origin: {window.location.origin}</p>
              <p>Endpoint: {window.location.origin + (mode === 'login' ? '/auth/login' : '/auth/signup')}</p>
              <p>Status: <span className="text-green-500">Connected</span></p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
