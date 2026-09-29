import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function FormInput({ label, error, helperText, className = '', id, ...props }: FormInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors disabled:bg-slate-50 disabled:text-slate-500 ${
          error ? 'border-rose-500 focus:ring-rose-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
