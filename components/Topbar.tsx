'use client';

import React from 'react';
import { UserRole } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface TopbarProps {
  title: string;
  userName?: string;
  role: UserRole;
  setMobileOpen: (open: boolean) => void;
}

export function Topbar({ title, userName = 'Authenticated User', role, setMobileOpen }: TopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-hidden"
          aria-label="Open Sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-semibold text-slate-800">{userName}</span>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{role}</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="h-9 w-9 rounded-full bg-slate-900 text-white font-semibold flex items-center justify-center text-sm shadow-2xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="sm:hidden">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
