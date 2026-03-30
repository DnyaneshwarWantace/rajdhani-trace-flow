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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Key, Search, UserCheck, UserX, Info } from 'lucide-react';
import { UserService } from '@/services/userService';
import type { CreateUserData, UpdateUserData } from '@/services/userService';
import type { User } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail } from '@/utils/formValidation';

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles] = useState([
    { value: 'super-admin', label: 'Super Admin', description: 'Can manage everything, including admins and roles' },
    { value: 'admin', label: 'Admin', description: 'Administrator with full access (except super-admin accounts)' },
    { value: 'user', label: 'User', description: 'Standard user' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    email: '',
    full_name: '',
    role: 'user',
    password: '',
    phone: '',
    department: '',
  });
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState('');
  const [createPasswordError, setCreatePasswordError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<UpdateUserData>({
    full_name: '',
    role: '',
    phone: '',
    department: '',
    status: 'active',
  });

  const [tempPassword, setTempPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersData = await UserService.getUsers();
      setUsers(usersData);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    // Validate email
    const emailValidationError = validateEmail(createForm.email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      toast({
        title: 'Validation Error',
        description: emailValidationError,
        variant: 'destructive',
      });
      return;
    }
    
    if (!createForm.email || !createForm.full_name) {
      toast({
        title: 'Validation Error',
        description: 'Email and full name are required',
        variant: 'destructive',
      });
      return;
    }
    if (createForm.password && createForm.password !== createPasswordConfirm) {
      setCreatePasswordError('Passwords do not match');
      return;
    }
    setCreatePasswordError(null);
    const payload: CreateUserData = {
      ...createForm,
      ...(createForm.password?.trim() ? { password: createForm.password.trim() } : {}),
    };
    if (!payload.password) delete (payload as { password?: string }).password;

    try {
      const result = await UserService.createUser(payload);
      toast({
        title: 'Success',
        description: result.temporary_password
          ? `User created. Share this temporary password with the user: ${result.temporary_password}`
          : (result.message || 'User created with the password you set.'),
      });
      setShowCreateDialog(false);
      setCreateForm({
        email: '',
        full_name: '',
        role: 'user',
        password: '',
        phone: '',
        department: '',
      });
      setCreatePasswordConfirm('');
      setCreatePasswordError(null);
      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: (user as any).phone || '',
      department: (user as any).department || '',
      status: (user.status as any) || 'active',
    });
    setShowEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      await UserService.updateUser(selectedUser.id, editForm);
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await UserService.deleteUser(selectedUser.id);
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    try {
      // Generate a temporary password (at least 9 chars to pass "more than 8" validation)
      const generatedPassword = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 12);
      
      await UserService.resetPassword(selectedUser.id, generatedPassword);
      
      setTempPassword(generatedPassword);
      toast({
        title: 'Success',
        description: 'Copy the password below and share it with the user.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset password',
        variant: 'destructive',
      });
    }
  };

  const handleCopyResetPassword = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    toast({ title: 'Copied', description: 'Password copied to clipboard.' });
  };

  const handleUpdateStatus = async (userId: string, status: 'active' | 'inactive' | 'suspended') => {
    try {
      await UserService.updateUserStatus(userId, status);
      toast({
        title: 'Success',
        description: `User status updated to ${status}`,
      });
      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Backend returns can_manage: you can only manage users in your creator chain (you created them or someone you created did)
  const canManageUser = (user: User): boolean => {
    if (!currentUser || user.id === currentUser.id) return false;
    return Boolean(user.can_manage);
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Info Alert about Hierarchical Rules */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">User Management Rules</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Admins can edit, delete, or reset password for any non-admin user; for another admin, only if that admin is in their hierarchy</li>
                <li>Non-admins can only manage users in their hierarchy (users they created, or users created by someone they created)</li>
                <li>You cannot delete or modify your own account; non-admins cannot delete the user who created their account</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and their permissions</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="font-mono text-sm email-preserve-case">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.created_by_user ? (
                          <div className="text-sm">
                            <div className="font-medium">{user.created_by_user.full_name}</div>
                            <div className="text-xs text-gray-500 font-mono email-preserve-case">{user.created_by_user.email}</div>
                          </div>
                        ) : user.created_by === 'system' ? (
                          <span className="text-sm text-gray-500">System</span>
                        ) : (
                          <span className="text-sm text-gray-400">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManageUser(user) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                title="Edit user"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowResetPasswordDialog(true);
                                }}
                                title="Reset password"
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                              {user.status === 'active' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(user.id, 'inactive')}
                                  title="Suspend user"
                                >
                                  <UserX className="w-4 h-4 text-orange-600" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(user.id, 'active')}
                                  title="Activate user"
                                >
                                  <UserCheck className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteDialog(true);
                                }}
                                title="Delete user"
                                className="hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account. A temporary password will be shown after creation — share it with the user manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => {
                  const value = e.target.value;
                  setCreateForm({ ...createForm, email: value });
                  // Validate email on change
                  const error = validateEmail(value);
                  setEmailError(error);
                }}
                onBlur={() => {
                  const error = validateEmail(createForm.email);
                  setEmailError(error);
                }}
                placeholder="user@example.com"
                className={emailError ? 'border-red-500' : ''}
              />
              {emailError && (
                <p className="text-xs text-red-500 mt-1">{emailError}</p>
              )}
              {!emailError && createForm.email && (
                <p className="text-xs text-muted-foreground mt-1">
                  {createForm.email.length}/320 characters
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="create-full_name">Full Name *</Label>
              <Input
                id="create-full_name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="create-password">Password (optional)</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password ?? ''}
                onChange={(e) => {
                  setCreateForm({ ...createForm, password: e.target.value });
                  setCreatePasswordError(null);
                }}
                placeholder="Leave blank to auto-generate a temporary password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                If set, must be more than 8 characters.
              </p>
            </div>
            <div>
              <Label htmlFor="create-password-confirm">Confirm Password</Label>
              <Input
                id="create-password-confirm"
                type="password"
                value={createPasswordConfirm}
                onChange={(e) => {
                  setCreatePasswordConfirm(e.target.value);
                  setCreatePasswordError(null);
                }}
                placeholder="Re-enter password if you set one"
              />
              {createPasswordError && (
                <p className="text-xs text-red-500 mt-1">{createPasswordError}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-role">Role *</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) => setCreateForm({ ...createForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(currentUser?.role === 'super-admin' ? roles : roles.filter((role) => role.value !== 'super-admin')).map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-gray-500">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-phone">Phone</Label>
              <Input
                id="create-phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <Label htmlFor="create-department">Department</Label>
              <Input
                id="create-department"
                value={createForm.department}
                onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                placeholder="Department name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              {currentUser?.role === 'super-admin' ? (
                <Input
                  value={editForm.email ?? selectedUser?.email ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1"
                  placeholder="Email address"
                />
              ) : (
                <>
                  <Input value={selectedUser?.email || ''} disabled className="bg-gray-100" />
                  <p className="text-xs text-gray-500 mt-1">Only super admin can change email addresses</p>
                </>
              )}
            </div>
            <div>
              <Label htmlFor="edit-full_name">Full Name *</Label>
              <Input
                id="edit-full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role *</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(currentUser?.role === 'super-admin' ? roles : roles.filter((role) => role.value !== 'super-admin')).map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status">Status *</Label>
              <Select
                value={editForm.status}
                onValueChange={(value: any) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-600">Delete User</DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to delete <span className="font-semibold">{selectedUser?.full_name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 space-y-2">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 font-medium">Name:</p>
                  <p className="font-semibold text-red-900 text-lg">{selectedUser.full_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 font-medium">Email:</p>
                  <p className="text-sm text-red-700 font-mono break-all email-preserve-case">{selectedUser.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 font-medium">Role:</p>
                  <Badge className={getRoleBadgeColor(selectedUser.role)}>
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog - stays open after reset so user can copy password */}
      <Dialog open={showResetPasswordDialog} onOpenChange={(open) => {
        if (!open) setTempPassword('');
        setShowResetPasswordDialog(open);
      }}>
        <DialogContent
          onInteractOutside={(e) => { if (tempPassword) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (tempPassword) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.full_name}. A temporary password will be generated.
            </DialogDescription>
          </DialogHeader>
          {tempPassword && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <p className="text-sm font-medium text-green-800">Temporary Password:</p>
              <p className="text-lg font-mono font-bold text-green-900 select-all">{tempPassword}</p>
              <p className="text-xs text-green-700">
                Copy this password and share it securely. Dialog stays open until you click Close.
              </p>
              <Button type="button" size="sm" onClick={handleCopyResetPassword}>
                Copy to clipboard
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowResetPasswordDialog(false); setTempPassword(''); }}>
              {tempPassword ? 'Close' : 'Cancel'}
            </Button>
            {!tempPassword ? (
              <Button onClick={handleResetPassword}>
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </Button>
            ) : (
              <Button onClick={handleCopyResetPassword}>Copy to clipboard</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

