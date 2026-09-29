'use client';

import React, { useState } from 'react';
import { FormInput } from '@/components/FormInput';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", res.status, data);

      if (!res.ok) {
        setError(data.message || 'Invalid username or password.');
        return;
      }

      if (data.user.userType === 'ADMIN') {
        window.location.href = '/admin';
      } else if (data.user.userType === 'EMPLOYEE') {
        window.location.href = '/employee';
      } else if (data.user.userType === 'MANAGER') {
        window.location.href = '/manager';
      } else if (data.user.userType === 'CUSTOMER') {
        window.location.href = '/customer';
      }
    } catch (error) {
      console.error(error);
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side Visual Banner */}
        <div className="bg-slate-900 text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-xl mb-6 shadow-md">
              CC
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">ApexBank System</h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Secure Credit Card Management System
            </p>
          </div>

          {/* Financial Card Visual Graphic */}
          <div className="my-8 relative z-10">
            <div className="bg-gradient-to-tr from-slate-800 to-slate-700 p-5 rounded-xl border border-slate-600/50 shadow-lg space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-300 tracking-wider">APEX PLATINUM</span>
                <div className="w-8 h-5 rounded-sm bg-amber-400/80 border border-amber-300/50"></div>
              </div>
              <div className="text-sm font-mono tracking-widest text-slate-200">
                **** **** **** ****
              </div>
              <div className="flex justify-between items-end text-[10px] text-slate-400">
                <div>
                  <div className="uppercase font-medium text-[8px] text-slate-400">Card Holder</div>
                  <div className="text-slate-200 font-semibold">AUTHORIZED USER</div>
                </div>
                <div>
                  <div className="uppercase font-medium text-[8px] text-slate-400">Expires</div>
                  <div className="text-slate-200 font-semibold">--/--</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-xs text-slate-400">
            Internal Banking Operations Portal • Authorized Access Only
          </div>

          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-blue-600/10 pointer-events-none" />
        </div>

        {/* Right Side Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your account credentials to access the banking portal</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <FormInput
              label="Username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <FormInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
