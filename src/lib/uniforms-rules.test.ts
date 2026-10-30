import { describe, expect, it } from 'vitest';
import { applicableUniform, canCollect, STARTER_QUANTITY, validateCart } from './uniforms-rules';
import type { UniformProduct } from './uniforms-api';
const product: UniformProduct = { id: 1, name: 'Shirt', category: 1, category_name: 'Daily', uniform_type: 'Shirt', gender: 'Unisex', levels: [], image: null, active: true, mandatory: true, variants: [{ id: 10, product: 1, sku: 'SH-M', size: 'M', colour: 'Blue', price: '12.00', currency: 'USD', stock: 5, reserved: 2, available: 3, active: true }] };
describe('uniform purchase rules', () => {
  it('requires a pair of each starter uniform', () => expect(STARTER_QUANTITY).toBe(2));
  it('applies gender-specific mandatory items only to the matching student', () => {
    expect(applicableUniform({ ...product, gender: 'Female' }, 'Male', 'Form 1')).toBe(false);
    expect(applicableUniform({ ...product, gender: 'Female' }, 'Female', 'Form 1')).toBe(true);
  });
  it('applies starter uniforms only to configured levels', () => {
    expect(applicableUniform({ ...product, levels: ['Form 1'] }, 'Male', 'Form 2')).toBe(false);
    expect(applicableUniform({ ...product, levels: ['Form 1'] }, 'Male', 'Form 1')).toBe(true);
  });
  it('rejects purchases above current unreserved stock', () => {
    expect(validateCart([{ variant: 10, quantity: 4 }], [product])).toContain('Not enough stock');
    expect(validateCart([{ variant: 10, quantity: 3 }], [product])).toBeNull();
  });
  it('prevents mixed-currency order totals', () => {
    const second = { ...product, id: 2, variants: [{ ...product.variants[0], id: 20, currency: 'ZIG' }] };
    expect(validateCart([{ variant: 10, quantity: 1 }, { variant: 20, quantity: 1 }], [product, second])).toContain('separate order');
  });
  it('requires fully confirmed payment before collection', () => {
    expect(canCollect({ status: 'Awaiting payment', balance: '0' })).toBe(false);
    expect(canCollect({ status: 'Ready', balance: '5.00' })).toBe(false);
    expect(canCollect({ status: 'Ready', balance: '0.00' })).toBe(true);
  });
});