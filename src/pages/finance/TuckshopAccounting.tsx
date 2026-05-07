import React, { useState, useMemo } from 'react';
import { Printer, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { useAccounting, selectEntries, type JournalSource } from '@/lib/accounting-store';

const SOURCE_LABEL: Record<JournalSource, string> = {
  TUCKSHOP_SALE: 'Sale',
  TUCKSHOP_REFUND: 'Refund',
  TUCKSHOP_VOID: 'Void',
  TUCKSHOP_WASTAGE: 'Wastage',
  MANUAL: 'Manual',
};

export default function TuckshopAccounting() {
  const entries = useAccounting(selectEntries);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [source, setSource] = useState<'ALL' | JournalSource>('ALL');

  const filtered = useMemo(() => entries.filter(e => {
    if (!e.source.startsWith('TUCKSHOP')) return false;
    const d = e.date.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (source !== 'ALL' && e.source !== source) return false;
    return true;
  }), [entries, from, to, source]);

  const totals = useMemo(() => {
    let sales = 0, refunds = 0, voids = 0, wastage = 0, cogs = 0, cashIn = 0, cashOut = 0;
    for (const e of filtered) {
      const revenue = e.lines.find(l => l.accountCode === '4300')?.credit ?? 0;
      const refund = e.lines.find(l => l.accountCode === '4310')?.debit ?? 0;
      const cogsLine = e.lines.find(l => l.accountCode === '5500');
      const wastageLine = e.lines.find(l => l.accountCode === '5600')?.debit ?? 0;
      if (e.source === 'TUCKSHOP_SALE') sales += revenue;
      if (e.source === 'TUCKSHOP_REFUND') refunds += refund;
      if (e.source === 'TUCKSHOP_VOID') voids += refund;
      if (e.source === 'TUCKSHOP_WASTAGE') wastage += wastageLine;
      cogs += (cogsLine?.debit ?? 0) - (cogsLine?.credit ?? 0);
      if (e.cashImpact) {
        if (e.cashImpact.amount >= 0) cashIn += e.cashImpact.amount;
        else cashOut += -e.cashImpact.amount;
      }
    }
    return { sales, refunds, voids, wastage, cogs, cashIn, cashOut, net: sales - refunds - voids - cogs - wastage };
  }, [filtered]);

  const exportCSV = () => {
    const rows = [['Date', 'Ref', 'Source', 'Description', 'Account', 'Debit', 'Credit']];
    filtered.forEach(e => e.lines.forEach(l => rows.push([
      e.date.slice(0, 10), e.ref, SOURCE_LABEL[e.source], e.description,
      `${l.accountCode} ${l.accountName}`, l.debit.toFixed(2), l.credit.toFixed(2),
    ])));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'tuckshop-accounting.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Tuckshop Accounting</h1>
          <p className="text-sm text-muted-foreground">Auto-posted journals from POS sales, refunds, voids and wastage</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
            <Download size={18} /> Export CSV
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <Card className="light-card-blue print:hidden">
        <CardContent className="pt-4 space-y-3">
          <ReportFilters dateFrom={from} dateTo={to} onDateFromChange={setFrom} onDateToChange={setTo} />
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'TUCKSHOP_SALE', 'TUCKSHOP_REFUND', 'TUCKSHOP_VOID', 'TUCKSHOP_WASTAGE'] as const).map(s => (
              <button key={s} onClick={() => setSource(s)} className={`px-3 py-1.5 rounded-md text-xs font-medium border ${source === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-input hover:bg-muted'}`}>
                {s === 'ALL' ? 'All' : SOURCE_LABEL[s]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        <SummaryCard label="Gross Sales" value={totals.sales} tone="success" />
        <SummaryCard label="Refunds + Voids" value={totals.refunds + totals.voids} tone="warning" />
        <SummaryCard label="COGS" value={totals.cogs} tone="muted" />
        <SummaryCard label="Wastage" value={totals.wastage} tone="destructive" />
        <SummaryCard label="Cash In" value={totals.cashIn} tone="success" />
        <SummaryCard label="Cash Out" value={totals.cashOut} tone="destructive" />
        <SummaryCard label="Net Margin" value={totals.net} tone="primary" />
        <SummaryCard label="Entries" value={filtered.length} tone="muted" plain />
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="p-6">
          <ReportHeader reportTitle="Tuckshop Accounting Journal" subtitle={from || to ? `${from || '...'} to ${to || '...'}` : `As at ${new Date().toLocaleDateString()}`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ref</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description / Account</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Debit</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Credit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No tuckshop accounting entries yet. Process a sale in the POS to generate journals automatically.</td></tr>
              )}
              {filtered.map(e => (
                <React.Fragment key={e.id}>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="px-4 py-2 text-foreground">{e.date.slice(0, 10)}</td>
                    <td className="px-4 py-2 font-mono text-xs text-primary">{e.ref}</td>
                    <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{SOURCE_LABEL[e.source]}</span></td>
                    <td className="px-4 py-2 text-foreground" colSpan={3}>{e.description} {e.sourceRef && <span className="text-muted-foreground">[{e.sourceRef}]</span>}</td>
                  </tr>
                  {e.lines.map((l, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={3}></td>
                      <td className="px-4 py-1.5 pl-8 text-xs text-foreground"><span className="font-mono text-muted-foreground">{l.accountCode}</span> {l.accountName}</td>
                      <td className="px-4 py-1.5 text-right text-xs text-foreground">{l.debit > 0 ? `$${l.debit.toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-1.5 text-right text-xs text-foreground">{l.credit > 0 ? `$${l.credit.toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone, plain }: { label: string; value: number; tone: 'success' | 'warning' | 'destructive' | 'primary' | 'muted'; plain?: boolean }) {
  const colors: Record<string, string> = {
    success: 'text-success', warning: 'text-warning', destructive: 'text-destructive',
    primary: 'text-primary', muted: 'text-foreground',
  };
  return (
    <div className="bg-card rounded-xl p-4 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${colors[tone]}`}>{plain ? value : `$${value.toFixed(2)}`}</p>
    </div>
  );
}
