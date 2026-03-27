import React from 'react';

interface ReportFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  children?: React.ReactNode;
}

export default function ReportFilters({ dateFrom, dateTo, onDateFromChange, onDateToChange, children }: ReportFiltersProps) {
  const selectClass = "px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="flex gap-3 flex-wrap items-end print:hidden">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Date From</label>
        <input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} className={selectClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Date To</label>
        <input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} className={selectClass} />
      </div>
      {children}
    </div>
  );
}
