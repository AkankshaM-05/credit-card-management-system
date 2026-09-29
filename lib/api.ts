import {
  Customer,
  StaffUser,
  UserAccount,
  CreditCard,
  CardTransaction,
  BillingStatement,
  Payment,
  CardStatus,
  CurrentUserSession,
  Merchant,
} from './types';

/*
 * Frontend API client.
 * Sends HTTP requests to the Next.js backend routes.
 * No database logic belongs here.
 */

// ==================== AUTH ====================

export async function loginUser(
  username: string,
  password: string
): Promise<CurrentUserSession> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!res.ok) {
    throw new Error('Invalid username or password.');
  }

  return await res.json();
}

export async function getCurrentUser(): Promise<CurrentUserSession | null> {
  const res = await fetch('/api/auth/me');

  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    throw new Error('Failed to get current user.');
  }

  return await res.json();
}

export async function logoutUser(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error('Failed to logout.');
  }
}

// ==================== CUSTOMER ====================

export async function fetchCustomersList(): Promise<Customer[]> {
  const res = await fetch('/api/customers');

  if (!res.ok) {
    throw new Error('Failed to fetch customers.');
  }

  return await res.json();
}

export async function searchCustomers(
  query: string
): Promise<Customer[]> {
  if (!query.trim()) {
    return [];
  }

  const res = await fetch(
    `/api/customers?search=${encodeURIComponent(query)}`
  );

  if (!res.ok) {
    throw new Error('Failed to search customers.');
  }

  return await res.json();
}

export async function fetchCustomerById(
  customerId: string
): Promise<Customer> {
  const res = await fetch(`/api/customers?id=${customerId}`);

  if (!res.ok) {
    throw new Error('Failed to fetch customer.');
  }

  return await res.json();
}

export async function getMyCustomer(): Promise<Customer> {
  const res = await fetch('/api/customers?me=true');

  if (!res.ok) {
    throw new Error('Failed to fetch customer information.');
  }

  return await res.json();
}

export async function createCustomer(data: {
  name: string;
  phone: string;
  email: string;
  username: string;
  password: string;
}): Promise<Customer> {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('Failed to create customer.');
  }

  return await res.json();
}

// ==================== STAFF ====================

export async function fetchStaffList(): Promise<StaffUser[]> {
  const res = await fetch('/api/staff');

  if (!res.ok) {
    throw new Error('Failed to fetch staff.');
  }

  return await res.json();
}

export async function createStaff(data: {
  name: string;
  username: string;
  password: string;
  role: 'EMPLOYEE' | 'MANAGER';
}): Promise<StaffUser> {
  const res = await fetch('/api/staff', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('Failed to create staff account.');
  }

  return await res.json();
}

// ==================== ACCOUNT ====================

export async function fetchAccounts(): Promise<UserAccount[]> {
  const res = await fetch('/api/accounts');

  if (!res.ok) {
    throw new Error('Failed to fetch accounts.');
  }

  return await res.json();
}

export async function fetchAccountSummary(): Promise<{
  totalCustomers: number;
  totalEmployees: number;
  totalManagers: number;
}> {
  const res = await fetch('/api/accounts?summary=true');

  if (!res.ok) {
    throw new Error('Failed to fetch account summary.');
  }

  return await res.json();
}

// ==================== MERCHANT ====================

export async function fetchMerchants(): Promise<Merchant[]> {
  const res = await fetch('/api/merchants');

  if (!res.ok) {
    throw new Error('Failed to fetch merchants.');
  }

  return await res.json();
}

// ==================== CARD ====================

export async function createCreditCard(data: {
  customerId: string;
  creditLimit: number;
  issueDate: string;
  expiryDate: string;
}): Promise<CreditCard> {
  const res = await fetch('/api/cards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('Failed to create credit card.');
  }

  return await res.json();
}

export async function fetchCardsByCustomer(
  customerId: string
): Promise<CreditCard[]> {
  const res = await fetch(`/api/cards?customerId=${customerId}`);

  if (!res.ok) {
    throw new Error('Failed to fetch cards.');
  }

  return await res.json();
}

export async function fetchCardById(
  cardId: string
): Promise<CreditCard> {
  const res = await fetch(`/api/cards?id=${cardId}`);

  if (!res.ok) {
    throw new Error('Failed to fetch card.');
  }

  return await res.json();
}

export async function updateCardStatus(
  cardId: string,
  status: CardStatus,
  staffId: string
): Promise<CreditCard> {
  const res = await fetch(`/api/cards?id=${cardId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, staffId }),
  });

  if (!res.ok) {
    throw new Error('Failed to update card status.');
  }

  return await res.json();
}

export async function getMyCards(): Promise<CreditCard[]> {
  const res = await fetch('/api/cards?me=true');

  if (!res.ok) {
    throw new Error('Failed to fetch your credit cards.');
  }

  return await res.json();
}

// ==================== TRANSACTION ====================

export async function createTransaction(data: {
  cardId: string;
  merchantId: string;
  amount: number;
  date: string;
  type: 'PURCHASE' | 'REFUND' | 'REVERSAL';
}): Promise<CardTransaction> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cardId: data.cardId,
      merchantId: data.merchantId,
      amount: data.amount,
      transactionDate: data.date,
      transactionType: data.type,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to record transaction.');
  }

  return await res.json();
}

export async function fetchTransactionsByCard(
  cardId: string
): Promise<CardTransaction[]> {
  const res = await fetch(
    `/api/transactions?cardId=${cardId}`
  );

  if (!res.ok) {
    throw new Error('Failed to fetch transactions.');
  }

  return await res.json();
}

// ==================== BILLING ====================

export async function fetchBillingStatementsByCard(
  cardId: string
): Promise<BillingStatement[]> {
  const res = await fetch(
    `/api/billing?cardId=${cardId}`
  );

  if (!res.ok) {
    throw new Error('Failed to fetch billing statements.');
  }

  return await res.json();
}

export async function fetchBillingStatementById(
  statementId: string
): Promise<BillingStatement> {
  const res = await fetch(
    `/api/billing?statementId=${statementId}`
  );

  if (!res.ok) {
    throw new Error('Failed to fetch billing statement.');
  }

  return await res.json();
}

// ==================== PAYMENT ====================

export async function createPayment(data: {
  statementId: string;
  amountPaid: number;
  paymentDate: string;
}) {
  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(
      result.error || 'Failed to record payment.'
    );
  }

  return result;
}

export async function fetchPaymentsByCard(
  cardId: string
): Promise<Payment[]> {
  const res = await fetch(
    `/api/payments?cardId=${cardId}`
  );

  if (!res.ok) {
    throw new Error('Failed to fetch payments.');
  }

  return await res.json();
}

// ==================== EXCEL IMPORT ====================

export async function importTransactions(file: File) {
  const formData = new FormData();

  formData.append('file', file);

  const res = await fetch('/api/transactions/import', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to import transactions.'
    );
  }

  return data;
}

export async function importPayments(file: File) {
  const formData = new FormData();

  formData.append('file', file);

  const res = await fetch('/api/payments/import', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to import payments.'
    );
  }

  return data;
}