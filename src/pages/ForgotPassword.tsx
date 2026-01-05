import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Shield, ArrowLeft, KeyRound, CheckCircle2, XCircle } from 'lucide-react';
import { getApiUrl } from '@/utils/apiConfig';

// Password validation function (matches backend)
const validatePassword = (password: string) => {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('At least 8 characters long');
  }

  if (password && password.length > 128) {
    errors.push('Less than 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter (A-Z)');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter (a-z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('At least one number (0-9)');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// Password requirements list
const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters long', test: (pwd: string) => pwd.length >= 8 },
  { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', test: (pwd: string) => /[A-Z]/.test(pwd) },
  { id: 'lowercase', label: 'At least one lowercase letter (a-z)', test: (pwd: string) => /[a-z]/.test(pwd) },
  { id: 'number', label: 'At least one number (0-9)', test: (pwd: string) => /[0-9]/.test(pwd) },
  { id: 'special', label: 'At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)', test: (pwd: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) },
];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  const API_BASE_URL = getApiUrl();

  // Real-time password validation
  const passwordValidation = useMemo(() => validatePassword(newPassword), [newPassword]);
  const isPasswordValid = passwordValidation.isValid;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to send OTP');
        setIsLoading(false);
        return;
      }

      setSuccess(data.message || 'OTP sent to your email');
      setStep(2);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength (matches backend validation)
    if (!isPasswordValid) {
      setError(passwordValidation.errors.join('. '));
      return;
    }

    // Validate OTP
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to reset password');
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        setIsLoading(false);
        return;
      }

      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep(1);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setAttemptsLeft(3);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-primary-100/50 p-8 border border-primary-100">
        <div className="space-y-1 text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-200">
              {step === 1 && <KeyRound className="w-8 h-8 text-white" />}
              {step === 2 && <Shield className="w-8 h-8 text-white" />}
              {step === 3 && <Lock className="w-8 h-8 text-white" />}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary-900 mb-2">Reset Password</h1>
          <p className="text-primary-600 text-base">
            {step === 1 && 'Enter your email to receive a verification code'}
            {step === 2 && 'Enter the verification code and set your new password'}
          </p>
        </div>
        <div>
          {step === 1 && (
            // Step 1: Request OTP
            <form onSubmit={handleRequestOTP} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending OTP...
                  </div>
                ) : (
                  'Send Verification Code'
                )}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-primary-600 hover:underline">
                  <ArrowLeft className="w-4 h-4 inline mr-1" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          {step === 2 && (
            // Step 2: Verify OTP and Set New Password
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                    {attemptsLeft > 0 && attemptsLeft < 3 && (
                      <span className="block mt-1 text-sm">
                        {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </p>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  className="text-center text-2xl font-bold tracking-widest"
                  required
                  disabled={isLoading}
                  maxLength={6}
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 text-center mt-1">
                  Code expires in 10 minutes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`pl-10 pr-10 ${newPassword && !isPasswordValid ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : newPassword && isPasswordValid ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''}`}
                    required
                    disabled={isLoading}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {newPassword && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Password Requirements:</p>
                    <ul className="space-y-1.5">
                      {passwordRequirements.map((req) => {
                        const isValid = req.test(newPassword);
                        return (
                          <li key={req.id} className="flex items-start gap-2 text-xs">
                            {isValid ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            )}
                            <span className={isValid ? 'text-green-700' : 'text-gray-600'}>
                              {req.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 ${confirmPassword && !passwordsMatch ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : confirmPassword && passwordsMatch ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''}`}
                    required
                    disabled={isLoading}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && passwordsMatch && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToEmail}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={isLoading || otp.length !== 6 || !isPasswordValid || !passwordsMatch}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Resetting...
                    </div>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={handleRequestOTP}
                disabled={isLoading}
                className="w-full text-sm"
              >
                Didn't receive code? Resend OTP
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

