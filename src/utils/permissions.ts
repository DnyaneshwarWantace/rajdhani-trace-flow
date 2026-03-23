/**
 * Permission checks using backend shape: page_permissions and action_permissions.
 * Super-admin always has full access. Admin with no permissions doc treated as full access.
 */

export interface StoredPermissions {
  page_permissions?: Record<string, boolean>;
  action_permissions?: Record<string, boolean>;
}

function getStoredPermissions(): StoredPermissions | null {
  try {
    const raw = localStorage.getItem('permissions');
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      page_permissions: p?.page_permissions ?? {},
      action_permissions: p?.action_permissions ?? {},
    };
  } catch {
    return null;
  }
}

function isSuperAdmin(): boolean {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    return JSON.parse(userStr).role === 'super-admin';
  } catch {
    return false;
  }
}

function isAdmin(): boolean {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    const role = JSON.parse(userStr).role;
    return role === 'admin' || role === 'super-admin';
  } catch {
    return false;
  }
}

/** True if user can access this page (sidebar + route). */
export function canAccessPage(pageKey: string): boolean {
  if (isSuperAdmin()) return true;
  const p = getStoredPermissions();
  if (!p?.page_permissions) return isAdmin(); // admin with no permissions = full access
  return p.page_permissions[pageKey] === true;
}

/** True if user can perform this action (e.g. product_create, material_edit). */
export function canDoAction(actionKey: string): boolean {
  if (isSuperAdmin()) return true;
  const p = getStoredPermissions();
  if (!p?.action_permissions) return isAdmin();
  const v = p.action_permissions[actionKey];
  return v === true;
}

// Map module names (used by UI) to action keys
const moduleToActions: Record<string, { create: string; edit: string; delete: string; view?: string }> = {
  products: { create: 'product_create', edit: 'product_edit', delete: 'product_delete', view: 'product_view' },
  materials: { create: 'material_create', edit: 'material_edit', delete: 'material_delete', view: 'material_view' },
  customers: { create: 'customer_create', edit: 'customer_edit', delete: 'customer_delete', view: 'customer_view' },
  suppliers: { create: 'supplier_create', edit: 'supplier_edit', delete: 'supplier_delete', view: 'supplier_view' },
  orders: { create: 'order_create', edit: 'order_edit', delete: 'order_delete', view: 'order_view' },
  production: { create: 'production_create', edit: 'production_edit', delete: 'production_delete', view: 'production_view' },
  machines: { create: 'machine_create', edit: 'machine_edit', delete: 'machine_delete', view: 'machine_view' },
};

/** True if user can use machine features (linked to production create/edit). */
export function canUseMachines(): boolean {
  if (isSuperAdmin()) return true;
  const p = getStoredPermissions();
  if (!p?.action_permissions) return isAdmin();
  // Machine access granted if user has machine_view OR production create/edit
  return (
    p.action_permissions['machine_view'] === true ||
    p.action_permissions['machine_create'] === true ||
    p.action_permissions['machine_edit'] === true ||
    p.action_permissions['production_create'] === true ||
    p.action_permissions['production_edit'] === true
  );
}

export function canCreate(module: 'products' | 'materials' | 'customers' | 'suppliers' | 'recipes' | 'orders' | 'production'): boolean {
  if (isSuperAdmin()) return true;
  const actions = moduleToActions[module as keyof typeof moduleToActions];
  if (!actions) return isAdmin();
  return canDoAction(actions.create);
}

export function canEdit(module: 'products' | 'materials' | 'customers' | 'suppliers' | 'recipes' | 'orders' | 'production'): boolean {
  if (isSuperAdmin()) return true;
  const actions = moduleToActions[module as keyof typeof moduleToActions];
  if (!actions) return isAdmin();
  return canDoAction(actions.edit);
}

export function canDelete(module: 'products' | 'materials' | 'customers' | 'suppliers' | 'recipes' | 'orders' | 'production'): boolean {
  if (isSuperAdmin()) return true;
  const actions = moduleToActions[module as keyof typeof moduleToActions];
  if (!actions) return isAdmin();
  return canDoAction(actions.delete);
}

export function canView(module: string): boolean {
  if (isSuperAdmin()) return true;
  const actions = moduleToActions[module as keyof typeof moduleToActions];
  if (!actions?.view) return isAdmin();
  return canDoAction(actions.view);
}

export { isAdmin };

/** Message to show when API returns 403. Re-exported from apiHelpers for convenience. */
export { PERMISSION_DENIED_MESSAGE } from '@/utils/apiHelpers';
