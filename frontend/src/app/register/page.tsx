'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [validationError, setValidationError] = useState('');
  
  const { register, error, clearError, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (validationError) setValidationError('');
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await register({
        email: formData.email,
        username: formData.username,
        displayName: formData.displayName,
        password: formData.password
      });
      router.push('/dashboard');
    } catch (err) {
      // Error handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="background-orb orb-1"></div>
        <div className="background-orb orb-2"></div>
        <div className="background-orb orb-3"></div>
      </div>
      
      <div className="login-content animate-in">
        <div className="login-header">
          <div className="login-logo">
            <span className="login-icon">💰</span>
            <h1>FairShare</h1>
          </div>
          <p className="login-tagline">Create an account to start splitting.</p>
        </div>
        
        <div className="glass-card login-card">
          <form onSubmit={handleSubmit} className="form-group" style={{ gap: '1.25rem' }}>
            {(error || validationError) && (
              <div className="toast toast-error animate-fade" style={{ position: 'relative', top: 0, right: 0, width: '100%' }}>
                {error || validationError}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input
                type="text"
                name="displayName"
                className="form-input"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="e.g. Aisha"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  name="username"
                  className="form-input"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="aisha123"
                  required
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="aisha@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting || !formData.email}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {isSubmitting ? <span className="spinner spinner-sm"></span> : 'Create Account'}
            </button>
            
            <div className="text-center mt-2">
              <Link href="/login" className="text-sm text-muted">
                Already have an account? <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign in</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
