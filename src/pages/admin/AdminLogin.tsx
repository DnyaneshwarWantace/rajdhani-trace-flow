import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Eye, EyeOff, Fingerprint, KeyRound } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Use separate localStorage keys for admin portal (not shared with main app)
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));

      toast({
        title: '✅ Admin Access Granted',
        description: `Welcome back, ${data.user.full_name}`,
      });

      navigate('/admin/portal');
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: '❌ Authentication Failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />

      {/* Admin Badge - Top Right */}
      <div className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-primary-200">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm font-semibold text-primary-700">Admin Portal</span>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl blur-xl opacity-40 animate-pulse" />
            <div className="relative bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 shadow-2xl shadow-primary-200">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
            Rajdhani Carpets
          </h1>
          <p className="text-lg text-gray-600 mb-1">Administrator Access</p>
          <div className="flex items-center justify-center gap-2 text-sm text-primary-600">
            <Fingerprint className="w-4 h-4" />
            <span className="font-medium">Secure Authentication</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="relative">
          {/* Card Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 to-blue-400 rounded-3xl blur opacity-20" />

          {/* Card Content */}
          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-primary-200/50 border border-white/50 p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  Email Address
                </label>
                <div className="relative group">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@rajdhani.com"
                    required
                    className="h-12 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-blue-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary-500" />
                  Password
                </label>
                <div className="relative group">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-12 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-blue-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all relative overflow-hidden group"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative flex items-center gap-2">
                      <Lock className="w-5 h-5" />
                      Sign In as Administrator
                    </span>
                  </>
                )}
              </Button>

              {/* Security Notice */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3 text-xs text-gray-500">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500" />
                  <p className="leading-relaxed">
                    This portal is protected and monitored. Only authorized administrators with valid credentials can access the system.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Secure connection established
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>System operational • All services running</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
