'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/lib/api';

export default function SettingsPage() {
  const { user, updateProfile, updatePassword, error, clearError } = useAuth();
  
  // Profile State
  const [profileData, setProfileData] = useState({
    displayName: '',
    username: '',
    email: '',
    phone: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Load user data into form
  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || '',
        username: user.username || '',
        email: user.email || '',
        phone: (user as any).phone || '',
      });
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (profileSuccess) setProfileSuccess(false);
    clearError();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (passwordSuccess) setPasswordSuccess(false);
    if (passwordError) setPasswordError('');
    clearError();
  };

  // Profile Submit
  const onProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccess(false);
    
    try {
      await updateProfile(profileData);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      // Handled by context
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Password Submit
  const onPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordSuccess(false);
    
    try {
      await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      // Handled by context, or fallback here if needed
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-main tracking-tight">Account Settings</h1>
        <p className="text-text-muted mt-2">Manage your profile, preferences, and security settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Profile Update */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Personal Information
            </h2>
            
            <form onSubmit={onProfileSubmit} className="space-y-5">
              {profileSuccess && (
                <div className="p-4 rounded-xl bg-semantic-success/10 border border-semantic-success/20 text-semantic-success text-sm font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Profile updated successfully
                </div>
              )}
              {error && isUpdatingProfile && (
                <div className="p-4 rounded-xl bg-semantic-danger/10 border border-semantic-danger/20 text-semantic-danger text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-1">Display Name</label>
                  <input type="text" name="displayName" value={profileData.displayName} onChange={handleProfileChange} className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-1">Username</label>
                  <input type="text" name="username" value={profileData.username} onChange={handleProfileChange} className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-1">Email Address</label>
                  <input type="email" name="email" value={profileData.email} onChange={handleProfileChange} className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-1">Phone Number (Optional)</label>
                  <input type="text" name="phone" value={profileData.phone} onChange={handleProfileChange} className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex justify-end">
                <button type="submit" disabled={isUpdatingProfile} className="px-6 py-3 rounded-xl font-bold text-white bg-brand-accent hover:bg-sky-500 disabled:opacity-50 transition-all shadow-sm">
                  {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Security
            </h2>
            
            <form onSubmit={onPasswordSubmit} className="space-y-5">
              {passwordSuccess && (
                <div className="p-4 rounded-xl bg-semantic-success/10 border border-semantic-success/20 text-semantic-success text-sm font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Password changed successfully
                </div>
              )}
              {(passwordError || (error && isUpdatingPassword)) && (
                <div className="p-4 rounded-xl bg-semantic-danger/10 border border-semantic-danger/20 text-semantic-danger text-sm font-medium">
                  {passwordError || error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-text-secondary mb-1">Current Password</label>
                <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-1">New Password</label>
                  <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" required minLength={8} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-1">Confirm New Password</label>
                  <input type="password" name="confirmNewPassword" value={passwordData.confirmNewPassword} onChange={handlePasswordChange} className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border-subtle focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all" required minLength={8} />
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex justify-end">
                <button type="submit" disabled={isUpdatingPassword || !passwordData.currentPassword || !passwordData.newPassword} className="px-6 py-3 rounded-xl font-bold text-white bg-text-main hover:bg-black dark:bg-white dark:hover:bg-gray-200 dark:text-black disabled:opacity-50 transition-all shadow-sm">
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right column: Info / Context */}
        <div className="space-y-6">
          <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-6">
            <h3 className="font-bold text-brand-accent mb-2">Why add a phone number?</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Adding a phone number allows your group members to easily find you and add you to their shared expenses directly via contacts.
            </p>
          </div>
          
          <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6">
            <h3 className="font-bold text-text-main mb-2">Connected Accounts</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              Link your social accounts to log in faster.
            </p>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 rounded-xl border border-border-subtle hover:bg-bg-primary transition-colors text-sm font-bold">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/><path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 01-6.723-4.806L1.24 17.35A11.99 11.99 0 0012 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987z"/><path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21z"/><path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 014.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 000 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z"/></svg>
                  Google
                </div>
                <span className="text-brand-accent">Connect</span>
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl border border-border-subtle hover:bg-bg-primary transition-colors text-sm font-bold">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-text-main" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                  GitHub
                </div>
                <span className="text-brand-accent">Connect</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
