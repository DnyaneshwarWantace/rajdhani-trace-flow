import { formatIndianDate } from '@/utils/formatHelpers';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Key, Users, Shield, Edit, Save, X, Eye, EyeOff, LogOut, ChevronRight } from 'lucide-react';
import UserManagement from './UserManagement';
import Permissions from './Permissions';
import Layout from '@/components/layout/Layout';

import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'users' | 'permissions'>('profile');
  
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
    email: '',
    full_name: '',
    phone: '',
    department: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Initialize profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email || '',
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
        email: user.email || '',
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
      {/* ─── DESKTOP VIEW ────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Custom Tabs matching ProductTabs style */}
          <div className="mb-6 w-full">
            <div className="bg-gray-100 rounded-lg p-1 w-full">
              <nav className="flex gap-1 w-full" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'profile'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'security'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  Security
                </button>
                {(user?.role === 'admin' || user?.role === 'super-admin') && (
                  <>
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'users'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Users
                    </button>
                    <button
                      onClick={() => setActiveTab('permissions')}
                      className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'permissions'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      Permissions
                    </button>
                  </>
                )}
              </nav>
            </div>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
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
                        <Label htmlFor="email">Email</Label>
                        {user?.role === 'super-admin' ? (
                          <Input
                            id="email"
                            value={profileData.email ?? user?.email ?? ''}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            className="mt-1"
                            placeholder="Email address"
                          />
                        ) : (
                          <>
                            <p className="text-lg font-medium mt-1 text-gray-400">{user?.email}</p>
                            <p className="text-xs text-gray-400 mt-1">Only super admin can change email addresses</p>
                          </>
                        )}
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
                          {user?.created_at ? formatIndianDate(user.created_at) : 'N/A'}
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
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
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
          )}

          {/* Users Tab (Admin & Super Admin) */}
          {(user?.role === 'admin' || user?.role === 'super-admin') && activeTab === 'users' && (
            <UserManagement />
          )}

          {/* Permissions Tab (Admin & Super Admin) */}
          {(user?.role === 'admin' || user?.role === 'super-admin') && activeTab === 'permissions' && (
            <Permissions />
          )}
        </div>
      </div>

      {/* ─── MOBILE VIEW ─────────────────────────────────────────────── */}
      <div className="lg:hidden -m-2 sm:-m-3 flex flex-col bg-[#F3F4F6] min-h-screen pb-24">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-3 shrink-0">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-none">Settings</h1>
          <p className="text-xs text-gray-500 mt-1">Manage your account and preferences</p>
        </div>

        {/* Horizontal Tab Bar (Fitted for mobile viewports) */}
        <div className="bg-white border-b border-gray-200 px-2 py-2 flex gap-1 w-full justify-between shrink-0 select-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-0 px-1.5 py-2 text-[11px] font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'profile'
                ? 'bg-blue-50 text-[#0066FF] shadow-sm'
                : 'text-gray-500 active:bg-gray-100'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 min-w-0 px-1.5 py-2 text-[11px] font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'security'
                ? 'bg-blue-50 text-[#0066FF] shadow-sm'
                : 'text-gray-500 active:bg-gray-100'
            }`}
          >
            <Key className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Security</span>
          </button>
          {(user?.role === 'admin' || user?.role === 'super-admin') && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 min-w-0 px-1.5 py-2 text-[11px] font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'users'
                    ? 'bg-blue-50 text-[#0066FF] shadow-sm'
                    : 'text-gray-500 active:bg-gray-100'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Users</span>
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`flex-1 min-w-0 px-1.5 py-2 text-[11px] font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'permissions'
                    ? 'bg-blue-50 text-[#0066FF] shadow-sm'
                    : 'text-gray-500 active:bg-gray-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Permissions</span>
              </button>
            </>
          )}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-4 space-y-4">
          {/* Profile Tab Mobile */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-4">
              {/* Avatar & Name Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4.5 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0066FF] font-extrabold text-2xl flex items-center justify-center shrink-0">
                  {(user?.full_name || 'R').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-gray-900 leading-tight truncate">{user?.full_name || '—'}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{user?.email || ''}</p>
                  <div className="mt-2.5 flex gap-1.5 flex-wrap">
                    <Badge className={`text-[10px] font-extrabold px-2 py-0.5 shadow-none ${getRoleBadgeColor(user?.role || '')}`}>
                      {user?.role === 'super-admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'User'}
                    </Badge>
                    <Badge className="text-[10px] font-extrabold px-2 py-0.5 bg-green-100 text-green-800 border-none shadow-none">
                      {user?.status || 'active'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Profile Details Card */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-white">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profile Information</span>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white active:bg-gray-50 transition-all select-none"
                    >
                      <Edit className="w-3.5 h-3.5 text-gray-400" />
                      Edit
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <div className="p-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="mob_full_name" className="text-xs font-bold text-gray-500">Full Name *</Label>
                      <Input
                        id="mob_full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                        className="rounded-xl h-[44px] bg-gray-50 border-gray-200 text-sm focus:bg-white focus:border-[#0066FF]"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-500">Email</Label>
                      {user?.role === 'super-admin' ? (
                        <Input
                          value={profileData.email ?? user?.email ?? ''}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="rounded-xl h-[44px] bg-gray-50 border-gray-200 text-sm focus:bg-white focus:border-[#0066FF]"
                          placeholder="Email address"
                        />
                      ) : (
                        <div>
                          <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 select-none">
                            {user?.email}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 px-1">Only super admin can change email addresses</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="mob_phone" className="text-xs font-bold text-gray-500">Phone</Label>
                      <Input
                        id="mob_phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="rounded-xl h-[44px] bg-gray-50 border-gray-200 text-sm focus:bg-white focus:border-[#0066FF]"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="mob_department" className="text-xs font-bold text-gray-500">Department</Label>
                      <Input
                        id="mob_department"
                        value={profileData.department}
                        onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                        className="rounded-xl h-[44px] bg-gray-50 border-gray-200 text-sm focus:bg-white focus:border-[#0066FF]"
                        placeholder="Enter your department"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isUpdatingProfile}
                        className="flex-1 h-11 border border-gray-200 text-gray-700 font-bold text-sm rounded-xl active:bg-gray-50 transition-all select-none"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="flex-[2] h-11 bg-[#0066FF] text-white font-bold text-sm rounded-xl active:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-sm select-none"
                      >
                        {isUpdatingProfile && (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3.5">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</span>
                      <span className="text-sm font-extrabold text-gray-900">{user?.full_name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</span>
                      <span className="text-sm font-extrabold text-gray-900 truncate max-w-[200px]">{user?.email || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</span>
                      <span className="text-sm font-extrabold text-gray-900 capitalize">{user?.role || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone</span>
                      <span className="text-sm font-extrabold text-gray-900">{(user as any)?.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Department</span>
                      <span className="text-sm font-extrabold text-gray-900">{(user as any)?.department || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Member Since</span>
                      <span className="text-sm font-extrabold text-gray-900">
                        {user?.created_at ? formatIndianDate(user.created_at) : '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sign Out Row */}
              {!isEditingProfile && (
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3.5 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl active:bg-[#FEE2E2] transition-all text-left shadow-sm select-none"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center shrink-0">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-extrabold text-sm text-red-600 flex-1">Sign Out</span>
                  <ChevronRight className="w-5 h-5 text-red-400" />
                </button>
              )}
            </div>
          )}

          {/* Security Tab Mobile */}
          {activeTab === 'security' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">Change Password</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update your account password</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mob_current_password" className="text-xs font-bold text-gray-500">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="mob_current_password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10 rounded-xl h-[44px] bg-gray-50 border-gray-200 text-sm focus:bg-white focus:border-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-650"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mob_new_password" className="text-xs font-bold text-gray-500">New Password</Label>
                  <div className="relative">
                    <Input
                      id="mob_new_password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10 rounded-xl h-[44px] bg-gray-50 border-gray-200 text-sm focus:bg-white focus:border-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-650"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mob_confirm_password" className="text-xs font-bold text-gray-500">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="mob_confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10 rounded-xl h-[44px] bg-gray-50 border-gray-200 text-sm focus:bg-white focus:border-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-650"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="w-full h-11 bg-[#0066FF] text-white font-bold text-sm rounded-xl active:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-sm mt-2 select-none"
                >
                  {isChangingPassword ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  Change Password
                </button>
              </div>
            </div>
          )}

          {/* Users Tab Mobile (Admin & Super Admin) */}
          {(user?.role === 'admin' || user?.role === 'super-admin') && activeTab === 'users' && (
            <UserManagement />
          )}

          {/* Permissions Tab Mobile (Admin & Super Admin) */}
          {(user?.role === 'admin' || user?.role === 'super-admin') && activeTab === 'permissions' && (
            <Permissions />
          )}
        </div>
      </div>
    </Layout>
  );
}

