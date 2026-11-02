import { useCallback, useEffect, useState } from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { uniformsApi, type StudentStatement } from '@/lib/uniforms-api';
import ReportHeader from '@/components/ReportHeader';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCw } from 'lucide-react';

export default function PortalFees() {
  const student = usePortalStudent();
  const [statement, setStatement] = useState<StudentStatement>({ currencies: [], lines: [] });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setStatement(await uniformsApi.statement()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Cannot load statement.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const money = (value: string) => Number(value).toFixed(2);
  return <div className="space-y-6 text-foreground">
    <header className="flex flex-wrap justify-between gap-3 no-print"><h1 className="font-display text-2xl font-bold">Student Account Statement</h1><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw />Refresh</Button><Button variant="outline" onClick={() => window.print()} disabled={loading || !!error}><Printer />Print</Button></div></header>
    <ReportHeader reportTitle="Student Account Statement" subtitle={`${student.firstName} ${student.lastName} · ${student.regNumber}`} />
    {error && <p role="alert" className="p-4 border border-destructive/30 rounded-md text-destructive bg-destructive/10">{error}</p>}
    {loading ? <p className="text-muted-foreground">Loading statement…</p> : !error && !statement.lines.length ? <p className="text-muted-foreground">No transactions on your account.</p> : null}
    {!error && statement.currencies.map(currency => {
      const lines = statement.lines.filter(l => l.currency === currency);
      const charges = lines.reduce((s, l) => s + Number(l.debit), 0); const payments = lines.reduce((s, l) => s + Number(l.credit), 0);
      return <section key={currency} className="space-y-3"><h2 className="font-semibold">{currency}</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-muted-foreground border-b border-border"><th className="text-left py-2">Date</th><th className="text-left">Description / payment allocation</th><th className="text-left">Reference</th><th className="text-right">Charge</th><th className="text-right">Payment</th><th className="text-right">Balance</th></tr></thead><tbody>{lines.map((l, i) => <tr key={`${l.reference}-${i}`} className="border-b border-border"><td className="py-3 pr-3 whitespace-nowrap">{l.date}</td><td className="pr-3 min-w-48">{l.description}<span className="block text-xs text-muted-foreground">{l.category}</span>{l.allocations?.map((a, j) => <span key={j} className="block text-xs text-muted-foreground">{a.description}: {money(a.amount)}</span>)}</td><td className="text-xs pr-3">{l.reference}</td><td className="text-right">{Number(l.debit) ? money(l.debit) : '—'}</td><td className="text-right text-success">{Number(l.credit) ? money(l.credit) : '—'}</td><td className="text-right font-medium">{money(l.balance)}</td></tr>)}</tbody></table></div><div className="flex flex-wrap justify-between gap-3 border-t border-primary pt-3 font-semibold"><span>Charges {currency} {charges.toFixed(2)}</span><span>Payments {currency} {payments.toFixed(2)}</span><span>Balance {currency} {money(lines.at(-1)?.balance || '0')}</span></div></section>;
    })}
  </div>;
}