import React, { useState } from 'react';
import { useAuth, User, UserRole, ROLE_PERMISSIONS } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  Plus,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  LogOut,
  Eye,
  Factory,
  Package,
  Truck,
  ShoppingCart,
  Crown,
  Clock,
  Bell,
  Construction
} from 'lucide-react';

const Settings: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Mock users data - in real app, this would come from your backend
  const [users] = useState<User[]>([
    {
      id: 'admin_001',
      email: 'admin@rajdhani.com',
      name: 'Admin User',
      role: 'admin',
      permissions: ROLE_PERMISSIONS.admin,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    },
    {
      id: 'prod_001',
      email: 'production@rajdhani.com',
      name: 'Production Manager',
      role: 'production',
      permissions: ROLE_PERMISSIONS.production,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'inv_001',
      email: 'inventory@rajdhani.com',
      name: 'Inventory Manager',
      role: 'inventory',
      permissions: ROLE_PERMISSIONS.inventory,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }
  ]);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: '' as UserRole | '',
    password: ''
  });

  const getRoleIcon = (role: UserRole) => {
    const icons = {
      admin: Crown,
      production: Factory,
      inventory: Package,
      raw_material: Truck,
      orders: ShoppingCart
    };
    return icons[role] || Users;
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      production: 'bg-blue-100 text-blue-800',
      inventory: 'bg-green-100 text-green-800',
      raw_material: 'bg-orange-100 text-orange-800',
      orders: 'bg-indigo-100 text-indigo-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const handleAddUser = () => {
    // In real app, this would call your API to create user
    console.log('Adding user:', newUser);
    setNewUser({ name: '', email: '', role: '', password: '' });
    setShowAddUserDialog(false);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your system preferences and manage application settings
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Coming Soon
        </Badge>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Construction className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Settings Page Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground max-w-md mx-auto">
            We're working hard to bring you a comprehensive settings page with system configuration, 
            user preferences, and application management features.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="p-4 border rounded-lg bg-muted/50">
              <SettingsIcon className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">System Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure system-wide preferences and application behavior
              </p>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/50">
              <Bell className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Manage notification preferences and alert settings
              </p>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/50">
              <SettingsIcon className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">User Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Customize your personal dashboard and interface settings
              </p>
            </div>
          </div>

          <div className="pt-6">
            <Button disabled className="opacity-50 cursor-not-allowed">
              <Clock className="w-4 h-4 mr-2" />
              Settings Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Current System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Application Version:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">System Status:</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Operational
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="font-medium">{new Date().toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" disabled>
              <SettingsIcon className="w-4 h-4 mr-2" />
              System Configuration
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Bell className="w-4 h-4 mr-2" />
              Notification Settings
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <SettingsIcon className="w-4 h-4 mr-2" />
              User Preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Settings;
