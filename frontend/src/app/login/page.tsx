import React from 'react';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Login - FairShare',
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
            <span className="login-icon">💰</span>
            <h1>FairShare</h1>
          </div>
          <p className="login-tagline">Split expenses. Stay fair.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
