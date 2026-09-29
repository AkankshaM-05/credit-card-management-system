import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  emptyMessage = 'No data available.',
  loading = false
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
        <p className="text-sm">Loading records...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-500 my-2">
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
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-sm font-medium text-slate-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            {columns.map((col, idx) => (
              <th key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((row, rowIdx) => (
            <tr key={row.id ? String(row.id) : rowIdx} className="hover:bg-slate-50/80 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-4 py-3.5 text-slate-800 ${col.className || ''}`}>
                  {col.cell
                    ? col.cell(row)
                    : col.accessorKey
                    ? String(row[col.accessorKey] ?? '')
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
