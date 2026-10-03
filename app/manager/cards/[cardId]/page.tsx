'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import {
  fetchCardById,
  fetchCustomerById,
  fetchTransactionsByCard,
  fetchBillingStatementsByCard,
  fetchPaymentsByCard,
  updateCardStatus,
  getCurrentUser
} from '@/lib/api';
import {
  CreditCard,
  Customer,
  CardTransaction,
  BillingStatement,
  Payment,
  CardStatus,
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

export default function ManagerCardReviewPage({
  params
}: {
  params: Promise<{ cardId: string }>
}) {
  const resolvedParams = use(params);
  const cardId = resolvedParams.cardId;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] =
    useState<CurrentUserSession | null>(null);

  const [card, setCard] = useState<CreditCard | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] =
    useState<CardTransaction[]>([]);
  const [billingStatements, setBillingStatements] =
    useState<BillingStatement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [activeTab, setActiveTab] =
    useState<'transactions' | 'billing' | 'payments'>('transactions');

  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string>('');

  // Modals for Destructive Manager Actions
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }

    loadUser();
    loadCardData();
  }, [cardId]);

  async function loadCardData() {
    try {
      const c = await fetchCardById(cardId);
      setCard(c);

      if (c) {
        const [cust, txns, stmts, pymts] = await Promise.all([
          fetchCustomerById(c.customerId),
          fetchTransactionsByCard(cardId),
          fetchBillingStatementsByCard(cardId),
          fetchPaymentsByCard(cardId)
        ]);

        setCustomer(cust);
        setTransactions(txns);
        setBillingStatements(stmts);
        setPayments(pymts);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (newStatus: CardStatus) => {
    setActionFeedback('');

    if (!currentUser?.staffId) {
      setActionFeedback('Manager staff ID not found.');
      return;
    }

    try {
      const updated = await updateCardStatus(
        cardId,
        newStatus,
        currentUser.staffId
      );

      if (updated) {
        setCard(updated);
        setActionFeedback(`Card status updated to ${newStatus}.`);
      }
    } catch {
      setActionFeedback('Failed to update card status.');
    }
  };

  // Table Columns
  const transactionColumns: Column<CardTransaction>[] = [
    {
      header: 'Transaction ID',
      accessorKey: 'id',
      className: 'font-mono text-xs font-semibold'
    },
    {
      header: 'Merchant',
      accessorKey: 'merchantId',
      className: 'font-medium'
    },
    {
      header: 'Amount',
      cell: (row) => (
        <span className="font-semibold text-slate-900">
          ${row.amount.toFixed(2)}
        </span>
      )
    },
    {
      header: 'Date',
      cell: (row) => formatDate(row.date)
    },
    {
      header: 'Type',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700 uppercase">
          {row.type}
        </span>
      )
    }
  ];

  const billingColumns: Column<BillingStatement>[] = [
    {
      header: 'Statement ID',
      accessorKey: 'id',
      className: 'font-mono text-xs font-semibold'
    },
    {
      header: 'Billing Period',
      cell: (row) =>
        `${formatDate(row.billingStartDate)} to ${formatDate(row.billingEndDate)}`
    },
    {
      header: 'Transaction Amount',
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
    {
      header: 'Payment ID',
      accessorKey: 'id',
      className: 'font-mono text-xs font-semibold'
    },
    {
      header: 'Amount Paid',
      cell: (row) => (
        <span className="font-semibold text-emerald-700">
          ${row.amountPaid.toFixed(2)}
        </span>
      )
    },
    {
      header: 'Payment Date',
      cell: (row) => formatDate(row.paymentDate)
    },
    {
      header: 'Status',
      cell: (row) => (
        <StatusBadge status={row.paymentStatus} />
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        role="MANAGER"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Card Review & Management"
          userName={currentUser?.name || 'Manager'}
          role="MANAGER"
          setMobileOpen={setMobileOpen}
        />

        <main className="p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <div>
            <Link
              href="/manager"
              className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              ← Back to Manager Dashboard
            </Link>
          </div>

          {actionFeedback && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {actionFeedback}
            </div>
          )}

          {/* Card Overview & Review Banner */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
            {loading ? (
              <p className="text-sm text-slate-500">
                Loading card details for review...
              </p>
            ) : card ? (
              <>
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {card.id}
                      </span>
                      <StatusBadge status={card.status} />
                    </div>

                    <h2 className="text-2xl font-mono font-bold text-slate-900 tracking-wider mt-1">
                      {card.id}
                    </h2>
                  </div>

                  {/* Manager Decision Action Buttons */}
                  <div className="flex items-center space-x-2 bg-slate-50 p-2 border border-slate-200 rounded-xl">
                    <span className="text-xs font-semibold text-slate-500 px-2 uppercase tracking-wider">
                      Actions:
                    </span>

                    <button
                      onClick={() => handleStatusChange('ACTIVE')}
                      disabled={card.status !== 'PENDING_APPROVAL'}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => setBlockModalOpen(true)}
                      disabled={card.status !== 'ACTIVE'}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                    >
                      Block
                    </button>

                    <button
                      onClick={() => setCloseModalOpen(true)}
                      disabled={card.status !== 'BLOCKED'}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <div className="text-slate-400 uppercase tracking-wider font-semibold">
                      Customer
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {customer?.name || card.customerName || 'Unknown'}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 uppercase tracking-wider font-semibold">
                      Credit Limit
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      ${card.creditLimit.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 uppercase tracking-wider font-semibold">
                      Issue Date
                    </div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">
                      {formatDate(card.issueDate)}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 uppercase tracking-wider font-semibold">
                      Expiry Date
                    </div>
                    <div className="text-sm font-medium text-slate-800 mt-0.5">
                      {formatDate(card.expiryDate)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-rose-50 text-rose-800 text-sm font-medium rounded-lg">
                Card details not found for ID: {cardId}
              </div>
            )}
          </section>

          {/* Card Review History Tabs */}
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

      {/* Confirmation Modals for Destructive Actions */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        onConfirm={() => handleStatusChange('BLOCKED')}
        title="Block Credit Card"
        description={`Are you sure you want to block credit card ${card?.id}? The cardholder will not be able to process transactions until unblocked.`}
        confirmText="Block Card"
        variant="warning"
      />

      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onConfirm={() => handleStatusChange('CLOSED')}
        title="Close Credit Card Account"
        description={`Are you sure you want to permanently close credit card ${card?.id}? This action will generate an AUDIT_LOG record.`}
        confirmText="Close Card"
        variant="danger"
      />
    </div>
  );
}