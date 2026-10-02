'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { StatusBadge } from '@/components/StatusBadge';
import {
  getMyCustomer,
  getMyCards,
  getCurrentUser
} from '@/lib/api';
import { Customer, CreditCard, CurrentUserSession } from '@/lib/types';

export default function CustomerDashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserSession | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomerData() {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user) {
        const cust = await getMyCustomer();
        setCustomer(cust);

        if (cust) {
          const cardList = await getMyCards();
          setCards(cardList);
        }
      }

      setLoading(false);
    }

    loadCustomerData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar role="CUSTOMER" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Customer Dashboard"
          userName={customer?.name || currentUser?.name || 'Customer'}
          role="CUSTOMER"
          setMobileOpen={setMobileOpen}
        />

        <main className="p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* My Details Card */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">My Details</h2>
                <p className="text-xs text-slate-500">View-only profile information</p>
              </div>
              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                View Only
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading details...</p>
            ) : customer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer ID</div>
                  <div className="text-sm font-mono font-bold text-slate-900 mt-1">{customer.id}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">{customer.name}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</div>
                  <div className="text-sm text-slate-800 mt-1">{customer.phone}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</div>
                  <div className="text-sm text-slate-800 mt-1">{customer.email}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 text-slate-600 text-sm">
                No customer profile details linked to current session.
              </div>
            )}
          </section>

          {/* My Credit Cards Section */}
          <section id="cards" className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Credit Cards</h2>
              <p className="text-xs text-slate-500">Click on any card to view transactions, billing statements, and payments</p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
                Loading credit cards...
              </div>
            ) : cards.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
                <svg
                  className="mx-auto h-10 w-10 text-slate-300 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-600">No credit cards found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/customer/cards/${card.id}`}
                    className="block bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl p-6 shadow-2xs transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
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

                    <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Credit Limit:</span>
                        <span className="font-semibold text-slate-900">${card.creditLimit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Issue Date:</span>
                        <span className="font-medium text-slate-800">{card.issueDate}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Expiry Date:</span>
                        <span className="font-medium text-slate-800">{card.expiryDate}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 text-right">
                      <span className="text-xs font-semibold text-blue-600 group-hover:underline inline-flex items-center">
                        View Card Details & History →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
