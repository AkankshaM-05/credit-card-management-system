'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { DataTable, Column } from '@/components/DataTable';
import {
  fetchAccountSummary,
  fetchAccounts,
  getCurrentUser,
} from '@/lib/api';
import { UserAccount, CurrentUserSession } from '@/lib/types';

export default function AdminDashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] =
    useState<CurrentUserSession | null>(null);

  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalEmployees: 0,
    totalManagers: 0,
  });

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
      <Sidebar
        role="ADMIN"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Admin Dashboard"
          userName={currentUser?.name || 'Administrator'}
          role="ADMIN"
          setMobileOpen={setMobileOpen}
        />

        <main className="p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">

          {/* System Overview */}
          <section>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                System Overview
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Current platform account summary
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Customers */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Customers
                    </div>

                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {summary.totalCustomers}
                    </div>
                  </div>

                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                    C
                  </div>
                </div>
              </div>

              {/* Employees */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Employees
                    </div>

                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {summary.totalEmployees}
                    </div>
                  </div>

                  <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold">
                    E
                  </div>
                </div>
              </div>

              {/* Managers */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Managers
                    </div>

                    <div className="text-2xl font-bold text-slate-900 mt-2">
                      {summary.totalManagers}
                    </div>
                  </div>

                  <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-semibold">
                    M
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Administrative Actions */}
          <section>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                Administrative Actions
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Provision new users for the system
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Create Customer */}
              <Link
                href="/admin/customers"
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center space-x-4 shadow-2xs transition-colors group"
              >
                <div className="h-11 w-11 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  +
                </div>

                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    Create Customer
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Provision a new customer account
                  </div>
                </div>
              </Link>

              {/* Create Employee */}
              <Link
                href="/admin/staff?role=EMPLOYEE"
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center space-x-4 shadow-2xs transition-colors group"
              >
                <div className="h-11 w-11 shrink-0 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  +
                </div>

                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    Create Employee
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Provision an operational employee
                  </div>
                </div>
              </Link>

              {/* Create Manager */}
              <Link
                href="/admin/staff?role=MANAGER"
                className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center space-x-4 shadow-2xs transition-colors group"
              >
                <div className="h-11 w-11 shrink-0 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  +
                </div>

                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    Create Manager
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Provision a reviewing manager
                  </div>
                </div>
              </Link>

            </div>
          </section>

          {/* Provisioned Accounts */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="px-5 sm:px-6 py-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Provisioned System Accounts
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                All customer and staff accounts currently registered in the system
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <DataTable
                columns={columns}
                data={accounts}
                emptyMessage="No accounts available."
                loading={loading}
              />
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}