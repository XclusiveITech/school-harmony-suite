import { api, apiFetch } from './api';

export interface UniformCategory { id: number; name: string }
export interface UniformVariant {
  id: number; product: number; sku: string; size: string; colour: string;
  price: string; currency: string; stock: number; reserved: number; available: number; active: boolean;
}
export interface UniformProduct {
  id: number; name: string; category: number; category_name: string; uniform_type: string;
  gender: 'Male' | 'Female' | 'Unisex'; levels: string[]; image: string | null;
  active: boolean; mandatory: boolean; variants: UniformVariant[];
}
export interface UniformOrderLine {
  id: number; variant: number; description: string; quantity: number; unit_price: string;
  total: string; paid: string;
}
export interface UniformPayment {
  id: number; reference: string; method: string; amount: string;
  status: 'Pending' | 'Confirmed' | 'Rejected'; receipt_number?: string;
  allocations: { line: number; description: string; amount: string }[];
}
export interface UniformOrder {
  id: number; reference: string; student: number; student_name: string; student_no: string;
  created_at: string; kind: 'Starter' | 'Extra'; status: 'Awaiting payment' | 'Ready' | 'Collected' | 'Cancelled';
  total: string; paid: string; balance: string; currency: string; invoice_number: string;
  lines: UniformOrderLine[]; payments: UniformPayment[];
}
export interface StarterRequirement {
  product: number; name: string; required: number; purchased: number; remaining: number;
}
export interface UniformSnapshot {
  categories: UniformCategory[]; products: UniformProduct[]; orders: UniformOrder[];
  payment_methods: string[]; currencies: string[]; starter_requirements: StarterRequirement[];
}
export interface CartLine { variant: number; quantity: number }
export interface StudentStatement {
  currencies: string[];
  lines: { date: string; description: string; reference: string; currency: string;
    debit: string; credit: string; balance: string; category: string;
    allocations?: { description: string; amount: string }[] }[];
}
export const uniformsApi = {
  snapshot: (portal: boolean, branch: string) => api.get<UniformSnapshot>(portal ? '/api/uniforms/portal/' : `/api/uniforms/dashboard/?branch=${encodeURIComponent(branch)}`),
  category: (name: string, branch: string) => api.post('/api/uniforms/categories/', { name, branch: Number(branch) }),
  saveProduct: (data: unknown, id?: number) => id ? api.patch<UniformProduct>(`/api/uniforms/products/${id}/`, data) : api.post<UniformProduct>('/api/uniforms/products/', data),
  saveVariant: (data: unknown, id?: number) => id ? api.patch(`/api/uniforms/variants/${id}/`, data) : api.post('/api/uniforms/variants/', data),
  uploadImage: (id: number, file: File) => {
    const body = new FormData(); body.append('image', file);
    return apiFetch(`/api/uniforms/products/${id}/image/`, { method: 'POST', body });
  },
  order: (portal: boolean, data: { student?: number; kind: 'Starter' | 'Extra'; lines: CartLine[]; request_key: string }) => api.post<UniformOrder>(portal ? '/api/uniforms/portal/orders/' : '/api/uniforms/orders/', data),
  starter: (student: number) => api.get<StarterRequirement[]>(`/api/uniforms/starter/${student}/`),
  payment: (portal: boolean, order: number, data: unknown) => api.post(portal ? `/api/uniforms/portal/orders/${order}/payments/` : `/api/uniforms/orders/${order}/payments/`, data),
  confirm: (order: number, payment: number, confirm: boolean) => api.post(`/api/uniforms/orders/${order}/payments/${payment}/${confirm ? 'confirm' : 'reject'}/`, {}),
  collect: (id: number, reference: string) => api.post(`/api/uniforms/orders/${id}/collect/`, { reference }),
  cancel: (portal: boolean, id: number) => api.post(portal ? `/api/uniforms/portal/orders/${id}/cancel/` : `/api/uniforms/orders/${id}/cancel/`, {}),
  statement: () => api.get<StudentStatement>('/api/uniforms/portal/statement/'),
};