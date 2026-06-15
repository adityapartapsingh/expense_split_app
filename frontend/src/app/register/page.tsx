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

  // Password validation checks
  const pwd = formData.password;
  const checks = {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd)
  };
  const isPasswordValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    
    if (!isPasswordValid) {
      setValidationError('Please meet all password requirements');
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

  const handleSocialAuth = (provider: string) => {
    alert(`${provider} login coming soon! Need to configure OAuth secrets.`);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex font-sans text-text-main">
      {/* Left side: Image (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-bg-secondary">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-bg-primary via-transparent to-transparent opacity-80" />
        <img 
          src="/login-banner.png" 
          alt="Abstract tech background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 mt-auto p-12 text-white">
          <Link href="/" className="inline-block mb-6">
            <span className="text-3xl font-black tracking-tight text-white drop-shadow-md">Expense2Split</span>
          </Link>
          <h2 className="text-5xl font-black tracking-tight mb-4 drop-shadow-md">Split expenses.<br/>Stay fair.</h2>
          <p className="text-xl opacity-90 max-w-md drop-shadow-md">Join thousands of groups managing their shared finances elegantly without the hassle of manual math.</p>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md animate-in">
          
          <div className="lg:hidden mb-8 text-center">
            <Link href="/">
              <h1 className="text-3xl font-black tracking-tight text-text-main">Expense2Split</h1>
            </Link>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-2">Create an account</h2>
            <p className="text-text-muted">Get started for free today.</p>
          </div>

          <div className="flex gap-4 mb-6">
            <button onClick={() => handleSocialAuth('Google')} type="button" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-input transition-colors font-bold text-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/><path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 01-6.723-4.806L1.24 17.35A11.99 11.99 0 0012 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987z"/><path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21z"/><path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 014.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 000 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z"/></svg>
              Google
            </button>
            <button onClick={() => handleSocialAuth('GitHub')} type="button" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-input transition-colors font-bold text-sm">
              <svg className="w-5 h-5 text-text-main" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border-subtle"></div>
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Or register with email</span>
            <div className="flex-1 h-px bg-border-subtle"></div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {(error || validationError) && (
              <div className="p-4 rounded-xl bg-semantic-danger/10 border border-semantic-danger/20 text-semantic-danger text-sm font-medium">
                {error || validationError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-text-secondary mb-1">Display Name</label>
              <input type="text" name="displayName" className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" value={formData.displayName} onChange={handleChange} placeholder="e.g. Aisha" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-text-secondary mb-1">Username</label>
                <input type="text" name="username" className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" value={formData.username} onChange={handleChange} placeholder="aisha123" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-secondary mb-1">Email</label>
                <input type="email" name="email" className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" value={formData.email} onChange={handleChange} placeholder="aisha@example.com" required />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-text-secondary mb-1">Password</label>
              <input type="password" name="password" className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
              
              {/* Password Strength Checklist */}
              {formData.password.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-bg-secondary border border-border-subtle grid grid-cols-2 gap-2 text-xs font-medium">
                  <div className={`flex items-center gap-2 ${checks.length ? 'text-semantic-success' : 'text-text-muted'}`}>
                    {checks.length ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    Min 8 chars
                  </div>
                  <div className={`flex items-center gap-2 ${checks.uppercase ? 'text-semantic-success' : 'text-text-muted'}`}>
                    {checks.uppercase ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    Uppercase
                  </div>
                  <div className={`flex items-center gap-2 ${checks.number ? 'text-semantic-success' : 'text-text-muted'}`}>
                    {checks.number ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    Number
                  </div>
                  <div className={`flex items-center gap-2 ${checks.special ? 'text-semantic-success' : 'text-text-muted'}`}>
                    {checks.special ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    Special char
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-text-secondary mb-1">Confirm Password</label>
              <input type="password" name="confirmPassword" className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
            </div>
            
            <button type="submit" disabled={isSubmitting || !formData.email || !isPasswordValid} className="mt-2 w-full px-6 py-4 rounded-xl font-bold text-white bg-brand-accent hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-accent/20">
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
            
            <div className="text-center mt-4">
              <span className="text-text-muted">Already have an account? </span>
              <Link href="/login" className="font-bold text-brand-accent hover:underline">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
