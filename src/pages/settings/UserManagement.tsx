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
import { Plus, Edit, Trash2, Key, Search, UserCheck, UserX, Shield } from 'lucide-react';
import UserService, { CreateUserData, UpdateUserData } from '@/services/api/userService';
import RoleService from '@/services/api/roleService';
import { User } from '@/services/api/authService';
import { useAuth } from '@/contexts/AuthContext';

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ value: string; label: string; description: string }[]>([]);
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
    password: '',
    full_name: '',
    role: 'operator',
    phone: '',
    department: ''
  });

  const [editForm, setEditForm] = useState<UpdateUserData>({
    full_name: '',
    role: '',
    phone: '',
    department: '',
    status: 'active'
  });

  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const { data, error } = await UserService.getUsers();
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else if (data) {
      setUsers(data);
    }
    setIsLoading(false);
  };

  const loadRoles = async () => {
    const { data, error } = await RoleService.getActiveRoles();
    if (error) {
      console.error('Error loading roles:', error);
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else if (data) {
      setRoles(data);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast({
        title: 'Validation Error',
        description: 'Email, password, and full name are required',
        variant: 'destructive'
      });
      return;
    }

    const { data, error } = await UserService.createUser(createForm);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'User created successfully'
      });
      setShowCreateDialog(false);
      setCreateForm({
        email: '',
        password: '',
        full_name: '',
        role: 'operator',
        phone: '',
        department: ''
      });
      loadUsers();
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    const { data, error } = await UserService.updateUser(selectedUser.id, editForm);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'User updated successfully'
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      loadUsers();
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const { error } = await UserService.deleteUser(selectedUser.id);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'User deleted successfully'
      });
      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    const { error } = await UserService.resetPassword(selectedUser.id, newPassword);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Password reset successfully'
      });
      setShowResetPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    const { error } = await UserService.updateUserStatus(user.id, newStatus);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
      });
      loadUsers();
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'operator': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-indigo-100 text-indigo-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Create and manage user accounts</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.department || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditForm({
                                full_name: user.full_name,
                                role: user.role,
                                phone: user.phone || '',
                                department: user.department || '',
                                status: user.status as any
                              });
                              setShowEditDialog(true);
                            }}
                            disabled={currentUser?.id === user.id}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            disabled={currentUser?.id === user.id}
                          >
                            {user.status === 'active' ? (
                              <UserX className="w-3 h-3" />
                            ) : (
                              <UserCheck className="w-3 h-3" />
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowResetPasswordDialog(true);
                            }}
                          >
                            <Key className="w-3 h-3" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                            disabled={currentUser?.id === user.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@rajdhani.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) => setCreateForm({ ...createForm, role: value })}
                disabled={roles.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={roles.length === 0 ? "Loading roles..." : "Select a role"} />
                </SelectTrigger>
                <SelectContent>
                  {roles.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      No roles available
                    </SelectItem>
                  ) : (
                    roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {roles.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Failed to load roles. Please refresh the page.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={createForm.department}
                onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                placeholder="Production"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+91 1234567890"
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
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input
                id="edit_full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit_role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                disabled={roles.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={roles.length === 0 ? "Loading roles..." : "Select a role"} />
                </SelectTrigger>
                <SelectContent>
                  {roles.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      No roles available
                    </SelectItem>
                  ) : (
                    roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {roles.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Failed to load roles. Please refresh the page.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="edit_department">Department</Label>
              <Input
                id="edit_department"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit_status">Status</Label>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-medium">{selectedUser.full_name}</p>
              <p className="text-sm text-gray-600">{selectedUser.email}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for this user
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="font-medium">{selectedUser.full_name}</p>
              <p className="text-sm text-gray-600">{selectedUser.email}</p>
            </div>
          )}

          <div>
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

