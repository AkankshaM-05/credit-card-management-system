'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { DataTable, Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { fetchAccountSummary, fetchAccounts, getCurrentUser } from '@/lib/api';
import { UserAccount, CurrentUserSession } from '@/lib/types';

export default function AdminDashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserSession | null>(null);
  const [summary, setSummary] = useState({ totalCustomers: 0, totalEmployees: 0, totalManagers: 0 });
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        const sum = await fetchAccountSummary();
        const accs = await fetchAccounts();

        setSummary(sum);
        setAccounts(accs);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const columns: Column<UserAccount>[] = [
    {
      header: 'Account ID',
      accessorKey: 'id',
      className: 'font-mono text-xs',
    },
    {
      header: 'Username',
      accessorKey: 'username',
    },
    {
      header: 'User Type',
      accessorKey: 'userType',
      className: 'font-medium',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar role="ADMIN" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Admin Dashboard"
          userName={currentUser?.name || 'Administrator'}
          role="ADMIN"
          setMobileOpen={setMobileOpen}
        />

        <main className="p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* Summary Section */}
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              System Accounts Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Customers</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{summary.totalCustomers}</div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Employees</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{summary.totalEmployees}</div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Managers</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{summary.totalManagers}</div>
              </div>
            </div>
          </section>

          {/* Primary Action Buttons */}
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Primary Administrative Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/admin/customers"
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center space-x-3 shadow-2xs transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  +
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Create Customer</div>
                  <div className="text-xs text-slate-500">Provision new customer account</div>
                </div>
              </Link>

              <Link
                href="/admin/staff"
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center space-x-3 shadow-2xs transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  +
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Create Employee</div>
                  <div className="text-xs text-slate-500">Provision operational employee</div>
                </div>
              </Link>

              <Link
                href="/admin/staff"
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center space-x-3 shadow-2xs transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  +
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Create Manager</div>
                  <div className="text-xs text-slate-500">Provision reviewing manager</div>
                </div>
              </Link>

              <a
                href="#accounts-section"
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center space-x-3 shadow-2xs transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  ≡
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">View Accounts</div>
                  <div className="text-xs text-slate-500">Browse all provisioned accounts</div>
                </div>
              </a>
            </div>
          </section>

          {/* Accounts Table Section */}
          <section id="accounts-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Provisioned System Accounts</h2>
                <p className="text-xs text-slate-500">View and audit all active platform accounts</p>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={accounts}
              emptyMessage="No accounts available."
              loading={loading}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
