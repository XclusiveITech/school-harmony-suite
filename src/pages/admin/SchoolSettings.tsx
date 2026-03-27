import React, { useState } from 'react';
import { useSchoolSettings } from '@/contexts/SchoolSettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Upload, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SchoolSettings() {
  const { settings, updateSettings } = useSchoolSettings();
  const [form, setForm] = useState({ ...settings });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm(prev => ({ ...prev, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateSettings(form);
    toast.success('School settings saved successfully');
  };

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">School Settings</h1>
        <p className="text-sm text-muted-foreground">Configure school details that appear on reports and documents</p>
      </div>

      <Card className="light-card-blue">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Building2 size={20} /> General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">School Logo</label>
            <div className="flex items-center gap-4">
              {form.logo ? (
                <img src={form.logo} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <Building2 size={28} />
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors cursor-pointer">
                <Upload size={16} /> Upload Logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">School Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Address</label>
            <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Motto</label>
            <input value={form.motto} onChange={e => setForm(p => ({ ...p, motto: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Bank Details (shown on reports)</label>
            <input value={form.bankDetails} onChange={e => setForm(p => ({ ...p, bankDetails: e.target.value }))} className={inputClass} placeholder="Bank Name | Acc: XXXX | Branch: XXXX" />
          </div>

          <button onClick={handleSave} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
            <Save size={18} /> Save Settings
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
