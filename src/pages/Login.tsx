import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, ArrowLeft, LogIn, ShieldCheck } from 'lucide-react';

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const CSS = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .login-root * {
    text-transform: none !important;
    box-sizing: border-box;
  }
  .login-root {
    /* Inherit main app font (Tailwind body font) */
    font-family: inherit;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f9fafb;
    position: relative;
    overflow: hidden;
  }

  /* ── BACKGROUND ── */
  .login-bg-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 0% 0%, rgba(0, 102, 255, 0.05) 0%, transparent 40%),
                radial-gradient(circle at 100% 100%, rgba(0, 102, 255, 0.05) 0%, transparent 40%);
    z-index: 1;
  }
  .login-decor-orb {
    position: absolute;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(0, 102, 255, 0.03) 0%, transparent 70%);
    border-radius: 9999px;
    top: -200px; left: -200px;
    animation: float 10s infinite ease-in-out;
    z-index: 1;
  }

  /* ── CONTAINER ── */
  .login-container {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 1000px;
    display: flex;
    background: #ffffff;
    border-radius: 32px;
    overflow: hidden;
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.05),
                0 0 0 1px rgba(0, 0, 0, 0.02);
    margin: 24px;
    animation: fadeInUp 0.8s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* ── LEFT (Side Content) ── */
  .login-left {
    flex: 1;
    background: #0066ff;
    padding: 64px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: #ffffff;
    position: relative;
    overflow: hidden;
  }
  .login-left::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url('/v2/login-bg.jpg') center/cover;
    filter: brightness(0.4) saturate(1.2);
    opacity: 0.15;
  }
  .login-left-content { position: relative; z-index: 2; }
  .login-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 80px;
    transition: color 0.2s;
  }
  .login-back-btn:hover { color: #ffffff; }

  .login-brand-logo {
    width: 56px; height: 56px;
    background: #ffffff;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0066ff;
    font-family: 'Cormorant Garamond', serif;
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 32px;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }
  .login-left-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 40px;
    font-weight: 500;
    line-height: 1.1;
    margin-bottom: 24px;
  }
  .login-left-title span { opacity: 0.7; font-style: italic; }
  .login-left-desc {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    max-width: 320px;
  }

  .login-left-footer {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
  }

  /* ── RIGHT (Form) ── */
  .login-right {
    flex: 1.1;
    padding: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: #ffffff;
  }
  .login-header { margin-bottom: 40px; }
  .login-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 36px;
    font-weight: 600;
    color: #001433;
    margin-bottom: 8px;
  }
  .login-subtitle { font-size: 15px; color: #6b7280; font-weight: 400; }

  /* ── FORM ── */
  .field-group { margin-bottom: 24px; }
  .field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-icon {
    position: absolute;
    left: 16px;
    color: #9ca3af;
  }
  .field-input {
    width: 100%;
    padding: 14px 16px 14px 48px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #fdfdfd;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    color: #1a1a1a;
    transition: all 0.25s;
    outline: none;
  }
  .field-input:focus {
    border-color: #0066ff;
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.08);
  }
  .password-toggle {
    position: absolute;
    right: 16px;
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px;
    display: flex;
    transition: color 0.2s;
  }
  .password-toggle:hover { color: #0066ff; }

  .login-error {
    background: #fef2f2;
    border: 1px solid #fee2e2;
    padding: 12px 16px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    color: #991b1b;
    font-size: 14px;
    animation: fadeIn 0.3s ease;
  }

  .login-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 32px;
  }
  .forgot-link {
    font-size: 13px;
    color: #0066ff;
    text-decoration: none;
    font-weight: 500;
  }

  .submit-btn {
    width: 100%;
    padding: 16px;
    background: #0066ff;
    color: #ffffff;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    box-shadow: 0 8px 24px rgba(0, 102, 255, 0.2);
  }
  .submit-btn:hover:not(:disabled) {
    background: #0052cc;
    box-shadow: 0 12px 32px rgba(0, 102, 255, 0.3);
    transform: translateY(-1px);
  }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .spinner {
    width: 20px; height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .login-footer {
    margin-top: 40px;
    text-align: center;
    font-size: 14px;
    color: #9ca3af;
  }
  .login-footer a { color: #0066ff; text-decoration: none; font-weight: 500; }

  @media (max-width: 900px) {
    .login-container { flex-direction: column; margin: 0; border-radius: 0; height: 100vh; }
    .login-left { display: none; }
    .login-right { padding: 40px 24px; }
  }
`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'rajdhani-login-css';
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => document.getElementById('rajdhani-login-css')?.remove();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-bg-overlay" />
      <div className="login-decor-orb" />

      <div className="login-container">
        {/* Left Panel */}
        <div className="login-left">
          <div className="login-left-content">
            <Link to="/" className="login-back-btn">
              <ArrowLeft size={16} />
              Return Home
            </Link>

            <div className="login-brand-logo">R</div>
            <h1 className="login-left-title">
              Craft Managed<br />
              <span>with Precision</span>
            </h1>
            <p className="login-left-desc">
              Access your digital command center for global carpet operations.
              Secure, real-time, and built for excellence.
            </p>
          </div>

          <div className="login-left-footer">
            <ShieldCheck size={16} />
            Enterprise-grade secure access
          </div>
        </div>

        {/* Right Panel (Form) */}
        <div className="login-right">
          <div className="login-header">
            <h2 className="login-title">Sign In</h2>
            <p className="login-subtitle">Welcome back. Please enter your workstation credentials.</p>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="email-input">Workplace Email</label>
              <div className="input-wrapper">
                <LogIn size={18} className="input-icon" />
                <input
                  id="email-input"
                  type="email"
                  className="field-input"
                  placeholder="name@rajdhani.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="password-input">Security Password</label>
              <div className="input-wrapper">
                <ShieldCheck size={18} className="input-icon" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="field-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-actions">
              <span className="forgot-link" style={{ cursor: 'pointer' }}>Trouble signing in?</span>
            </div>

            <button
              id="workplace-login-btn"
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? <div className="spinner" /> : 'Enter Workstation'}
            </button>
          </form>

          <div className="login-footer">
            <p>© 2024 Rajdhani Carpets Pvt Ltd. Internal Use Only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
