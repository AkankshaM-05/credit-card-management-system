'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { FormInput } from '@/components/FormInput';
import { DataTable, Column } from '@/components/DataTable';
import { createCustomer, fetchCustomersList, getCurrentUser } from '@/lib/api';
import { Customer, CurrentUserSession } from '@/lib/types';

export default function AdminCustomersPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserSession | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadPage() {
      const user = await getCurrentUser();
      setCurrentUser(user);
      await loadCustomers();
    }

    loadPage();
  }, []);

  async function loadCustomers() {
    try {
      const data = await fetchCustomersList();
      setCustomers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || !username || !password) {
      setErrorMessage('All fields are required.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const newCust = await createCustomer({
        name,
        phone,
        email,
        username,
        password,
      });
      if (newCust) {
        setSuccessMessage(`Customer "${newCust.name}" (ID: ${newCust.id}) created successfully.`);
      } else {
        setSuccessMessage('Customer creation request sent to backend API.');
      }
      setName('');
      setPhone('');
      setEmail('');
      setUsername('');
      setPassword('');
      await loadCustomers();
    } catch {
      setErrorMessage('Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Customer>[] = [
    {
      header: 'Customer ID',
      accessorKey: 'id',
      className: 'font-mono text-xs font-semibold',
    },
    {
      header: 'Name',
      accessorKey: 'name',
      className: 'font-medium',
    },
    {
      header: 'Email',
      accessorKey: 'email',
    },
    {
      header: 'Phone',
      accessorKey: 'phone',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar role="ADMIN" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Customer Management"
          userName={currentUser?.name || 'Administrator'}
          role="ADMIN"
          setMobileOpen={setMobileOpen}
        />

        <main className="p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* Form Card */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create Customer Account</h2>
            <p className="text-xs text-slate-500 mb-6">Enter new customer details to provision their account</p>

            {successMessage && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormInput
                  label="Full Name"
                  placeholder="e.g. Akanksha Mahangade"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <FormInput
                  label="Phone Number"
                  placeholder="e.g. +1 555-0192"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <FormInput
                  label="Email Address"
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <FormInput
                  label="Username"
                  placeholder="e.g. akanksha_m"
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
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-2xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                >
                  {submitting ? 'Creating Customer...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </section>

          {/* Table Section */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Registered Customers</h2>
              <p className="text-xs text-slate-500">List of all active customer accounts</p>
            </div>

            <DataTable
              columns={columns}
              data={customers}
              emptyMessage="No customers found."
              loading={loading}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
