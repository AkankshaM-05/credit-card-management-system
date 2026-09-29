export type UserRole =
  | 'ADMIN'
  | 'CUSTOMER'
  | 'EMPLOYEE'
  | 'MANAGER';

export type StaffRole =
  | 'EMPLOYEE'
  | 'MANAGER';

export type CardStatus =
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'CLOSED';

export type BillingStatus =
  | 'DUE'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE';

export type PaymentStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING';

export type TransactionType =
  | 'PURCHASE'
  | 'REFUND'
  | 'REVERSAL';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
}

export interface UserAccount {
  id: string;
  username: string;
  userType: UserRole;
  customerId?: string;
  staffId?: string;
}

export interface CreditCard {
  id: string;
  customerId: string;
  customerName?: string;
  cardNumberMasked?: string;
  creditLimit: number;
  issueDate: string;
  expiryDate: string;
  status: CardStatus;
}

export interface CardTransaction {
  id: string;
  cardId: string;
  merchantId: string;
  merchantName?: string;
  amount: number;
  date: string;
  type: TransactionType;
}

export interface BillingStatement {
  id: string;
  cardId: string;
  billingStartDate: string;
  billingEndDate: string;
  transactionAmount: number;
  amountPaid: number;
  dueDate: string;
  status: BillingStatus;
}

export interface Payment {
  id: string;
  statementId: string;
  amountPaid: number;
  paymentDate: string;
  paymentStatus: "SUCCESS" | "FAILED" | "PENDING";
}

export interface Merchant {
  id: string;
  name: string;
  category?: string;
}

export interface AuditLog {
  id: string;
  staffId: string;
  cardId: string;
  action: string;
  reason?: string;
  timestamp: string;
}

export interface CurrentUserSession {
  username: string;
  name: string;
  role: UserRole;
  customerId?: string;
  staffId?: string;
}