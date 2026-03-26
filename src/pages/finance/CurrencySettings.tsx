import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Star, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isHome: boolean;
  rate: number; // rate to home currency
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'Cash' | 'Bank' | 'Mobile' | 'Card' | 'Cheque' | 'Other';
  isActive: boolean;
}

const defaultCurrencies: Currency[] = [
  { id: '1', code: 'USD', name: 'US Dollar', symbol: '$', isHome: true, rate: 1 },
  { id: '2', code: 'ZWG', name: 'Zimbabwe Gold', symbol: 'ZiG', isHome: false, rate: 27.5 },
  { id: '3', code: 'ZAR', name: 'South African Rand', symbol: 'R', isHome: false, rate: 18.2 },
  { id: '4', code: 'BWP', name: 'Botswana Pula', symbol: 'P', isHome: false, rate: 13.6 },
];

const defaultPaymentMethods: PaymentMethod[] = [
  { id: '1', name: 'Cash', type: 'Cash', isActive: true },
  { id: '2', name: 'Bank Transfer', type: 'Bank', isActive: true },
  { id: '3', name: 'EcoCash', type: 'Mobile', isActive: true },
  { id: '4', name: 'InnBucks', type: 'Mobile', isActive: true },
  { id: '5', name: 'Cheque', type: 'Cheque', isActive: true },
  { id: '6', name: 'POS / Card', type: 'Card', isActive: true },
  { id: '7', name: 'OneMoney', type: 'Mobile', isActive: false },
];

