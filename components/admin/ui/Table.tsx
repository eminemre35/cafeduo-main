import React from 'react';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <div className="overflow-x-auto rounded-2xl border border-[#E8DCC9] bg-[#FAF7F0]">
    <table {...rest} className={`w-full text-left ${className}`}>
      {children}
    </table>
  </div>
);

export const THead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-[#F2EBE0]/60 border-b border-[#E8DCC9]">
    <tr>{children}</tr>
  </thead>
);

export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <th
    {...rest}
    className={
      'px-5 py-3.5 text-[0.6875rem] uppercase tracking-[0.1em] font-semibold ' +
      `text-[#6B5B4D] ${className}`
    }
  >
    {children}
  </th>
);

export const TBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="[&>tr]:border-b [&>tr]:border-[#E8DCC9]/70 [&>tr:last-child]:border-0 [&>tr]:transition-colors [&>tr:hover]:bg-[#F2EBE0]/40">
    {children}
  </tbody>
);

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <td {...rest} className={`px-5 py-4 text-[0.9375rem] text-[#1C1814] align-middle ${className}`}>
    {children}
  </td>
);
