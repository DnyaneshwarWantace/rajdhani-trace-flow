import { useEffect, useMemo, useState } from 'react';
import { Shield, RefreshCw, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PermissionService, type PermissionActionsMeta, type PermissionPageMeta } from '@/services/permissionService';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/userService';
import type { User } from '@/types/auth';

interface PermissionsProps {}

type PagePerms = Record<string, boolean>;
type ActionPerms = Record<string, boolean>;

interface SimpleSwitchProps {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}

function SimpleSwitch({ checked, onCheckedChange, disabled }: SimpleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onCheckedChange(!checked);
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function Permissions(_props: PermissionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [pages, setPages] = useState<PermissionPageMeta[]>([]);
  const [actionsMeta, setActionsMeta] = useState<PermissionActionsMeta>({});
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pagePermissions, setPagePermissions] = useState<PagePerms>({});
  const [actionPermissions, setActionPermissions] = useState<ActionPerms>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initial load of roles/pages/actions metadata
  useEffect(() => {
    let cancelled = false;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const [usersRes, pagesRes, actionsRes] = await Promise.all([
          UserService.getUsers(),
          PermissionService.getPages(),
          PermissionService.getActions(),
        ]);

        if (cancelled) return;

        const manageableUsers = (usersRes || []).filter((u) => u.can_manage);
        setUsers(manageableUsers);
        setPages(pagesRes);
        setActionsMeta(actionsRes);

        if (!selectedUserId && manageableUsers.length > 0) {
          setSelectedUserId(manageableUsers[0].id);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load permission metadata', error);
          toast({
            title: 'Error',
            description: 'Failed to load permission metadata.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    };

    loadMeta();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load permissions when selected user changes
  useEffect(() => {
    if (!selectedUserId) return;

    let cancelled = false;

    const loadPermissions = async () => {
      setLoadingPermissions(true);
      try {
        const perms = await PermissionService.getUserPermissions(selectedUserId);
        if (cancelled) return;

        setPagePermissions(perms?.page_permissions || {});
        setActionPermissions(perms?.action_permissions || {});
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load role permissions', error);
          toast({
            title: 'Error',
            description: 'Failed to load permissions for this role.',
            variant: 'destructive',
          });
          setPagePermissions({});
          setActionPermissions({});
        }
      } finally {
        if (!cancelled) setLoadingPermissions(false);
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId, toast]);

  const handleTogglePage = (pageKey: string, enabled: boolean) => {
    setPagePermissions((prev) => ({
      ...prev,
      [pageKey]: enabled,
    }));

    // Mirror backend behaviour: when page is enabled, turn on all non-delete actions for that module.
    // When disabled, turn off all actions for that module.
    const moduleActions = actionsMeta[pageKey];
    if (moduleActions && moduleActions.length > 0) {
      setActionPermissions((prev) => {
        const next = { ...prev };
        for (const act of moduleActions) {
          if (enabled) {
            if (!act.key.includes('delete')) {
              next[act.key] = true;
            }
          } else {
            next[act.key] = false;
          }
        }
        return next;
      });
    }
  };

  const handleToggleAction = (actionKey: string, enabled: boolean) => {
    setActionPermissions((prev) => ({
      ...prev,
      [actionKey]: enabled,
    }));
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await PermissionService.updateUserPermissions(selectedUserId, {
        page_permissions: pagePermissions,
        action_permissions: actionPermissions,
      });
      toast({
        title: 'Permissions saved',
        description: 'Permissions for this user have been updated.',
      });
    } catch (error) {
      console.error('Failed to save permissions', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to save permissions. You may not have access to this role.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await PermissionService.resetUserPermissions(selectedUserId);
      const perms = await PermissionService.getUserPermissions(selectedUserId);
      setPagePermissions(perms?.page_permissions || {});
      setActionPermissions(perms?.action_permissions || {});
      toast({
        title: 'Permissions reset',
        description: 'Permissions for this user have been reset to role defaults.',
      });
    } catch (error) {
      console.error('Failed to reset permissions', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to reset permissions. You may not have access to this role.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId],
  );

  const isSuperAdmin = user?.role === 'super-admin';
  const isSelectedUserSuperAdmin = selectedUser?.role === 'super-admin';

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <CardTitle>User Permissions</CardTitle>
          </div>
          <CardDescription>
            Control which pages and actions are allowed for each user.
            {isSuperAdmin ? (
              <span className="ml-1">
                As <strong>super-admin</strong> you can adjust permissions for any user.
              </span>
            ) : (
              <span className="ml-1">
                As <strong>admin</strong> you can adjust permissions only for users you can manage.
              </span>
            )}
          </CardDescription>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide sm:w-24">
              User
            </span>
            <Select
              value={selectedUserId}
              onValueChange={(val) => setSelectedUserId(val)}
              disabled={loadingMeta || users.length === 0}
            >
              <SelectTrigger className="w-full sm:max-w-xs md:max-w-sm">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex flex-col">
                      <span>{u.full_name || u.email}</span>
                      <span className="text-xs text-gray-400">
                        {u.email} • role: {u.role}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!selectedUserId || saving || loadingPermissions || isSelectedUserSuperAdmin}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset to default
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!selectedUserId || saving || loadingPermissions || isSelectedUserSuperAdmin}
            >
              <Save className="w-4 h-4 mr-1" />
              Save changes
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loadingMeta || loadingPermissions ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
              <span>Loading permissions…</span>
            </div>
          </div>
        ) : !selectedUser ? (
          <div className="py-10 text-center text-gray-500">Select a user to view and edit permissions.</div>
        ) : (
          <div className="space-y-4">
            {isSelectedUserSuperAdmin && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Super-admin has full access. Permissions cannot be edited.
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Editing user:</span>
                <Badge variant="outline" className="text-xs">
                  {selectedUser.full_name || selectedUser.email} ({selectedUser.role})
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pages.map((page) => {
                const enabled = !!pagePermissions[page.key];
                const moduleActions = actionsMeta[page.key] || [];

                return (
                  <div
                    key={page.key}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{page.label}</span>
                          <Badge variant={enabled ? 'default' : 'outline'} className="text-xs">
                            {enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        {page.description && (
                          <p className="text-xs text-gray-500">{page.description}</p>
                        )}
                      </div>
                      <SimpleSwitch
                        checked={enabled}
                        onCheckedChange={(val) => handleTogglePage(page.key, val)}
                        disabled={isSelectedUserSuperAdmin}
                      />
                    </div>

                    {moduleActions.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 mt-1">
                        <p className="text-xs font-semibold text-gray-500 mb-2">
                          Actions for this page
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {moduleActions.map((action) => {
                            const checked = !!actionPermissions[action.key];
                            return (
                              <button
                                key={action.key}
                                type="button"
                                disabled={isSelectedUserSuperAdmin}
                                onClick={() => handleToggleAction(action.key, !checked)}
                                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                  checked
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-gray-50 border-gray-300 text-gray-600'
                                } ${isSelectedUserSuperAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