export default function CurrencySettings() {
  const [currencies, setCurrencies] = useState<Currency[]>(defaultCurrencies);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(defaultPaymentMethods);
  const [activeTab, setActiveTab] = useState<'currencies' | 'rates' | 'methods'>('currencies');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  const [currencyForm, setCurrencyForm] = useState({ code: '', name: '', symbol: '', isHome: false, rate: '1' });
  const [methodForm, setMethodForm] = useState({ name: '', type: 'Cash' as PaymentMethod['type'], isActive: true });
  const [rateDate, setRateDate] = useState(new Date().toISOString().split('T')[0]);

  const homeCurrency = currencies.find(c => c.isHome);

  const openEditCurrency = (c: Currency) => {
    setEditingCurrency(c);
    setCurrencyForm({ code: c.code, name: c.name, symbol: c.symbol, isHome: c.isHome, rate: String(c.rate) });
    setShowCurrencyModal(true);
  };

  const handleSaveCurrency = () => {
    if (!currencyForm.code || !currencyForm.name) return;
    if (editingCurrency) {
      setCurrencies(prev => prev.map(c => c.id === editingCurrency.id
        ? { ...c, code: currencyForm.code, name: currencyForm.name, symbol: currencyForm.symbol, isHome: currencyForm.isHome, rate: parseFloat(currencyForm.rate) || 1 }
        : currencyForm.isHome ? { ...c, isHome: false } : c
      ));
    } else {
      const newCur: Currency = { id: String(Date.now()), code: currencyForm.code, name: currencyForm.name, symbol: currencyForm.symbol, isHome: currencyForm.isHome, rate: parseFloat(currencyForm.rate) || 1 };
      if (currencyForm.isHome) {
        setCurrencies(prev => [...prev.map(c => ({ ...c, isHome: false })), newCur]);
      } else {
        setCurrencies(prev => [...prev, newCur]);
      }
    }
    setShowCurrencyModal(false);
    setEditingCurrency(null);
    setCurrencyForm({ code: '', name: '', symbol: '', isHome: false, rate: '1' });
  };

  const deleteCurrency = (id: string) => {
    const c = currencies.find(c => c.id === id);
    if (c?.isHome) return; // can't delete home currency
    setCurrencies(prev => prev.filter(c => c.id !== id));
  };

  const updateRate = (id: string, newRate: string) => {
    setCurrencies(prev => prev.map(c => c.id === id ? { ...c, rate: parseFloat(newRate) || c.rate } : c));
  };

  const openEditMethod = (m: PaymentMethod) => {
    setEditingMethod(m);
    setMethodForm({ name: m.name, type: m.type, isActive: m.isActive });
    setShowMethodModal(true);
  };

  const handleSaveMethod = () => {
    if (!methodForm.name) return;
    if (editingMethod) {
      setPaymentMethods(prev => prev.map(m => m.id === editingMethod.id ? { ...m, ...methodForm } : m));
    } else {
      setPaymentMethods(prev => [...prev, { id: String(Date.now()), ...methodForm }]);
    }
    setShowMethodModal(false);
    setEditingMethod(null);
    setMethodForm({ name: '', type: 'Cash', isActive: true });
  };

  const deleteMethod = (id: string) => setPaymentMethods(prev => prev.filter(m => m.id !== id));
  const toggleMethod = (id: string) => setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Currency & Payment Settings</h1>
          <p className="text-sm text-muted-foreground">Manage currencies, exchange rates, and payment methods</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign size={16} className="text-primary" />
          <span className="text-muted-foreground">Home Currency:</span>
          <span className="font-bold text-foreground">{homeCurrency?.code} ({homeCurrency?.symbol})</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {(['currencies', 'rates', 'methods'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab === 'currencies' ? 'Currencies' : tab === 'rates' ? 'Daily Rates' : 'Payment Methods'}
          </button>
        ))}
      </div>

      {/* Currencies Tab */}
      {activeTab === 'currencies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingCurrency(null); setCurrencyForm({ code: '', name: '', symbol: '', isHome: false, rate: '1' }); setShowCurrencyModal(true); }} className={btnPrimary}>
              <Plus size={18} /> Add Currency
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currencies.map(c => (
              <Card key={c.id} className={c.isHome ? 'light-card-green border-success/30' : 'light-card-blue'}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-foreground">{c.symbol}</span>
                        <span className="font-mono text-sm text-primary font-bold">{c.code}</span>
                        {c.isHome && <Star size={14} className="text-success fill-success" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.name}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {c.isHome ? <span className="text-success font-medium">Home Currency</span> : <span>Rate: 1 {homeCurrency?.code} = {c.rate} {c.code}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openEditCurrency(c)} className="text-xs text-primary hover:underline flex items-center gap-1"><Edit2 size={12} /> Edit</button>
                    {!c.isHome && <button onClick={() => deleteCurrency(c.id)} className="text-xs text-destructive hover:underline flex items-center gap-1"><Trash2 size={12} /> Delete</button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Daily Rates Tab */}
      {activeTab === 'rates' && (
        <Card className="light-card-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Exchange Rates</CardTitle>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Date:</label>
                <input type="date" value={rateDate} onChange={e => setRateDate(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Symbol</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Rate (1 {homeCurrency?.code} =)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Inverse</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map(c => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{c.code} - {c.name}</td>
                    <td className="px-4 py-3 text-lg">{c.symbol}</td>
                    <td className="px-4 py-3 text-center">
                      {c.isHome
                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success font-medium">Home</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs bg-info/10 text-info font-medium">Foreign</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.isHome ? (
                        <span className="font-mono">1.0000</span>
                      ) : (
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={c.rate}
                          onChange={e => updateRate(c.id, e.target.value)}
                          className="w-28 px-2 py-1 rounded border border-input bg-background text-foreground text-sm text-right font-mono"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {c.isHome ? '1.0000' : (1 / c.rate).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingMethod(null); setMethodForm({ name: '', type: 'Cash', isActive: true }); setShowMethodModal(true); }} className={btnPrimary}>
              <Plus size={18} /> Add Payment Method
            </button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethods.map(m => (
                    <tr key={m.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.type}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleMethod(m.id)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {m.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center flex gap-2 justify-center">
                        <button onClick={() => openEditMethod(m)} className="text-primary hover:text-primary/80"><Edit2 size={14} /></button>
                        <button onClick={() => deleteMethod(m.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">{editingCurrency ? 'Edit' : 'Add'} Currency</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Currency Code</label>
                  <input value={currencyForm.code} onChange={e => setCurrencyForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className={inputClass} placeholder="USD" maxLength={3} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Symbol</label>
                  <input value={currencyForm.symbol} onChange={e => setCurrencyForm(p => ({ ...p, symbol: e.target.value }))} className={inputClass} placeholder="$" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Currency Name</label>
                <input value={currencyForm.name} onChange={e => setCurrencyForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="US Dollar" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Exchange Rate (1 {homeCurrency?.code || 'HOME'} = ?)</label>
                <input type="number" step="0.0001" min="0" value={currencyForm.rate} onChange={e => setCurrencyForm(p => ({ ...p, rate: e.target.value }))} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={currencyForm.isHome} onChange={e => setCurrencyForm(p => ({ ...p, isHome: e.target.checked, rate: e.target.checked ? '1' : p.rate }))} className="rounded border-input" />
                <span className="text-foreground">Set as Home Currency</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowCurrencyModal(false); setEditingCurrency(null); }} className={btnOutline}>Cancel</button>
              <button onClick={handleSaveCurrency} className={btnPrimary}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showMethodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">{editingMethod ? 'Edit' : 'Add'} Payment Method</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Method Name</label>
                <input value={methodForm.name} onChange={e => setMethodForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="e.g. Bank Transfer" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                <select value={methodForm.type} onChange={e => setMethodForm(p => ({ ...p, type: e.target.value as any }))} className={selectClass}>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Mobile">Mobile Money</option>
                  <option value="Card">Card/POS</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={methodForm.isActive} onChange={e => setMethodForm(p => ({ ...p, isActive: e.target.checked }))} className="rounded border-input" />
                <span className="text-foreground">Active</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowMethodModal(false); setEditingMethod(null); }} className={btnOutline}>Cancel</button>
              <button onClick={handleSaveMethod} className={btnPrimary}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
