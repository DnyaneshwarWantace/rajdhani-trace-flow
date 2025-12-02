import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Download,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';

interface ActivityLog {
  _id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  action: string;
  action_category: string;
  description: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time: number;
  created_at: string;
  ip_address?: string;
}

interface ActivityStats {
  total_logs: number;
  recent_activity_24h: number;
  success_rate: number;
  error_rate: number;
  avg_response_time: number;
  by_category: { category: string; count: number }[];
  by_method: { method: string; count: number }[];
  top_users: { user_name: string; user_role: string; activity_count: number }[];
}

export default function ActivityLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionCategory, setActionCategory] = useState('all');
  const [method, setMethod] = useState('all');
  const [statusCode, setStatusCode] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const limit = 50;

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://rajdhani.wantace.com';

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user?.role === 'admin') {
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      newSocket.on('connect', () => {
        console.log('🔌 Connected to Socket.IO');
        // Join admin logs room
        newSocket.emit('join-admin-logs', {
          email: user.email,
          role: user.role
        });
      });

      newSocket.on('joined-logs-room', (data) => {
        if (data.success) {
          console.log('✅ Joined admin logs room');
          toast({
            title: 'Real-time logs enabled',
            description: 'You will see activity logs in real-time'
          });
        }
      });

      newSocket.on('new-activity', (newLog: ActivityLog) => {
        console.log('📨 New activity log:', newLog);
        // Add new log to the top of the list
        setLogs(prev => [newLog, ...prev].slice(0, limit));

        // Show toast notification for important actions
        if (newLog.status_code >= 400 || newLog.action_category === 'USER' || newLog.action === 'LOGIN') {
          toast({
            title: newLog.user_name,
            description: newLog.description,
            variant: newLog.status_code >= 400 ? 'destructive' : 'default'
          });
        }
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Disconnected from Socket.IO');
      });

      setSocket(newSocket);

      return () => {
        newSocket.emit('leave-admin-logs');
        newSocket.disconnect();
      };
    }
  }, [user, SOCKET_URL]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(actionCategory !== 'all' && { action_category: actionCategory }),
        ...(method !== 'all' && { method }),
        ...(statusCode !== 'all' && { status_code: statusCode })
      });

      const response = await fetch(`${API_BASE_URL}/activity-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.pagination.total_pages);
        setTotalLogs(data.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch activity logs',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, actionCategory, method, statusCode, API_BASE_URL]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activity-logs/stats/overview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  // Helper functions
  const getActionCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      AUTH: 'bg-blue-100 text-blue-800',
      USER: 'bg-purple-100 text-purple-800',
      ORDER: 'bg-green-100 text-green-800',
      ITEM: 'bg-yellow-100 text-yellow-800',
      PRODUCT: 'bg-pink-100 text-pink-800',
      CLIENT: 'bg-indigo-100 text-indigo-800',
      SETTINGS: 'bg-gray-100 text-gray-800',
      PERMISSION: 'bg-orange-100 text-orange-800',
      FILE: 'bg-cyan-100 text-cyan-800',
      REPORT: 'bg-teal-100 text-teal-800',
      API: 'bg-slate-100 text-slate-800',
      OTHER: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      PATCH: 'bg-orange-100 text-orange-800',
      DELETE: 'bg-red-100 text-red-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const getStatusCodeColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'bg-green-100 text-green-800';
    if (statusCode >= 300 && statusCode < 400) return 'bg-blue-100 text-blue-800';
    if (statusCode >= 400 && statusCode < 500) return 'bg-yellow-100 text-yellow-800';
    if (statusCode >= 500) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800',
      operator: 'bg-yellow-100 text-yellow-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleRefresh = () => {
    fetchLogs();
    fetchStats();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast({
      title: 'Export',
      description: 'Export functionality coming soon'
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_logs.toLocaleString()}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.recent_activity_24h} in last 24h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.success_rate}%</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Requests succeeded</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.error_rate}%</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Requests failed</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Avg Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avg_response_time}ms</div>
                <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>Average time</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="User, action, endpoint..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={actionCategory} onValueChange={setActionCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="AUTH">Authentication</SelectItem>
                    <SelectItem value="USER">User Management</SelectItem>
                    <SelectItem value="ORDER">Orders</SelectItem>
                    <SelectItem value="ITEM">Items</SelectItem>
                    <SelectItem value="PRODUCT">Products</SelectItem>
                    <SelectItem value="CLIENT">Clients</SelectItem>
                    <SelectItem value="SETTINGS">Settings</SelectItem>
                    <SelectItem value="PERMISSION">Permissions</SelectItem>
                    <SelectItem value="FILE">Files</SelectItem>
                    <SelectItem value="REPORT">Reports</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="method">HTTP Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status Code</Label>
                <Select value={statusCode} onValueChange={setStatusCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="200">200 - OK</SelectItem>
                    <SelectItem value="201">201 - Created</SelectItem>
                    <SelectItem value="400">400 - Bad Request</SelectItem>
                    <SelectItem value="401">401 - Unauthorized</SelectItem>
                    <SelectItem value="403">403 - Forbidden</SelectItem>
                    <SelectItem value="404">404 - Not Found</SelectItem>
                    <SelectItem value="500">500 - Server Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Showing {logs.length} of {totalLogs.toLocaleString()} logs
                </CardDescription>
              </div>
              {socket?.connected && (
                <Badge className="bg-green-100 text-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          <p className="text-gray-500">Loading activity logs...</p>
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No activity logs found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log._id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{log.user_name}</div>
                            <div className="text-xs text-gray-500">{log.user_email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(log.user_role)}>
                              {log.user_role}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm truncate" title={log.description}>
                              {log.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionCategoryColor(log.action_category)}>
                              {log.action_category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getMethodColor(log.method)}>
                              {log.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-gray-600">
                            {log.endpoint}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusCodeColor(log.status_code)}>
                              {log.status_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {log.response_time}ms
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
