'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { FormInput } from '@/components/FormInput';
import { StatusBadge } from '@/components/StatusBadge';
import {
  searchCustomers,
  fetchCardsByCustomer,
  fetchPendingApprovalCards,
  fetchRiskAnalysis,
  getCurrentUser,
} from '@/lib/api';
import { Customer, CreditCard, CurrentUserSession } from '@/lib/types';
import type { RiskAnalysis } from '@/lib/api';

export default function ManagerDashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [currentUser, setCurrentUser] =
    useState<CurrentUserSession | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [customerCards, setCustomerCards] =
    useState<CreditCard[]>([]);

  const [loadingCards, setLoadingCards] = useState(false);

  const [pendingCards, setPendingCards] =
    useState<CreditCard[]>([]);

  const [loadingApprovals, setLoadingApprovals] =
    useState(false);

  const [riskAnalysis, setRiskAnalysis] =
    useState<RiskAnalysis[]>([]);

  const [loadingRisk, setLoadingRisk] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }

    loadUser();
  }, []);

  // Load cards waiting for manager approval
  useEffect(() => {
    async function loadPendingApprovals() {
      setLoadingApprovals(true);

      try {
        const cards = await fetchPendingApprovalCards();
        setPendingCards(cards);
      } catch {
        setPendingCards([]);
      } finally {
        setLoadingApprovals(false);
      }
    }

    loadPendingApprovals();
  }, []);

  // Load risk analysis
  useEffect(() => {
    async function loadRiskAnalysis() {
      setLoadingRisk(true);

      try {
        const data = await fetchRiskAnalysis();
        setRiskAnalysis(data);
      } catch {
        setRiskAnalysis([]);
      } finally {
        setLoadingRisk(false);
      }
    }

    loadRiskAnalysis();
  }, []);

  // Live customer search with autocomplete
  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const results = await searchCustomers(query);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setSearchResults([]);
    setLoadingCards(true);

    try {
      const cards = await fetchCardsByCustomer(cust.id);
      setCustomerCards(cards);
    } catch {
      setCustomerCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        role="MANAGER"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Manager Dashboard"
          userName={currentUser?.name || 'Manager User'}
          role="MANAGER"
          setMobileOpen={setMobileOpen}
        />

        <main className="p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">

          {/* =========================
              CUSTOMER SEARCH
          ========================= */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Customer & Card Management Review
              </h2>

              <p className="text-xs text-slate-500">
                Search for a customer using their unique Customer ID
                to review their credit cards, transactions, billing,
                and manage card approvals/status.
              </p>
            </div>

            <div className="relative">
              <FormInput
                label="Search Customer"
                placeholder="Enter Customer ID (e.g. CUS4837291)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {searching && (
                <div className="absolute right-3 top-9 text-xs text-slate-400">
                  Searching...
                </div>
              )}
            </div>

            {/* Customer Suggestions */}
            {searchResults.length > 0 && !selectedCustomer && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 mt-4 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  Customer Suggestions
                </div>

                {searchResults.map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className="p-4 hover:bg-blue-50/50 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div>
                        <span className="font-mono text-xs text-slate-500 mr-3">
                          {cust.id}
                        </span>

                        <span className="font-semibold text-slate-900 text-sm">
                          {cust.name}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        {cust.phone} • {cust.email}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1 bg-slate-900 text-white text-xs font-medium rounded-md"
                    >
                      Review Customer →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {searchQuery &&
              searchResults.length === 0 &&
              !searching &&
              !selectedCustomer && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs text-center">
                  No matching customers found for "{searchQuery}".
                </div>
              )}

            {/* Initial Search Message */}
            {!searchQuery && !selectedCustomer && (
              <div className="p-6 bg-slate-50/70 border border-slate-200/80 rounded-lg text-slate-500 text-xs text-center">
                Search for a customer using their Customer ID to view
                their information.
              </div>
            )}
          </section>

          {/* =========================
              CUSTOMER DETAILS & CARDS
          ========================= */}
          {selectedCustomer && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    Customer Details
                  </span>

                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedCustomer.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1">
                    <span>
                      Customer ID:{' '}
                      <strong className="font-mono text-slate-800">
                        {selectedCustomer.id}
                      </strong>
                    </span>

                    <span>
                      Phone: <strong>{selectedCustomer.phone}</strong>
                    </span>

                    <span>
                      Email: <strong>{selectedCustomer.email}</strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerCards([]);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 underline"
                >
                  Clear Selection
                </button>
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 mb-3">
                  Customer Credit Cards
                </h4>

                {loadingCards ? (
                  <p className="text-sm text-slate-500">
                    Loading customer cards...
                  </p>
                ) : customerCards.length === 0 ? (
                  <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-xs">
                    No credit cards found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customerCards.map((card) => (
                      <div
                        key={card.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-semibold text-slate-500">
                              Card ID
                            </span>

                            <div className="text-sm font-mono font-bold text-slate-900 tracking-wider">
                              {card.id}
                            </div>
                          </div>

                          <StatusBadge status={card.status} />
                        </div>

                        <div className="text-xs space-y-1 text-slate-600 pt-2 border-t border-slate-200/60">
                          <div>
                            Credit Limit:{' '}
                            <strong>
                              ₹{card.creditLimit.toLocaleString('en-IN')}
                            </strong>
                          </div>

                          <div>
                            Expiry Date:{' '}
                            <strong>{card.expiryDate}</strong>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <Link
                            href={`/manager/cards/${card.id}?customerId=${selectedCustomer.id}`}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                          >
                            Card Review & Status Controls →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* =========================
              CARD APPROVALS
          ========================= */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Card Approvals
              </h2>

              <p className="text-xs text-slate-500">
                Review credit cards that are waiting for manager approval.
              </p>
            </div>

            {loadingApprovals ? (
              <p className="text-sm text-slate-500">
                Loading pending card approvals...
              </p>
            ) : pendingCards.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-xs">
                No cards are currently pending approval.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Customer ID
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Customer Name
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Card ID
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Credit Limit
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Issue Date
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Status
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {pendingCards.map((card) => (
                      <tr
                        key={card.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {card.customerId}
                        </td>

                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {card.customerName || '—'}
                        </td>

                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {card.id}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-700">
                          ₹{card.creditLimit.toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {card.issueDate}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={card.status} />
                        </td>

                        <td className="px-4 py-3">
                          <Link
                            href={`/manager/cards/${card.id}?customerId=${card.customerId}`}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Review →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* =========================
              RISK ANALYSIS
          ========================= */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Risk Analysis
              </h2>

              <p className="text-xs text-slate-500">
                Risk assessment based on card utilization and payment behavior.
              </p>
            </div>

            {loadingRisk ? (
              <p className="text-sm text-slate-500">
                Loading risk analysis...
              </p>
            ) : riskAnalysis.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-xs">
                No risk analysis data available.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-[1000px] w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Customer ID
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Customer Name
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Card ID
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                        Credit Utilization
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                        Payment Ratio
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                        Overdue Rate
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                        Partial Payment Rate
                      </th>

                      {/* Sticky Risk Status */}
                      <th className="sticky right-[80px] z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Risk Status
                      </th>

                      {/* Sticky Action */}
                      <th className="sticky right-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {riskAnalysis.map((risk) => (
                      <tr
                        key={risk.cardId}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {risk.customerId}
                        </td>

                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {risk.customerName}
                        </td>

                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {risk.cardId}
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {risk.creditUtilization.toFixed(2)}%
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {risk.paymentRatio.toFixed(2)}%
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {risk.overdueRate.toFixed(2)}%
                        </td>

                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {risk.partialPaymentRate.toFixed(2)}%
                        </td>

                        {/* Sticky Risk Status */}
                        <td className="sticky right-[80px] z-10 bg-white px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${risk.riskStatus === 'HIGH'
                                ? 'bg-red-100 text-red-700'
                                : risk.riskStatus === 'MEDIUM'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                          >
                            {risk.riskStatus}
                          </span>
                        </td>

                        {/* Sticky Action */}
                        <td className="sticky right-0 z-10 bg-white px-4 py-3">
                          <Link
                            href={`/manager/cards/${risk.cardId}?customerId=${risk.customerId}`}
                            className="inline-flex whitespace-nowrap px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}