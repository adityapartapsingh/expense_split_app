import React from 'react';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Login - Expense2Split',
};

export default function LoginPage() {
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
            <h1>Expense2Split</h1>
          </div>
          <p className="login-tagline">Split expenses. Stay fair.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
