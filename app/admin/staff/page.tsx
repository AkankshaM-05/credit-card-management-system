'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { FormInput } from '@/components/FormInput';
import { DataTable, Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { createStaff, fetchStaffList, getCurrentUser } from '@/lib/api';
import { StaffUser, CurrentUserSession } from '@/lib/types';

export default function AdminStaffPage() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] =
    useState<CurrentUserSession | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Employee Form
  const [empName, setEmpName] = useState('');
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empSubmitting, setEmpSubmitting] = useState(false);

  // Manager Form
  const [mgrName, setMgrName] = useState('');
  const [mgrUsername, setMgrUsername] = useState('');
  const [mgrPassword, setMgrPassword] = useState('');
  const [mgrSubmitting, setMgrSubmitting] = useState(false);

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadPage() {
      const user = await getCurrentUser();
      setCurrentUser(user);
      await loadStaff();
    }

    loadPage();
  }, []);

  async function loadStaff() {
    try {
      const data = await fetchStaffList();
      setStaff(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empName || !empUsername || !empPassword) return;

    setEmpSubmitting(true);
    setMessage(null);

    try {
      const newEmp = await createStaff({
        name: empName,
        username: empUsername,
        password: empPassword,
        role: 'EMPLOYEE',
      });

      if (newEmp) {
        setMessage({
          type: 'success',
          text: `Employee "${newEmp.name}" created successfully.`,
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Employee creation request sent to backend API.',
        });
      }

      setEmpName('');
      setEmpUsername('');
      setEmpPassword('');

      await loadStaff();
    } catch {
      setMessage({
        type: 'error',
        text: 'Failed to create employee.',
      });
    } finally {
      setEmpSubmitting(false);
    }
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mgrName || !mgrUsername || !mgrPassword) return;

    setMgrSubmitting(true);
    setMessage(null);

    try {
      const newMgr = await createStaff({
        name: mgrName,
        username: mgrUsername,
        password: mgrPassword,
        role: 'MANAGER',
      });

      if (newMgr) {
        setMessage({
          type: 'success',
          text: `Manager "${newMgr.name}" created successfully.`,
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Manager creation request sent to backend API.',
        });
      }

      setMgrName('');
      setMgrUsername('');
      setMgrPassword('');

      await loadStaff();
    } catch {
      setMessage({
        type: 'error',
        text: 'Failed to create manager.',
      });
    } finally {
      setMgrSubmitting(false);
    }
  };

  const columns: Column<StaffUser>[] = [
    {
      header: 'Staff ID',
      accessorKey: 'id',
      className: 'font-mono text-xs font-semibold',
    },
    {
      header: 'Name',
      accessorKey: 'name',
      className: 'font-medium',
    },
    {
      header: 'Role',
      cell: (row) => <StatusBadge status={row.role} />,
    },
  ];

  const isEmployee = role === 'EMPLOYEE';
  const isManager = role === 'MANAGER';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        role="ADMIN"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Staff Management"
          userName={currentUser?.name || 'Administrator'}
          role="ADMIN"
          setMobileOpen={setMobileOpen}
        />

        <main className="p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">

          {message && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border ${message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
            >
              {message.text}
            </div>
          )}

          {/* Employee Creation */}
          {isEmployee && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs max-w-2xl">
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Create Employee
              </h2>

              <p className="text-xs text-slate-500 mb-5">
                Role automatically set to EMPLOYEE
              </p>

              <form
                onSubmit={handleCreateEmployee}
                className="space-y-4"
              >
                <FormInput
                  label="Name"
                  placeholder="e.g. Employee One"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  required
                />

                <FormInput
                  label="Username"
                  placeholder="e.g. emp_john"
                  value={empUsername}
                  onChange={(e) => setEmpUsername(e.target.value)}
                  required
                />

                <FormInput
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={empPassword}
                  onChange={(e) => setEmpPassword(e.target.value)}
                  required
                />

                <button
                  type="submit"
                  disabled={empSubmitting}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                >
                  {empSubmitting
                    ? 'Creating Employee...'
                    : 'Create Employee'}
                </button>
              </form>
            </section>
          )}

          {/* Manager Creation */}
          {isManager && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs max-w-2xl">
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Create Manager
              </h2>

              <p className="text-xs text-slate-500 mb-5">
                Role automatically set to MANAGER
              </p>

              <form
                onSubmit={handleCreateManager}
                className="space-y-4"
              >
                <FormInput
                  label="Name"
                  placeholder="e.g. Manager Sarah"
                  value={mgrName}
                  onChange={(e) => setMgrName(e.target.value)}
                  required
                />

                <FormInput
                  label="Username"
                  placeholder="e.g. mgr_sarah"
                  value={mgrUsername}
                  onChange={(e) => setMgrUsername(e.target.value)}
                  required
                />

                <FormInput
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={mgrPassword}
                  onChange={(e) => setMgrPassword(e.target.value)}
                  required
                />

                <button
                  type="submit"
                  disabled={mgrSubmitting}
                  className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-medium text-sm rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                >
                  {mgrSubmitting
                    ? 'Creating Manager...'
                    : 'Create Manager'}
                </button>
              </form>
            </section>
          )}

          {/* Staff Table */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Provisioned Staff
              </h2>

              <p className="text-xs text-slate-500">
                List of all operational employees and managers
              </p>
            </div>

            <DataTable
              columns={columns}
              data={staff}
              emptyMessage="No staff users found."
              loading={loading}
            />
          </section>

        </main>
      </div>
    </div>
  );
}