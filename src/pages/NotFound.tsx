import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, LogIn } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Navigate based on user role
    if (user?.role === 'admin' || user?.role === 'super-admin') {
      navigate('/dashboard');
    } else {
      navigate('/orders');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* 404 Animation */}
          <div className="mb-6">
            <div className="text-8xl font-bold text-primary-600 mb-2">404</div>
            <div className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</div>
            <p className="text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Illustration */}
          <div className="my-8">
            <svg
              className="w-48 h-48 mx-auto opacity-50"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.17 15.58L15.58 9.17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-gray-400"
              />
              <path
                d="M15.58 15.58L9.17 9.17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-gray-400"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary-300"
              />
            </svg>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleGoHome}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {isAuthenticated ? (
                <>
                  <Home className="w-5 h-5" />
                  Go to {user?.role === 'admin' || user?.role === 'super-admin' ? 'Dashboard' : 'Orders'}
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Go to Login
                </>
              )}
            </Button>

            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </Button>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Need help? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
