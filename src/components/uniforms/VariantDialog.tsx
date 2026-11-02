import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UniformProduct } from '@/lib/uniforms-api';

export default function VariantDialog({ value, products, currencies, busy, onClose, onSave }: {
  value: { product: number; variant?: number } | null; products: UniformProduct[]; currencies: string[];
  busy: boolean; onClose: () => void; onSave: (payload: unknown, id?: number) => void;
}) {
  const variant = products.find(p => p.id === value?.product)?.variants.find(v => v.id === value?.variant);
  return <Dialog open={!!value} onOpenChange={open => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{variant ? 'Edit size and colour' : 'Add size and colour'}</DialogTitle></DialogHeader>
    <form key={`${value?.product}-${value?.variant}`} className="space-y-4" onSubmit={e => {
      e.preventDefault(); if (!value) return; const form = new FormData(e.currentTarget);
      onSave({ product: value.product, sku: form.get('sku'), size: form.get('size'), colour: form.get('colour'), price: form.get('price'), currency: form.get('currency'), stock: Number(form.get('stock')), active: form.get('variant_active') === 'on' }, value.variant);
    }}>
      {['sku', 'size', 'colour'].map(name => <div key={name} className="space-y-1"><Label htmlFor={`variant_${name}`} className="capitalize">{name}</Label><Input id={`variant_${name}`} name={name} required defaultValue={variant?.[name as 'sku' | 'size' | 'colour']} /></div>)}
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="variant_price">Price</Label><Input id="variant_price" name="price" type="number" step="0.01" min="0.01" required defaultValue={variant?.price} /></div><div className="space-y-1"><Label htmlFor="variant_currency">Currency</Label><select id="variant_currency" name="currency" required defaultValue={variant?.currency || ''} className="h-10 w-full border border-input bg-background rounded-md px-3"><option value="">Select currency</option>{currencies.map(c => <option key={c}>{c}</option>)}</select></div></div>
      <div className="space-y-1"><Label htmlFor="variant_stock">Stock on hand</Label><Input id="variant_stock" name="stock" type="number" step="1" min={variant?.reserved || 0} required defaultValue={variant?.stock || 0} /></div>
      <div className="flex gap-2 items-center"><input type="checkbox" id="variant_active" name="variant_active" defaultChecked={variant?.active ?? true} /><Label htmlFor="variant_active">Active</Label></div><Button disabled={busy}>Save variant</Button>
    </form></DialogContent></Dialog>;
}