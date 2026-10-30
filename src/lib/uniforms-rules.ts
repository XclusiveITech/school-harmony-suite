import type { CartLine, UniformProduct, UniformOrder } from './uniforms-api';

export const STARTER_QUANTITY = 2;
export function applicableUniform(product: Pick<UniformProduct, 'active' | 'mandatory' | 'gender' | 'levels'>, gender: string, level: string) {
  return product.active && product.mandatory && (product.gender === 'Unisex' || product.gender === gender) && (!product.levels.length || product.levels.includes(level));
}
export function validateCart(lines: CartLine[], products: UniformProduct[]): string | null {
  if (!lines.length) return 'Choose at least one uniform.';
  const seen = new Set<number>(); const currencies = new Set<string>();
  for (const line of lines) {
    const product = products.find(p => p.variants.some(v => v.id === line.variant));
    const variant = product?.variants.find(v => v.id === line.variant);
    if (!product?.active || !variant?.active) return 'A selected uniform is no longer available.';
    if (!Number.isInteger(line.quantity) || line.quantity < 1) return 'Quantities must be whole numbers above zero.';
    if (seen.has(line.variant)) return 'Combine duplicate uniform selections.';
    seen.add(line.variant); currencies.add(variant.currency);
    if (line.quantity > variant.available) return `Not enough stock for ${product.name}, ${variant.size}, ${variant.colour}.`;
  }
  return currencies.size > 1 ? 'Place a separate order for each currency.' : null;
}
export function canCollect(order: Pick<UniformOrder, 'status' | 'balance'>) {
  return order.status === 'Ready' && Number(order.balance) === 0;
}