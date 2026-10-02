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
} from '@/lib/api';
import { Customer, CreditCard } from '@/lib/types';

export default function EmployeeDashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Customer Search & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  // Customer Cards
  const [customerCards, setCustomerCards] = useState<CreditCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Selected Card
  const [selectedCard, setSelectedCard] =
    useState<CreditCard | null>(null);

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
    setSelectedCard(null);
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

  const handleChangeCustomer = () => {
    setSelectedCustomer(null);
    setSelectedCard(null);
    setCustomerCards([]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSelectCard = (card: CreditCard) => {
    setSelectedCard((current) =>
      current?.id === card.id ? null : card
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        role="EMPLOYEE"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Employee Dashboard"
          role="EMPLOYEE"
          setMobileOpen={setMobileOpen}
        />

        {/* Customer Search Section */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Search & Select Customer
            </h2>

            <p className="text-xs text-slate-500">
              Search for a customer using their unique Customer ID
              before creating cards or entering transactions.
            </p>
          </div>

          {/* Live Customer Search */}
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

          {/* Search Results / Suggestions */}
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
                    <span className="font-mono text-xs text-slate-500 mr-3">
                      {cust.id}
                    </span>

                    <span className="font-semibold text-slate-900 text-sm">
                      {cust.name}
                    </span>

                    <div className="text-xs text-slate-500 mt-1">
                      {cust.phone} • {cust.email}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1 bg-slate-900 text-white text-xs font-medium rounded-md"
                  >
                    Select Customer →
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
                No customers found matching "{searchQuery}".
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

        {/* Selected Customer Panel */}
        {selectedCustomer && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-400">
                  SELECTED CUSTOMER
                </span>

                <h3 className="text-xl font-bold text-slate-900">
                  {selectedCustomer.name}
                </h3>

                <div className="flex items-center space-x-4 text-xs text-slate-600 mt-1">
                  <span>
                    ID:{' '}
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
                onClick={handleChangeCustomer}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 underline"
              >
                Change Customer
              </button>
            </div>

            {/* Customer Credit Cards */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h4 className="text-base font-bold text-slate-900">
                  Customer Credit Cards
                </h4>

                <Link
                  href={`/employee/cards/new?customerId=${selectedCustomer.id}`}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                >
                  + Create New Card for {selectedCustomer.name}
                </Link>
              </div>

              {loadingCards ? (
                <p className="text-sm text-slate-500">
                  Loading cards...
                </p>
              ) : customerCards.length === 0 ? (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-xs">
                  No credit cards found for this customer.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerCards.map((card) => {
                    const isSelected = selectedCard?.id === card.id;

                    return (
                      <div key={card.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectCard(card)}
                          className={`w-full text-left bg-slate-50 border rounded-lg p-4 space-y-3 transition-colors ${isSelected
                            ? 'border-blue-500 bg-blue-50/40'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/20'
                            }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-xs font-mono font-semibold text-slate-500">
                                CARD ID
                              </div>

                              <div className="text-sm font-mono font-bold text-slate-900">
                                {card.id}
                              </div>
                            </div>

                            <StatusBadge status={card.status} />
                          </div>

                          <div className="text-xs space-y-1 text-slate-600 pt-2 border-t border-slate-200/60">
                            <div>
                              Credit Limit:{' '}
                              <strong>
                                ${card.creditLimit.toLocaleString()}
                              </strong>
                            </div>

                            <div>
                              Expiry:{' '}
                              <strong>{card.expiryDate}</strong>
                            </div>
                          </div>

                          <div className="text-xs text-slate-400 pt-1">
                            {isSelected
                              ? 'Card selected'
                              : 'Click to view card actions'}
                          </div>
                        </button>

                        {/* Card Actions */}
                        {isSelected && (
                          <div className="mt-2 flex justify-end space-x-2">
                            <Link
                              href={`/employee/transactions/new?cardId=${card.id}&customerId=${selectedCustomer.id}`}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors"
                            >
                              Record Transaction →
                            </Link>

                            <Link
                              href={`/employee/payments/new?cardId=${card.id}&customerId=${selectedCustomer.id}`}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors"
                            >
                              Record Payment
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}