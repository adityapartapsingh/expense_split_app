'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function LoginForm() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, clearError, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) return;
    
    setIsSubmitting(true);
    try {
      await login(loginId, password);
      router.push('/dashboard');
    } catch (err) {
      // Error is handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card login-card">
      <form onSubmit={handleSubmit} className="form-group" style={{ gap: '1.5rem' }}>
        {error && (
          <div className="toast toast-error animate-fade" style={{ position: 'relative', top: 0, right: 0, width: '100%', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">Email or Username</label>
          <input
            type="text"
            className="form-input"
            value={loginId}
            onChange={(e) => {
              setLoginId(e.target.value);
              if (error) clearError();
            }}
            placeholder="e.g. aisha or aisha@example.com"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) clearError();
            }}
            placeholder="••••••••"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={isSubmitting || !loginId || !password}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {isSubmitting ? <span className="spinner spinner-sm"></span> : 'Sign In'}
        </button>
        
        <div className="text-center mt-4">
          <Link href="/register" className="text-sm text-muted">
            Don't have an account? <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign up</span>
          </Link>
        </div>
      </form>
    </div>
  );
}
