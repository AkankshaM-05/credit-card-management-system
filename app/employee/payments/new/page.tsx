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
  fetchBillingStatementsByCard,
  createPayment,
  importPayments,
} from '@/lib/api';
import {
  CreditCard,
  Customer,
  BillingStatement,
} from '@/lib/types';

function RecordPaymentContent() {
  const searchParams = useSearchParams();

  const cardIdParam = searchParams.get('cardId');
  const customerIdParam = searchParams.get('customerId');

  const [card, setCard] = useState<CreditCard | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [statements, setStatements] = useState<BillingStatement[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState('');

  const [amountPaid, setAmountPaid] = useState<number>(100);

  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

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
          const cardData = await fetchCardById(cardIdParam);
          setCard(cardData);

          const statementData =
            await fetchBillingStatementsByCard(cardIdParam);

          setStatements(statementData);

          const firstUnpaidStatement = statementData.find(
            (statement) =>
              statement.status !== 'PAID' &&
              Number(statement.amountPaid) <
              Number(statement.transactionAmount)
          );

          if (firstUnpaidStatement) {
            setSelectedStatementId(firstUnpaidStatement.id);
          }
        }

        if (customerIdParam) {
          const customerData =
            await fetchCustomerById(customerIdParam);

          setCustomer(customerData);
        }
      } catch (error) {
        console.error(
          'Failed to load payment data:',
          error
        );

        setFeedback({
          type: 'error',
          text: 'Failed to load card or billing statement information.',
        });
      }
    }

    loadData();
  }, [cardIdParam, customerIdParam]);

  const selectedStatement = statements.find(
    (statement) => statement.id === selectedStatementId
  );

  const outstandingAmount = selectedStatement
    ? Number(selectedStatement.transactionAmount) -
    Number(selectedStatement.amountPaid)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStatementId) {
      setFeedback({
        type: 'error',
        text: 'Please select a billing statement.',
      });
      return;
    }

    if (amountPaid <= 0) {
      setFeedback({
        type: 'error',
        text: 'Payment amount must be greater than 0.',
      });
      return;
    }

    if (amountPaid > outstandingAmount) {
      setFeedback({
        type: 'error',
        text:
          'Payment amount cannot exceed the outstanding statement amount.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await createPayment({
        statementId: selectedStatementId,
        amountPaid,
        paymentDate,
      });

      setFeedback({
        type: 'success',
        text: `Payment of ₹${amountPaid.toLocaleString(
          'en-IN',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )} recorded successfully.`,
      });

      const updatedStatements =
        await fetchBillingStatementsByCard(
          cardIdParam!
        );

      setStatements(updatedStatements);

      const updatedStatement =
        updatedStatements.find(
          (statement) =>
            statement.id === selectedStatementId
        );

      if (updatedStatement) {
        setSelectedStatementId(
          updatedStatement.id
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to record payment.';

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
      const result = await importPayments(file);

      setFeedback({
        type: 'success',
        text:
          result.message ||
          `Successfully imported ${result.successfulRows} payment record(s).`,
      });

      if (cardIdParam) {
        const updatedStatements =
          await fetchBillingStatementsByCard(
            cardIdParam
          );

        setStatements(updatedStatements);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to import payments.';

      setFeedback({
        type: 'error',
        text: msg,
      });
    } finally {
      setImporting(false);
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
            : 'bg-amber-50 border-amber-200 text-amber-800'
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
              Import Payments
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Upload an Excel file containing payment records.
            </p>

            <p className="text-[11px] text-slate-400 mt-2">
              Required columns: Statement_ID, Amount_Paid,
              Payment_Date
            </p>
          </div>

          <label
            className={`inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors ${importing
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-blue-700 hover:bg-blue-800'
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

      {/* ==================== RECORD PAYMENT ==================== */}

      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Record Payment
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Record a customer payment against a billing statement.
          </p>
        </div>

        {/* Selected Card & Customer */}

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
            No credit card selected. Please search for a customer
            and select a card on the Employee dashboard.
          </div>
        )}

        {/* Billing Statement */}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Billing Statement
          </label>

          <select
            value={selectedStatementId}
            onChange={(e) =>
              setSelectedStatementId(e.target.value)
            }
            disabled={
              !cardIdParam ||
              statements.length === 0
            }
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {statements.length === 0
                ? 'No billing statements available'
                : 'Select a billing statement'}
            </option>

            {statements.map((statement) => (
              <option
                key={statement.id}
                value={statement.id}
              >
                Statement #{statement.id} —{' '}
                {statement.status} — Due ₹
                {Number(
                  statement.transactionAmount
                ).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Statement Summary */}

        {selectedStatement && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Statement ID
              </span>

              <div className="font-bold text-slate-900 text-sm mt-1">
                {selectedStatement.id}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Amount Paid
              </span>

              <div className="font-bold text-slate-900 text-sm mt-1">
                ₹
                {Number(
                  selectedStatement.amountPaid
                ).toFixed(2)}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Outstanding
              </span>

              <div className="font-bold text-emerald-700 text-sm mt-1">
                ₹{outstandingAmount.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Amount Paid (₹)"
              type="number"
              min="0.01"
              step="0.01"
              max={
                outstandingAmount > 0
                  ? outstandingAmount
                  : undefined
              }
              value={amountPaid}
              onChange={(e) =>
                setAmountPaid(
                  Number(e.target.value)
                )
              }
              required
            />

            <FormInput
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) =>
                setPaymentDate(e.target.value)
              }
              required
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={
                submitting ||
                !cardIdParam ||
                !selectedStatementId ||
                outstandingAmount <= 0
              }
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              {submitting
                ? 'Recording Payment...'
                : 'Record Payment'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function EmployeeRecordPaymentPage() {
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
          title="Record Payment"
          role="EMPLOYEE"
          setMobileOpen={setMobileOpen}
        />

        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-500 text-sm">
              Loading payment recording form...
            </div>
          }
        >
          <RecordPaymentContent />
        </Suspense>
      </div>
    </div>
  );
}