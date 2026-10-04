'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { FormInput } from '@/components/FormInput';
import {
  fetchCardById,
  fetchCustomerById,
  fetchMerchants,
  createTransaction,
  importTransactions,
} from '@/lib/api';
import {
  CreditCard,
  Customer,
  Merchant,
  TransactionType,
} from '@/lib/types';

function EnterTransactionContent() {
  const searchParams = useSearchParams();

  const cardIdParam = searchParams.get('cardId');
  const customerIdParam = searchParams.get('customerId');

  const [card, setCard] = useState<CreditCard | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  const [selectedMerchant, setSelectedMerchant] =
    useState<string>('');

  const [amount, setAmount] = useState<number>(100);

  const [txnDate, setTxnDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [txnType, setTxnType] =
    useState<TransactionType>('PURCHASE');

  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        if (cardIdParam) {
          const cardData =
            await fetchCardById(cardIdParam);

          setCard(cardData);
        }

        if (customerIdParam) {
          const customerData =
            await fetchCustomerById(customerIdParam);

          setCustomer(customerData);
        }

        const merchantData =
          await fetchMerchants();

        setMerchants(merchantData);
      } catch (error) {
        console.error(
          'Failed to load transaction data:',
          error
        );

        setFeedback({
          type: 'error',
          text: 'Failed to load card, customer, or merchant information from the backend.',
        });
      }
    }

    loadData();
  }, [cardIdParam, customerIdParam]);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!cardIdParam) {
      setFeedback({
        type: 'error',
        text: 'No card selected. Please select a specific card from the Employee dashboard first.',
      });
      return;
    }

    if (!selectedMerchant) {
      setFeedback({
        type: 'error',
        text: 'Please select a merchant.',
      });
      return;
    }

    if (amount <= 0) {
      setFeedback({
        type: 'error',
        text: 'Transaction amount must be greater than 0.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await createTransaction({
        cardId: cardIdParam,
        merchantId: selectedMerchant,
        amount,
        date: txnDate,
        type: txnType,
      });

      setFeedback({
        type: 'success',
        text: `Transaction of ₹${amount.toLocaleString(
          'en-IN',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )} (${txnType}) submitted successfully.`,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to record transaction.';

      setFeedback({
        type: 'error',
        text: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelImport = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setImporting(true);
    setFeedback(null);

    try {
      const result =
        await importTransactions(file);

      setFeedback({
        type: 'success',
        text:
          result.message ||
          `Successfully imported ${result.successfulRows} transaction record(s).`,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to import transactions.';

      setFeedback({
        type: 'error',
        text: msg,
      });
    } finally {
      setImporting(false);

      // Allows the same file to be selected again
      e.target.value = '';
    }
  };

  return (
    <main className="p-4 sm:p-8 space-y-6 max-w-5xl w-full mx-auto">
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
          className={`p-4 rounded-xl text-sm font-semibold border ${feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
        >
          {feedback.text}
        </div>
      )}

      {/* ==================== EXCEL IMPORT ==================== */}

      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Import Transactions
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Upload an Excel file containing transaction records.
            </p>

            <p className="text-[11px] text-slate-400 mt-2">
              Required columns: Card_ID, Merchant_ID,
              Amount, Transaction_Date, Transaction_Type
            </p>
          </div>

          <label
            className={`inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${importing
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
              }`}
          >
            {importing
              ? 'Importing...'
              : 'Upload Excel'}

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>
      </section>

      {/* ==================== MANUAL ENTRY ==================== */}

      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Enter Transaction
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Record operational transaction details for the selected
            credit card.
          </p>
        </div>

        {/* Selected Customer & Card */}

        {cardIdParam ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider">
                Customer
              </span>

              <div className="font-bold text-slate-900 text-sm mt-0.5">
                {customer?.name ||
                  customerIdParam ||
                  'Selected Customer'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider">
                Card ID
              </span>

              <div className="font-bold text-slate-900 text-sm font-mono mt-0.5">
                {card ? card.id : cardIdParam}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
            No credit card selected. Please select an existing card
            from the Employee dashboard first.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Merchant */}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Merchant
              </label>

              <select
                value={selectedMerchant}
                onChange={(e) =>
                  setSelectedMerchant(e.target.value)
                }
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                required
              >
                <option value="">
                  -- Select Merchant --
                </option>

                {merchants.length > 0 ? (
                  merchants.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                    >
                      {m.name}{' '}
                      {m.category
                        ? `(${m.category})`
                        : ''}
                    </option>
                  ))
                ) : (
                  <option
                    value=""
                    disabled
                  >
                    No merchants loaded from backend API
                  </option>
                )}
              </select>
            </div>

            {/* Amount */}

            <FormInput
              label="Transaction Amount (₹)"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) =>
                setAmount(
                  Number(e.target.value)
                )
              }
              required
            />

            {/* Date */}

            <FormInput
              label="Transaction Date"
              type="date"
              value={txnDate}
              onChange={(e) =>
                setTxnDate(e.target.value)
              }
              required
            />

            {/* Transaction Type */}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Transaction Type
              </label>

              <select
                value={txnType}
                onChange={(e) =>
                  setTxnType(
                    e.target.value as TransactionType
                  )
                }
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value="PURCHASE">
                  PURCHASE
                </option>

                <option value="REFUND">
                  REFUND
                </option>

                <option value="REVERSAL">
                  REVERSAL
                </option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={
                submitting ||
                !cardIdParam
              }
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              {submitting
                ? 'Submitting...'
                : 'Enter Transaction'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function EmployeeEnterTransactionPage() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        role="EMPLOYEE"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Enter Transaction"
          role="EMPLOYEE"
          setMobileOpen={setMobileOpen}
        />

        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-500 text-sm">
              Loading transaction entry form...
            </div>
          }
        >
          <EnterTransactionContent />
        </Suspense>
      </div>
    </div>
  );
}