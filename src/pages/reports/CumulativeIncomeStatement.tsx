import React, { useState } from 'react';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';
import { glAccounts } from '@/lib/dummy-data';
import { Printer, TrendingUp, TrendingDown, Building2, BarChart3 } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Simulated per-branch financial data
function getBranchFinancials(branchId: string, branchName: string) {
  const multipliers: Record<string, number> = { '1': 1, '2': 0.75, '3': 0.55 };
  const m = multipliers[branchId] || 0.5 + Math.random() * 0.5;

  const revenue = glAccounts.filter(a => a.type === 'Revenue').map(a => ({
    ...a, balance: Math.round(a.balance * m),
  }));
  const expenses = glAccounts.filter(a => a.type === 'Expense').map(a => ({
    ...a, balance: Math.round(a.balance * m),
  }));

  const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);

  return {
    branchId, branchName, revenue, expenses,
    totalRevenue, totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0,
  };
}

export default function CumulativeIncomeStatement() {
  const { user } = useAuth();
  const { branches } = useBranch();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  if (user?.role !== 'superadmin') {
    return <div className="p-8 text-center text-muted-foreground">Access denied. Only Super Administrators can view cumulative reports.</div>;
  }

  const activeBranches = branches.filter(b => b.status === 'Active');
  const branchData = activeBranches.map(b => getBranchFinancials(b.id, b.name));

  const grandTotalRevenue = branchData.reduce((s, b) => s + b.totalRevenue, 0);
  const grandTotalExpenses = branchData.reduce((s, b) => s + b.totalExpenses, 0);
  const grandNetIncome = grandTotalRevenue - grandTotalExpenses;
  const grandMargin = grandTotalRevenue > 0 ? (grandNetIncome / grandTotalRevenue * 100) : 0;

  const bestBranch = branchData.reduce((best, b) => b.netIncome > best.netIncome ? b : best, branchData[0]);
  const worstBranch = branchData.reduce((worst, b) => b.netIncome < worst.netIncome ? b : worst, branchData[0]);

  const subtitle = dateFrom || dateTo
    ? `For the period ${dateFrom || '...'} to ${dateTo || '...'}`
    : `For the period ending ${new Date().toLocaleDateString()}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cumulative Income Statement</h1>
          <p className="text-sm text-muted-foreground">All branches performance analysis · Superadmin only</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
          <Printer size={18} /> Print Report
        </button>
      </div>

      <Card className="light-card-blue print:hidden">
        <CardContent className="pt-4">
          <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 className="text-primary" size={20} /></div>
              <div>
                <p className="text-xl font-bold text-foreground">${grandTotalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingDown className="text-destructive" size={20} /></div>
              <div>
                <p className="text-xl font-bold text-foreground">${grandTotalExpenses.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="text-success" size={20} /></div>
              <div>
                <p className={`text-xl font-bold ${grandNetIncome >= 0 ? 'text-success' : 'text-destructive'}`}>${grandNetIncome.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Net Income ({grandMargin.toFixed(1)}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="text-primary" size={20} /></div>
              <div>
                <p className="text-xl font-bold text-foreground">{activeBranches.length}</p>
                <p className="text-xs text-muted-foreground">Active Branches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="comparison" className="print:hidden">
        <TabsList>
          <TabsTrigger value="comparison">Branch Comparison</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Breakdown</TabsTrigger>
          <TabsTrigger value="analysis">Performance Analysis</TabsTrigger>
        </TabsList>

        {/* Tab 1: Comparison Table */}
        <TabsContent value="comparison">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-3 font-semibold text-foreground">Branch</th>
                      <th className="text-right py-3 px-3 font-semibold text-foreground">Revenue</th>
                      <th className="text-right py-3 px-3 font-semibold text-foreground">Expenses</th>
                      <th className="text-right py-3 px-3 font-semibold text-foreground">Net Income</th>
                      <th className="text-right py-3 px-3 font-semibold text-foreground">Margin %</th>
                      <th className="text-right py-3 px-3 font-semibold text-foreground">Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchData.map(b => (
                      <tr key={b.branchId} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-3 font-medium text-foreground">{b.branchName}</td>
                        <td className="py-3 px-3 text-right text-foreground">${b.totalRevenue.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-foreground">${b.totalExpenses.toLocaleString()}</td>
                        <td className={`py-3 px-3 text-right font-semibold ${b.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${b.netIncome.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-foreground">{b.margin.toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right text-muted-foreground">
                          {grandTotalRevenue > 0 ? (b.totalRevenue / grandTotalRevenue * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-primary font-bold">
                      <td className="py-3 px-3 text-foreground">Grand Total</td>
                      <td className="py-3 px-3 text-right text-foreground">${grandTotalRevenue.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-foreground">${grandTotalExpenses.toLocaleString()}</td>
                      <td className={`py-3 px-3 text-right ${grandNetIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                        ${grandNetIncome.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-foreground">{grandMargin.toFixed(1)}%</td>
                      <td className="py-3 px-3 text-right text-muted-foreground">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Detailed per-branch */}
        <TabsContent value="detailed" className="space-y-6">
          {branchData.map(b => (
            <Card key={b.branchId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 size={18} className="text-primary" /> {b.branchName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold text-foreground mb-2">Revenue</h4>
                {b.revenue.map(acc => (
                  <div key={acc.code} className="flex justify-between py-1.5 px-2 text-sm hover:bg-muted/50 rounded">
                    <span className="text-foreground">{acc.name}</span>
                    <span className="font-medium text-foreground">${acc.balance.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-2 mt-1 border-t border-border font-semibold text-sm">
                  <span className="text-foreground">Total Revenue</span>
                  <span className="text-success">${b.totalRevenue.toLocaleString()}</span>
                </div>

                <h4 className="font-semibold text-foreground mb-2 mt-4">Expenses</h4>
                {b.expenses.map(acc => (
                  <div key={acc.code} className="flex justify-between py-1.5 px-2 text-sm hover:bg-muted/50 rounded">
                    <span className="text-foreground">{acc.name}</span>
                    <span className="font-medium text-foreground">${acc.balance.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-2 mt-1 border-t border-border font-semibold text-sm">
                  <span className="text-foreground">Total Expenses</span>
                  <span className="text-destructive">${b.totalExpenses.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-3 px-2 border-t-2 border-primary font-bold text-base mt-4">
                  <span className="text-foreground">Net Income</span>
                  <span className={b.netIncome >= 0 ? 'text-success' : 'text-destructive'}>${b.netIncome.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 3: Performance Analysis */}
        <TabsContent value="analysis">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Best Performing Branch</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="text-success" size={24} /></div>
                  <div>
                    <p className="font-semibold text-foreground text-lg">{bestBranch?.branchName}</p>
                    <p className="text-sm text-muted-foreground">Highest net income</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-sm font-bold text-foreground">${bestBranch?.totalRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-sm font-bold text-foreground">${bestBranch?.totalExpenses.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Expenses</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-sm font-bold text-success">${bestBranch?.netIncome.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Net Income</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Lowest Performing Branch</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center"><TrendingDown className="text-warning" size={24} /></div>
                  <div>
                    <p className="font-semibold text-foreground text-lg">{worstBranch?.branchName}</p>
                    <p className="text-sm text-muted-foreground">Lowest net income</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-sm font-bold text-foreground">${worstBranch?.totalRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-sm font-bold text-foreground">${worstBranch?.totalExpenses.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Expenses</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className={`text-sm font-bold ${(worstBranch?.netIncome ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>${worstBranch?.netIncome.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Net Income</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Distribution */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Revenue Distribution by Branch</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {branchData.map(b => {
                    const pct = grandTotalRevenue > 0 ? (b.totalRevenue / grandTotalRevenue * 100) : 0;
                    return (
                      <div key={b.branchId}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-foreground">{b.branchName}</span>
                          <span className="text-muted-foreground">${b.totalRevenue.toLocaleString()} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Printable consolidated report */}
      <div className="hidden print:block bg-card rounded-xl p-6 max-w-3xl">
        <ReportHeader reportTitle="Cumulative Income Statement — All Branches" subtitle={subtitle} />
        {branchData.map(b => (
          <div key={b.branchId} className="mb-6">
            <h3 className="font-display font-semibold text-card-foreground mb-2 text-base border-b border-border pb-1">{b.branchName}</h3>
            <div className="flex justify-between py-1 text-sm"><span>Total Revenue</span><span className="font-medium">${b.totalRevenue.toLocaleString()}</span></div>
            <div className="flex justify-between py-1 text-sm"><span>Total Expenses</span><span className="font-medium">${b.totalExpenses.toLocaleString()}</span></div>
            <div className="flex justify-between py-1 text-sm font-bold border-t border-border mt-1 pt-1">
              <span>Net Income</span><span className={b.netIncome >= 0 ? 'text-success' : 'text-destructive'}>${b.netIncome.toLocaleString()}</span>
            </div>
          </div>
        ))}
        <div className="border-t-2 border-primary pt-3 mt-4">
          <div className="flex justify-between text-base font-bold">
            <span>Grand Total Revenue</span><span>${grandTotalRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Grand Total Expenses</span><span>${grandTotalExpenses.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t-2 border-primary">
            <span>Grand Net Income</span>
            <span className={grandNetIncome >= 0 ? 'text-success' : 'text-destructive'}>${grandNetIncome.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
