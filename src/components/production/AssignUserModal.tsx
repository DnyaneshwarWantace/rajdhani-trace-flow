import { useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, User, CheckCircle2, Layers, X } from 'lucide-react';
import { UserService } from '@/services/userService';
import { PermissionService } from '@/services/permissionService';
import type { User as UserType } from '@/types/auth';

interface AssignUserModalProps {
  open: boolean;
  onClose: () => void;
  onAssign: (userId: string, userName: string) => Promise<void>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  extraContent?: ReactNode;
}

const rolePermCache: Record<string, Record<string, boolean>> = {};
const userPermCache: Record<string, Record<string, boolean>> = {};

function hasProductionAssignmentAccess(actionPermissions: Record<string, boolean> | undefined): boolean {
  if (!actionPermissions) return false;
  return actionPermissions['production_view'] === true &&
    (actionPermissions['production_create'] === true || actionPermissions['production_edit'] === true);
}

async function getRoleActionPerms(role: string): Promise<Record<string, boolean>> {
  if (rolePermCache[role]) return rolePermCache[role];
  try {
    const API_URL = (await import('@/utils/apiConfig')).getApiUrl();
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API_URL}/permissions/role/${encodeURIComponent(role)}/public`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return {};
    const data = await res.json();
    rolePermCache[role] = data?.data?.action_permissions ?? {};
    return rolePermCache[role];
  } catch { return {}; }
}

async function getUserActionPerms(userId: string): Promise<Record<string, boolean> | null> {
  if (userPermCache[userId]) return userPermCache[userId];
  try {
    const perms = await PermissionService.getUserPermissionsPublic(userId);
    userPermCache[userId] = perms?.action_permissions ?? {};
    return userPermCache[userId];
  } catch { return null; }
}

async function isEligibleForProductionAssignment(user: UserType): Promise<boolean> {
  if (user.role === 'admin' || user.role === 'super-admin') return true;
  const userActionPerms = await getUserActionPerms(user.id);
  if (userActionPerms) return hasProductionAssignmentAccess(userActionPerms);
  const roleActionPerms = await getRoleActionPerms(user.role);
  if (Object.keys(roleActionPerms).length > 0) return hasProductionAssignmentAccess(roleActionPerms);
  return true;
}

const getRoleBadgeColor = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'admin': return 'bg-red-100 text-red-800';
    case 'manager': return 'bg-purple-100 text-purple-800';
    case 'supervisor': return 'bg-blue-100 text-blue-800';
    case 'operator': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export default function AssignUserModal({
  open,
  onClose,
  onAssign,
  title = 'Assign to User',
  description = 'Select a user to assign this work to.',
  confirmLabel = 'Assign',
  extraContent,
}: AssignUserModalProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (open) { setSelectedUser(null); setSearch(''); setError(null); loadUsers(); }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true); setError(null);
    try {
      const allUsers = await UserService.getAssignableUsers();
      const activeUsers = allUsers.filter(u => u.status === 'active' || !u.status);
      const eligibleResults = await Promise.all(
        activeUsers.map(async (u) => (await isEligibleForProductionAssignment(u)) ? u : null)
      );
      setUsers(eligibleResults.filter((u): u is UserType => u !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try { await onAssign(selectedUser.id, selectedUser.full_name); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to assign user'); }
    finally { setSubmitting(false); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q);
  });

  // ── MOBILE BOTTOM SHEET ──
  const mobileSheet = open ? (
    <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-[22px] flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="px-[18px] pt-3 pb-2.5 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
              <Layers className="w-[15px] h-[15px]" style={{ color: '#D97706' }} />
            </div>
            <span className="text-[16px] font-extrabold text-gray-900">{title}</span>
          </div>
          {description && <p className="text-[12.5px] text-gray-500 leading-relaxed">{description}</p>}
          {extraContent && <div className="mt-2">{extraContent}</div>}
        </div>

        {/* Search */}
        <div className="mx-[18px] mb-2.5 shrink-0 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-[10px] px-3">
          <Search className="w-[15px] h-[15px] text-gray-400 shrink-0" />
          <input
            className="flex-1 py-2.5 px-2 text-[13.5px] text-gray-900 bg-transparent outline-none placeholder-gray-400"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto mx-[18px] min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
              <span className="text-[13px] text-gray-500">Loading users...</span>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-[13px] py-8">
              {search ? 'No users match your search.' : 'No users found.'}
            </p>
          ) : (
            <div className="space-y-1 pb-2">
              {filtered.map(u => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button key={u.id} type="button" onClick={() => setSelectedUser(u)}
                    className="w-full flex items-center gap-2.5 px-3 py-3 rounded-lg border-b border-gray-100 text-left transition-colors"
                    style={{ backgroundColor: isSelected ? '#EFF6FF' : '#fff' }}>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-[14px] font-extrabold"
                      style={{ backgroundColor: isSelected ? '#2563EB' : '#E5E7EB', color: isSelected ? '#fff' : '#6B7280' }}>
                      {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-bold text-gray-900 truncate">{u.full_name || u.email}</p>
                      <p className="text-[11px] text-gray-500 truncate">{u.email} · {u.role}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-[18px] h-[18px] text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="mx-[18px] text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-1 shrink-0">{error}</p>
        )}

        {/* Footer */}
        <div className="flex gap-2.5 px-[18px] py-[18px] pb-8 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-[14px] font-bold text-gray-500">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!selectedUser || submitting}
            className="flex-[2] py-3.5 rounded-xl flex items-center justify-center gap-2 text-[14px] font-bold text-white transition-colors"
            style={{ backgroundColor: !selectedUser ? '#9CA3AF' : '#D97706' }}>
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Layers className="w-[15px] h-[15px]" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {createPortal(mobileSheet, document.body)}

      {/* Desktop Dialog */}
      <Dialog open={open && !isMobile} onOpenChange={o => { if (!o) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              {title}
            </DialogTitle>
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
          </DialogHeader>

          <div className="space-y-3">
            {extraContent}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by name, email, role..." value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9" autoFocus />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Loading users...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  {search ? 'No users match your search.' : 'No users found.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filtered.map(user => (
                    <button key={user.id} type="button" onClick={() => setSelectedUser(user)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedUser?.id === user.id ? 'bg-blue-50' : ''}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${selectedUser?.id === user.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 truncate">{user.full_name}</span>
                          {selectedUser?.id === user.id && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500 truncate">{user.email}</span>
                          {user.role && <Badge className={`text-xs px-1.5 py-0 ${getRoleBadgeColor(user.role)}`}>{user.role}</Badge>}
                        </div>
                        {user.department && <span className="text-xs text-gray-400">{user.department}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedUser && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md text-sm">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-blue-800">Assigning to <strong>{selectedUser.full_name}</strong></span>
              </div>
            )}
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</div>}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!selectedUser || submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Assigning...</> : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
