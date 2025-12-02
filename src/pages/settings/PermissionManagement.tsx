import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Shield, Save, RotateCcw, AlertCircle } from 'lucide-react';
import PermissionService, { RoleOption, PageOption, ActionGroup, Permission } from '@/services/api/permissionService';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PermissionManagement() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [actions, setActions] = useState<ActionGroup>({});
  const [selectedRole, setSelectedRole] = useState('');
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for editing
  const [editedPagePermissions, setEditedPagePermissions] = useState<{ [key: string]: boolean }>({});
  const [editedActionPermissions, setEditedActionPermissions] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadPermissions(selectedRole);
    }
  }, [selectedRole]);

  const loadMetadata = async () => {
    try {
      const [rolesResult, pagesResult, actionsResult] = await Promise.all([
        PermissionService.getAvailableRoles(),
        PermissionService.getAvailablePages(),
        PermissionService.getAvailableActions()
      ]);

      if (rolesResult.data) {
        // Filter to only admin and user roles
        const filteredRoles = rolesResult.data.filter(role => role.value === 'admin' || role.value === 'user');
        setRoles(filteredRoles.length > 0 ? filteredRoles : [
          { value: 'admin', label: 'Admin', description: 'Administrator with full access' },
          { value: 'user', label: 'User', description: 'Standard user' }
        ]);
      } else if (rolesResult.error) {
        console.error('Error loading roles:', rolesResult.error);
        // Set default roles if API fails
        setRoles([
          { value: 'admin', label: 'Admin', description: 'Administrator with full access' },
          { value: 'user', label: 'User', description: 'Standard user' }
        ]);
      } else {
        // Fallback if no data
        setRoles([
          { value: 'admin', label: 'Admin', description: 'Administrator with full access' },
          { value: 'user', label: 'User', description: 'Standard user' }
        ]);
      }

      if (pagesResult.data) {
        setPages(pagesResult.data);
      } else if (pagesResult.error) {
        console.error('Error loading pages:', pagesResult.error);
      }

      if (actionsResult.data) {
        setActions(actionsResult.data);
      } else if (actionsResult.error) {
        console.error('Error loading actions:', actionsResult.error);
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permission metadata. Please refresh the page.',
        variant: 'destructive'
      });
    }
  };

  const loadPermissions = async (role: string) => {
    setIsLoading(true);
    const { data, error } = await PermissionService.getPermissionsByRole(role);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else if (data) {
      setPermissions(data);
      setEditedPagePermissions(data.page_permissions);
      setEditedActionPermissions(data.action_permissions);
      setHasChanges(false);
    }
    
    setIsLoading(false);
  };

  // Map action permissions to page permissions
  const getPageForAction = (actionKey: string): string | null => {
    // Map action keys to page keys
    if (actionKey.startsWith('product_') && !actionKey.startsWith('individual_product_')) return 'products';
    if (actionKey.startsWith('individual_product_')) return 'products'; // Individual products are under products page
    if (actionKey.startsWith('production_')) return 'production';
    if (actionKey.startsWith('material_')) return 'materials';
    if (actionKey.startsWith('order_')) return 'orders';
    if (actionKey.startsWith('customer_')) return 'customers';
    if (actionKey.startsWith('supplier_')) return 'suppliers';
    if (actionKey.startsWith('report_')) return 'reports';
    if (actionKey.startsWith('user_')) return 'users';
    if (actionKey.startsWith('role_')) return 'roles';
    if (actionKey.startsWith('machine_')) return 'machines';
    return null;
  };

  const handlePagePermissionChange = (pageKey: string, checked: boolean) => {
    const newPagePermissions = {
      ...editedPagePermissions,
      [pageKey]: checked
    };
    setEditedPagePermissions(newPagePermissions);
    
    // If page permission is enabled, automatically enable all non-delete action permissions
    // If disabled, disable all related action permissions
    const updatedActionPermissions = { ...editedActionPermissions };
    Object.keys(updatedActionPermissions).forEach(actionKey => {
      const actionPage = getPageForAction(actionKey);
      if (actionPage === pageKey) {
        if (checked) {
          // Enable all non-delete actions when page is enabled
          if (!actionKey.includes('delete')) {
            updatedActionPermissions[actionKey] = true;
          }
        } else {
          // Disable all actions when page is disabled
          updatedActionPermissions[actionKey] = false;
        }
      }
    });
    setEditedActionPermissions(updatedActionPermissions);
    
    setHasChanges(true);
  };

  const handleActionPermissionChange = (actionKey: string, checked: boolean) => {
    setEditedActionPermissions(prev => ({
      ...prev,
      [actionKey]: checked
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    
    // Automatically set all non-delete action permissions based on page permissions
    const finalActionPermissions = { ...editedActionPermissions };
    Object.keys(finalActionPermissions).forEach(actionKey => {
      const pageKey = getPageForAction(actionKey);
      if (pageKey) {
        if (editedPagePermissions[pageKey]) {
          // If page is enabled, enable all non-delete actions
          if (!actionKey.includes('delete')) {
            finalActionPermissions[actionKey] = true;
          }
          // Delete actions are already set by user via checkbox
        } else {
          // If page is disabled, disable all actions
          finalActionPermissions[actionKey] = false;
        }
      }
    });
    
    const { data, error } = await PermissionService.updatePermissions(selectedRole, {
      page_permissions: editedPagePermissions,
      action_permissions: finalActionPermissions
    });

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Permissions updated successfully'
      });
      setHasChanges(false);
      loadPermissions(selectedRole);
    }
    
    setIsLoading(false);
  };

  const handleReset = async () => {
    if (!selectedRole) return;

    if (!confirm('Are you sure you want to reset permissions to default? This cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    const { error } = await PermissionService.resetPermissions(selectedRole);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Permissions reset to default successfully'
      });
      loadPermissions(selectedRole);
    }
    
    setIsLoading(false);
  };

  const handleDiscard = () => {
    if (permissions) {
      setEditedPagePermissions(permissions.page_permissions);
      setEditedActionPermissions(permissions.action_permissions);
      setHasChanges(false);
    }
  };

  const selectedRoleData = roles.find(r => r.value === selectedRole);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Permission Management
              </CardTitle>
              <CardDescription>
                Simplified permission model: Enable page access to grant full permissions (create, edit, view). Only delete operations require explicit permission.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Role Selector */}
            <div className="space-y-2">
              <Label>Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={roles.length === 0}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder={roles.length === 0 ? "Loading roles..." : "Choose a role to configure..."} />
                </SelectTrigger>
                <SelectContent>
                  {roles.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      No roles available
                    </SelectItem>
                  ) : (
                    roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-gray-500">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {roles.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Failed to load roles. Please refresh the page or check your connection.
                </p>
              )}
            </div>

            {selectedRole && selectedRoleData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">{selectedRoleData.label}</p>
                    <p className="text-sm text-blue-700">{selectedRoleData.description}</p>
                  </div>
                </div>
              </div>
            )}

            {hasChanges && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You have unsaved changes. Click "Save Changes" to apply them.
                </AlertDescription>
              </Alert>
            )}

            {selectedRole && permissions && (
              <>
                {/* Page Permissions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Page Access Permissions</CardTitle>
                    <CardDescription>
                      Enable page access to grant full permissions (create, edit, view) for that module. Disabling removes all access.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pages.map((page) => (
                        <div key={page.key} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                          <Checkbox
                            id={`page-${page.key}`}
                            checked={editedPagePermissions[page.key] || false}
                            onCheckedChange={(checked) => handlePagePermissionChange(page.key, checked as boolean)}
                            disabled={selectedRole === 'admin'}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`page-${page.key}`}
                              className="font-medium cursor-pointer"
                            >
                              {page.label}
                            </Label>
                            <p className="text-xs text-gray-500 mt-1">{page.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedRole === 'admin' && (
                      <p className="text-sm text-gray-500 mt-4">
                        ℹ️ Admin role has access to all pages by default and cannot be modified.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Delete Permissions - Only show delete actions since page access = full access */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Delete Permissions</CardTitle>
                    <CardDescription>
                      Configure delete permissions. Page access automatically grants create, edit, and view permissions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Simplified Permission Model:</strong> When you enable page access, users automatically get full access (create, edit, view) to that module. Only delete operations require explicit permission.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-6">
                      {Object.entries(actions).map(([module, moduleActions]) => {
                        // Only show delete actions
                        const deleteActions = moduleActions.filter(action => action.key.includes('delete'));
                        
                        // Check if page permission is enabled for this module
                        const hasPagePermission = deleteActions.some(action => {
                          const pageKey = getPageForAction(action.key);
                          return pageKey ? (editedPagePermissions[pageKey] || false) : false;
                        });
                        
                        // Don't show module section if no delete actions or no page permission
                        if (deleteActions.length === 0 || !hasPagePermission) {
                          return null;
                        }
                        
                        return (
                          <div key={module} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
                                {module}
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {deleteActions.map((action) => {
                                const pageKey = getPageForAction(action.key);
                                const isPageEnabled = pageKey ? (editedPagePermissions[pageKey] || false) : false;
                                
                                return (
                                  <div 
                                    key={action.key} 
                                    className={`flex items-center space-x-3 p-2 border rounded ${
                                      isPageEnabled ? 'hover:bg-gray-50' : 'opacity-50 bg-gray-100'
                                    }`}
                                  >
                                    <Checkbox
                                      id={`action-${action.key}`}
                                      checked={editedActionPermissions[action.key] || false}
                                      onCheckedChange={(checked) => handleActionPermissionChange(action.key, checked as boolean)}
                                      disabled={selectedRole === 'admin' || !isPageEnabled}
                                    />
                                    <Label
                                      htmlFor={`action-${action.key}`}
                                      className={`font-medium text-sm ${
                                        isPageEnabled ? 'cursor-pointer' : 'cursor-not-allowed text-gray-400'
                                      }`}
                                    >
                                      {action.label}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {selectedRole === 'admin' && (
                      <p className="text-sm text-gray-500 mt-4">
                        ℹ️ Admin role has all delete permissions by default and cannot be modified.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isLoading || selectedRole === 'admin'}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>

                  <div className="flex gap-3">
                    {hasChanges && (
                      <Button
                        variant="outline"
                        onClick={handleDiscard}
                        disabled={isLoading}
                      >
                        Discard Changes
                      </Button>
                    )}
                    
                    <Button
                      onClick={handleSave}
                      disabled={isLoading || !hasChanges || selectedRole === 'admin'}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!selectedRole && (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a role to configure permissions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

