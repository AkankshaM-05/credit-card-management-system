'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { FormInput } from '@/components/FormInput';
import { searchCustomers, getCurrentUser } from '@/lib/api';
import { Customer, CurrentUserSession } from '@/lib/types';

export default function ManagerCustomersPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserSession | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }

    loadUser();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await searchCustomers(query);
      setResults(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar role="MANAGER" mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Topbar
          title="Search Customers"
          userName={currentUser?.name || 'Manager'}
          role="MANAGER"
          setMobileOpen={setMobileOpen}
        />

        <main className="p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Search Customer Records</h2>
            <p className="text-xs text-slate-500 mb-6">Enter customer ID or name to perform management review</p>

            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <FormInput
                  label="Search Query"
                  placeholder="Customer ID (e.g. CUST-1001) or Name"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
          </section>

          {/* Results */}
          <section>
            {searched && results.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-sm">
                No matching customer accounts found.
              </div>
            ) : !searched ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-xs">
                Search for a customer to view their information.
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Matching Accounts ({results.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((cust) => (
                    <div
                      key={cust.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-mono font-semibold text-slate-500">{cust.id}</span>
                          <h4 className="text-base font-bold text-slate-900">{cust.name}</h4>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div>Phone: <strong>{cust.phone}</strong></div>
                        <div>Email: <strong>{cust.email}</strong></div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => router.push(`/manager?search=${cust.id}`)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                        >
                          Review Customer & Cards →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
