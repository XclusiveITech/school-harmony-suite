// Live Assets data from the Django backend. No dummy data — the asset
// register and assignments persist to MySQL (see BACKEND_ASSETS.md).
//   /api/assets/asset/
//   /api/assets/assignment/

import { api } from './api';
import { safeList, num } from './hr-api';
import type { Asset, AssetAssignment } from './dummy-data';

export interface BackendAsset {
  id: number;
  name: string;
  category: string;
  purchase_date: string;
  cost: number | string;
  depreciation_rate: number | string;
  current_value: number | string;
  location: string;
  serial_numbers: string[] | string;
}

export interface BackendAssignment {
  id: number;
  asset: number;
  serial_number: string;
  assigned_to_type: 'Student' | 'Staff';
  student?: number | null;
  staff?: number | null;
  assigned_to_name?: string;
  room_number: string;
  condition: AssetAssignment['condition'];
  date_assigned: string;
  notes?: string;
}

const serials = (v: string[] | string) =>
  Array.isArray(v) ? v : String(v || '').split(',').map(s => s.trim()).filter(Boolean);

export const toAsset = (a: BackendAsset): Asset => ({
  id: String(a.id), name: a.name, category: a.category, purchaseDate: a.purchase_date,
  cost: num(a.cost), depreciationRate: num(a.depreciation_rate), currentValue: num(a.current_value),
  location: a.location || '', serialNumbers: serials(a.serial_numbers),
});

export const toAssignment = (a: BackendAssignment): AssetAssignment => ({
  id: String(a.id), assetId: String(a.asset), serialNumber: a.serial_number,
  assignedToType: a.assigned_to_type,
  assignedTo: String((a.assigned_to_type === 'Student' ? a.student : a.staff) ?? ''),
  assignedToName: a.assigned_to_name || '', roomNumber: a.room_number || '',
  condition: a.condition, dateAssigned: a.date_assigned, notes: a.notes || '',
});

const assetBody = (a: Omit<Asset, 'id'>) => ({
  name: a.name, category: a.category, purchase_date: a.purchaseDate, cost: a.cost,
  depreciation_rate: a.depreciationRate, current_value: a.currentValue, location: a.location,
  serial_numbers: a.serialNumbers,
});

const assignBody = (a: Omit<AssetAssignment, 'id'>) => ({
  asset: Number(a.assetId), serial_number: a.serialNumber, assigned_to_type: a.assignedToType,
  student: a.assignedToType === 'Student' ? Number(a.assignedTo) : null,
  staff: a.assignedToType === 'Staff' ? Number(a.assignedTo) : null,
  assigned_to_name: a.assignedToName, room_number: a.roomNumber, condition: a.condition,
  date_assigned: a.dateAssigned, notes: a.notes || '',
});

export async function listAssets() {
  return (await safeList<BackendAsset>('/api/assets/asset/?limit=1000')).map(toAsset);
}
export async function saveAsset(a: Omit<Asset, 'id'>, id?: string) {
  const r = id
    ? await api.patch<BackendAsset>(`/api/assets/asset/${id}/`, assetBody(a))
    : await api.post<BackendAsset>('/api/assets/asset/', assetBody(a));
  return toAsset(r);
}
export const deleteAsset = (id: string) => api.delete(`/api/assets/asset/${id}/`);

export async function listAssignments() {
  return (await safeList<BackendAssignment>('/api/assets/assignment/?limit=2000')).map(toAssignment);
}
export async function saveAssignment(a: Omit<AssetAssignment, 'id'>, id?: string) {
  const r = id
    ? await api.patch<BackendAssignment>(`/api/assets/assignment/${id}/`, assignBody(a))
    : await api.post<BackendAssignment>('/api/assets/assignment/', assignBody(a));
  return toAssignment(r);
}
export const deleteAssignment = (id: string) => api.delete(`/api/assets/assignment/${id}/`);
