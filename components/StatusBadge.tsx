import React from 'react';
import { CardStatus, BillingStatus, TransactionType } from '@/lib/types';

type AllStatus =
  CardStatus |
  BillingStatus |
  TransactionType |
  'ACTIVE' |
  'INACTIVE' |
  string;

interface StatusBadgeProps {
  status: AllStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    case 'ACTIVE':
    case 'PAID':
    case 'SUCCESS':
      badgeStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'PENDING_APPROVAL':
    case 'PENDING':
    case 'DUE':
      badgeStyles = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'PARTIAL':
      badgeStyles = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'BLOCKED':
    case 'OVERDUE':
    case 'FAILED':
    case 'INACTIVE':
      badgeStyles = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'CLOSED':
      badgeStyles = 'bg-slate-100 text-slate-600 border-slate-300';
      break;
    default:
      badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  const formattedText = status ? status.replace(/_/g, ' ') : '';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyles}`}>
      {formattedText}
    </span>
  );
}
