'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { FormInput } from '@/components/FormInput';
import { StatusBadge } from '@/components/StatusBadge';
import { fetchCustomerById, createCreditCard } from '@/lib/api';
import { Customer } from '@/lib/types';

function CreateCardContent() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get('customerId');

  const [customer, setCustomer] = useState<Customer | null>(null);

  const [creditLimit, setCreditLimit] = useState<number>(5000);
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState<string>('2029-12-31');
  const [creating, setCreating] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (customerIdParam) {
      fetchCustomerById(customerIdParam).then(setCustomer);
    }
  }, [customerIdParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerIdParam) {
      setFeedback({ type: 'error', text: 'No customer selected. Please select a customer from the Employee dashboard first.' });
      return;
    }

    setCreating(true);
    setFeedback(null);
    try {
      await createCreditCard({
        customerId: customerIdParam,
        creditLimit,
        issueDate,
        expiryDate
      });
      setFeedback({
        type: 'success',
        text: 'Credit card creation request submitted with status PENDING_APPROVAL.'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backend API unavailable. Cannot issue credit card.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="p-4 sm:p-8 space-y-6 max-w-4xl w-full mx-auto">
      <div>
        <Link
          href="/employee"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          ← Back to Employee Dashboard
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">Create Credit Card</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Initial card status will automatically be set to <strong>PENDING_APPROVAL</strong>
          </p>
        </div>

        {/* Target Customer Context */}
        {customer ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-slate-500 uppercase tracking-wider">Target Customer</div>
            <div className="text-sm font-bold text-slate-900">{customer.name}</div>
            <div className="text-slate-600">
              Customer ID: <span className="font-mono text-slate-800 font-semibold">{customer.id}</span>
            </div>
          </div>
        ) : customerIdParam ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-slate-500 uppercase tracking-wider">Target Customer ID</div>
            <div className="text-sm font-bold font-mono text-slate-900">{customerIdParam}</div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
            No customer selected. Please select a customer from the Employee dashboard first.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Credit Limit ($)"
              type="number"
              min="500"
              step="500"
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value))}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Initial Card Status
              </label>
              <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-600 font-semibold flex items-center justify-between">
                <span>PENDING_APPROVAL</span>
                <StatusBadge status="PENDING_APPROVAL" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Status is locked to PENDING_APPROVAL upon creation.
              </p>
            </div>

            <FormInput
              label="Issue Date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />

            <FormInput
              label="Expiry Date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={creating || !customerIdParam}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              {creating ? 'Submitting...' : 'Create Credit Card'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function EmployeeCreateCardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar role="EMPLOYEE" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar title="Create Credit Card" role="EMPLOYEE" setMobileOpen={setMobileOpen} />
        <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Loading card creation form...</div>}>
          <CreateCardContent />
        </Suspense>
      </div>
    </div>
  );
}
