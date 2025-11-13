import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, Shield, Lock } from 'lucide-react';
import RoleService, { Role, CreateRoleData, UpdateRoleData } from '@/services/api/roleService';

export default function RoleManagement() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateRoleData>({
    name: '',
    label: '',
    description: ''
  });

  const [editForm, setEditForm] = useState<UpdateRoleData>({
    label: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setIsLoading(true);
    const { data, error } = await RoleService.getAllRoles();
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else if (data) {
      setRoles(data);
    }
    setIsLoading(false);
  };

  const handleCreateRole = async () => {
    if (!createForm.name || !createForm.label) {
      toast({
        title: 'Validation Error',
        description: 'Role name and label are required',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    const { data, error } = await RoleService.createRole(createForm);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Role created successfully'
      });
      setShowCreateDialog(false);
      setCreateForm({ name: '', label: '', description: '' });
      await loadRoles();
    }
    setIsLoading(false);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditForm({
      label: role.label,
      description: role.description,
      is_active: role.is_active
    });
    setShowEditDialog(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    const { data, error } = await RoleService.updateRole(selectedRole.id, editForm);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Role updated successfully'
      });
      setShowEditDialog(false);
      setSelectedRole(null);
      await loadRoles();
    }
    setIsLoading(false);
  };

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const confirmDeleteRole = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    const { error } = await RoleService.deleteRole(selectedRole.id);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Role deleted successfully'
      });
      setShowDeleteDialog(false);
      setSelectedRole(null);
      await loadRoles();
    }
    setIsLoading(false);
  };

  const getRoleBadgeColor = (role: Role) => {
    if (!role.is_active) return 'bg-gray-100 text-gray-600';
    if (role.is_system) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Create and manage user roles. System roles cannot be deleted.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading && roles.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading roles...</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No roles found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-mono text-sm">{role.name}</TableCell>
                    <TableCell className="font-medium">{role.label}</TableCell>
                    <TableCell className="text-gray-600">{role.description || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(role)}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {role.is_system ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Lock className="w-3 h-3" />
                          System
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">
                          Custom
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!role.is_system && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRole(role)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a new custom role. The name will be converted to snake_case automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                placeholder="e.g., quality_manager"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be converted to lowercase with underscores (e.g., "Quality Manager" → "quality_manager")
              </p>
            </div>
            <div>
              <Label htmlFor="role-label">Display Label *</Label>
              <Input
                id="role-label"
                placeholder="e.g., Quality Manager"
                value={createForm.label}
                onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                placeholder="e.g., Manages quality control processes"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={isLoading}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role information. System roles cannot be deactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role Name</Label>
              <Input
                value={selectedRole?.name || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Role name cannot be changed</p>
            </div>
            <div>
              <Label htmlFor="edit-label">Display Label *</Label>
              <Input
                id="edit-label"
                value={editForm.label}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            {!selectedRole?.is_system && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={isLoading}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedRole?.label}"? This action cannot be undone.
              <br />
              <br />
              <strong>Note:</strong> This role cannot be deleted if any users are assigned to it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRole}
              disabled={isLoading}
            >
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

