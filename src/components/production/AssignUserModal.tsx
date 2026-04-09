import { useState, useEffect, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, User, CheckCircle2 } from 'lucide-react';
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
  const canView = actionPermissions['production_view'] === true;
  const canWork =
    actionPermissions['production_create'] === true ||
    actionPermissions['production_edit'] === true;
  return canView && canWork;
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
    const ap = data?.data?.action_permissions ?? {};
    rolePermCache[role] = ap;
    return ap;
  } catch {
    return {};
  }
}

async function getUserActionPerms(userId: string): Promise<Record<string, boolean> | null> {
  if (userPermCache[userId]) return userPermCache[userId];
  try {
    const perms = await PermissionService.getUserPermissionsPublic(userId);
    const ap = perms?.action_permissions ?? {};
    userPermCache[userId] = ap;
    return ap;
  } catch {
    return null;
  }
}

async function isEligibleForProductionAssignment(user: UserType): Promise<boolean> {
  if (user.role === 'admin' || user.role === 'super-admin') return true;

  const userActionPerms = await getUserActionPerms(user.id);
  if (userActionPerms) {
    return hasProductionAssignmentAccess(userActionPerms);
  }

  const roleActionPerms = await getRoleActionPerms(user.role);
  if (Object.keys(roleActionPerms).length > 0) {
    return hasProductionAssignmentAccess(roleActionPerms);
  }

  // Fail open if permission endpoints are unavailable.
  return true;
}

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

  useEffect(() => {
    if (open) {
      setSelectedUser(null);
      setSearch('');
      setError(null);
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const allUsers = await UserService.getAssignableUsers();
      // Filter to active users only
      const activeUsers = allUsers.filter(u => u.status === 'active' || !u.status);
      const eligibleResults = await Promise.all(
        activeUsers.map(async (u) => (await isEligibleForProductionAssignment(u)) ? u : null)
      );
      setUsers(eligibleResults.filter((u): u is UserType => u !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await onAssign(selectedUser.id, selectedUser.full_name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign user');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'operator': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {extraContent}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Loading users...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                {search ? 'No users match your search.' : 'No users found.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      selectedUser?.id === user.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      selectedUser?.id === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {user.full_name}
                        </span>
                        {selectedUser?.id === user.id && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 truncate">{user.email}</span>
                        {user.role && (
                          <Badge className={`text-xs px-1.5 py-0 ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </Badge>
                        )}
                      </div>
                      {user.department && (
                        <span className="text-xs text-gray-400">{user.department}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected user preview */}
          {selectedUser && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md text-sm">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-blue-800">
                Assigning to <strong>{selectedUser.full_name}</strong>
              </span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedUser || submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
