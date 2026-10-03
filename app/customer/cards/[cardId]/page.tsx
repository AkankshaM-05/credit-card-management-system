'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, Column } from '@/components/DataTable';
import {
  fetchCardById,
  fetchTransactionsByCard,
  fetchBillingStatementsByCard,
  fetchPaymentsByCard,
  getCurrentUser
} from '@/lib/api';
import {
  CreditCard,
  CardTransaction,
  BillingStatement,
  Payment,
  CurrentUserSession
} from '@/lib/types';

function formatDate(
  dateValue: string | Date | null | undefined
): string {
  if (!dateValue) return '—';

  if (typeof dateValue === 'string') {
    const datePart = dateValue.split('T')[0];
    const [year, month, day] = datePart.split('-');

    if (
      !year ||
      !month ||
      !day ||
      year.length !== 4 ||
      month.length !== 2 ||
      day.length !== 2
    ) {
      return '—';
    }

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthIndex = Number(month) - 1;

    if (monthIndex < 0 || monthIndex > 11) {
      return '—';
    }

    return `${day} ${months[monthIndex]} ${year}`;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomerCardDetailPage({ params }: { params: Promise<{ cardId: string }> }) {
  const resolvedParams = use(params);
  const cardId = resolvedParams.cardId;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'billing' | 'payments'>('transactions');

  const [card, setCard] = useState<CreditCard | null>(null);
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [billingStatements, setBillingStatements] = useState<BillingStatement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCardDetails() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        const c = await fetchCardById(cardId);
        setCard(c);

        const transactionList = await fetchTransactionsByCard(cardId);
        setTransactions(transactionList);

        const billingList = await fetchBillingStatementsByCard(cardId);
        setBillingStatements(billingList);

        const paymentList = await fetchPaymentsByCard(cardId);
        setPayments(paymentList);
      } catch (error) {
        console.error('Failed to load card details:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCardDetails();
  }, [cardId]);

  // Table Columns
  const transactionColumns: Column<CardTransaction>[] = [
    { header: 'Transaction ID', accessorKey: 'id', className: 'font-mono text-xs font-semibold' },
    { header: 'Merchant', accessorKey: 'merchantName', className: 'font-medium' },
    {
      header: 'Amount',
      cell: (row) => <span className="font-semibold text-slate-900">${row.amount.toFixed(2)}</span>
    },
    {
      header: 'Date',
      cell: (row) => formatDate(row.date)
    },
    {
      header: 'Type',
      cell: (row) => <span className="text-xs font-medium text-slate-700 uppercase">{row.type}</span>
    }
  ];

  const billingColumns: Column<BillingStatement>[] = [
    { header: 'Statement ID', accessorKey: 'id', className: 'font-mono text-xs font-semibold' },
    {
      header: 'Start Date',
      cell: (row) => formatDate(row.billingStartDate)
    },
    {
      header: 'End Date',
      cell: (row) => formatDate(row.billingEndDate)
    },
    {
      header: 'Total Amount',
      cell: (row) => (
        <span className="font-semibold text-slate-900">
          ${row.transactionAmount.toFixed(2)}
        </span>
      )
    },
    {
      header: 'Due Date',
      cell: (row) => formatDate(row.dueDate)
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />
    }
  ];

  const paymentColumns: Column<Payment>[] = [
    { header: 'Payment ID', accessorKey: 'id', className: 'font-mono text-xs font-semibold' },
    {
      header: 'Amount Paid',
      cell: (row) => <span className="font-semibold text-emerald-700">${row.amountPaid.toFixed(2)}</span>
    },
    {
      header: 'Payment Date',
      cell: (row) => formatDate(row.paymentDate)
    },
    {
      header: 'Payment Status',
      cell: (row) => <StatusBadge status={row.paymentStatus} />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar role="CUSTOMER" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Credit Card Details"
          userName={currentUser?.name || 'Customer'}
          role="CUSTOMER"
          setMobileOpen={setMobileOpen}
        />

        <main className="p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Back link */}
          <div>
            <Link
              href="/customer"
              className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              ← Back to My Dashboard
            </Link>
          </div>

          {/* Card Overview Banner */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
            {loading ? (
              <p className="text-sm text-slate-500">Loading card details...</p>
            ) : card ? (
              <div className="space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Credit Card ID
                    </div>
                    <h2 className="text-xl font-mono font-bold text-slate-900 tracking-wider">
                      {card.id}
                    </h2>
                  </div>
                  <StatusBadge status={card.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <div className="text-slate-400 uppercase tracking-wider font-semibold">Credit Limit</div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">
                      ${card.creditLimit.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wider font-semibold">Issue Date</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">
                      {formatDate(card.issueDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wider font-semibold">Expiry Date</div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">
                      {formatDate(card.expiryDate)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
                Credit card record not found.
              </div>
            )}
          </section>

          {/* History Tabs Section */}
          <section className="space-y-4">
            <div className="border-b border-slate-200 flex space-x-6">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'transactions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
              >
                Transactions ({transactions.length})
              </button>

              <button
                onClick={() => setActiveTab('billing')}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'billing'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
              >
                Billing Statements ({billingStatements.length})
              </button>

              <button
                onClick={() => setActiveTab('payments')}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'payments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
              >
                Payments ({payments.length})
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'transactions' && (
              <DataTable
                columns={transactionColumns}
                data={transactions}
                emptyMessage="No transactions available for this card."
                loading={loading}
              />
            )}

            {activeTab === 'billing' && (
              <DataTable
                columns={billingColumns}
                data={billingStatements}
                emptyMessage="No billing statements available."
                loading={loading}
              />
            )}

            {activeTab === 'payments' && (
              <DataTable
                columns={paymentColumns}
                data={payments}
                emptyMessage="No payments recorded."
                loading={loading}
              />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
