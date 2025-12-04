import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Key, Users, Edit, Save, X, Eye, EyeOff, LogOut } from 'lucide-react';
import UserManagement from './UserManagement';
import Layout from '@/components/layout/Layout';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    department: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Initialize profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        phone: (user as any).phone || '',
        department: (user as any).department || '',
      });
    }
  }, [user]);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      toast({
        title: 'Validation Error',
        description: 'All password fields are required',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileData.full_name) {
      toast({
        title: 'Validation Error',
        description: 'Full name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });

      // Update user in localStorage
      if (data.data?.user) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        window.location.reload(); // Reload to update user context
      }

      setIsEditingProfile(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        phone: (user as any).phone || '',
        department: (user as any).department || '',
      });
    }
    setIsEditingProfile(false);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full ${user?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Security
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>View and manage your account details</CardDescription>
                  </div>
                  {!isEditingProfile && (
                    <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditingProfile ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          value={profileData.full_name}
                          onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                          className="mt-1"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email</Label>
                        <p className="text-lg font-medium mt-1 text-gray-400">{user?.email}</p>
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="mt-1"
                          placeholder="Enter your phone number"
                        />
                      </div>

                      <div>
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={profileData.department}
                          onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                          className="mt-1"
                          placeholder="Enter your department"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-500">Role</Label>
                        <div className="mt-1">
                          <Badge className={getRoleBadgeColor(user?.role || '')}>
                            {user?.role}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">Role cannot be changed</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={handleUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="flex-1"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isUpdatingProfile}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                        <p className="text-lg font-medium mt-1">{user?.full_name}</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email</Label>
                        <p className="text-lg font-medium mt-1">{user?.email}</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-500">Role</Label>
                        <div className="mt-1">
                          <Badge className={getRoleBadgeColor(user?.role || '')}>
                            {user?.role}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-500">Status</Label>
                        <div className="mt-1">
                          <Badge className="bg-green-100 text-green-800">
                            {user?.status || 'active'}
                          </Badge>
                        </div>
                      </div>

                      {(user as any)?.department && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Department</Label>
                          <p className="text-lg font-medium mt-1">{(user as any).department}</p>
                        </div>
                      )}

                      {(user as any)?.phone && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Phone</Label>
                          <p className="text-lg font-medium mt-1">{(user as any).phone}</p>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium text-gray-500">Account Created</Label>
                        <p className="text-lg font-medium mt-1">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 border-t">
                      <Button variant="outline" onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-w-md">
                  <div>
                    <Label htmlFor="current_password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current_password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isChangingPassword}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new_password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isChangingPassword}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm_password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isChangingPassword}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="w-full"
                  >
                    {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab (Admin Only) */}
          {user?.role === 'admin' && (
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}

