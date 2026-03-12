import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Google Fonts ─────────────────────────────────────────────────────────── */
const FONT_LINK_ID = 'rajdhani-landing-fonts';
function injectFonts() {
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap';
  document.head.appendChild(link);
}

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const css = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes shimmerSlide {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes navReveal {
    from { opacity: 0; transform: translateY(-100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .landing-root * {
    text-transform: none !important;
    box-sizing: border-box;
  }
  .landing-root {
    font-family: 'DM Sans', sans-serif;
    background: #ffffff;
    color: #1a1a1a;
    overflow-x: hidden;
    min-height: 100vh;
  }

  /* NAV */
  .lp-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    height: 80px;
    background: transparent;
    transition: all 0.4s cubic-bezier(0.22,1,0.36,1);
  }
  .lp-nav.scrolled {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    height: 72px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid rgba(0, 102, 255, 0.05);
  }
  .lp-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    text-decoration: none;
  }
  .lp-logo-icon {
    width: 44px; height: 44px;
    border: 2px solid #0066ff;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0066ff;
    font-family: 'Cormorant Garamond', serif;
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    box-shadow: 0 8px 16px rgba(0, 102, 255, 0.2);
  }
  .lp-logo-text {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px;
    font-weight: 600;
    color: #001433;
    letter-spacing: 0.02em;
    line-height: 1;
  }
  .lp-logo-sub {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: #0066ff;
    letter-spacing: 0.1em;
    text-transform: uppercase !important;
    margin-top: 2px;
  }
  .lp-nav-links {
    display: flex;
    align-items: center;
    gap: 40px;
  }
  .lp-nav-link {
    font-size: 14px;
    font-weight: 500;
    color: #4b5563;
    text-decoration: none;
    transition: color 0.2s;
    cursor: pointer;
  }
  .lp-nav-link:hover { color: #0066ff; }
  .lp-login-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: #0066ff;
    border: none;
    border-radius: 9999px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 8px 20px rgba(0, 102, 255, 0.25);
  }
  .lp-login-btn:hover {
    background: #0052cc;
    box-shadow: 0 12px 28px rgba(0, 102, 255, 0.35);
    transform: translateY(-2px);
  }

  /* HERO */
  .lp-hero {
    position: relative;
    padding: 180px 80px 120px;
    background: radial-gradient(circle at top right, rgba(0, 102, 255, 0.03), transparent 40%),
                radial-gradient(circle at bottom left, rgba(0, 102, 255, 0.02), transparent 40%);
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 80px;
    max-width: 1440px;
    margin: 0 auto;
  }
  .lp-hero-content {
    max-width: 640px;
  }
  .lp-hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    padding: 8px 16px;
    background: rgba(0, 102, 255, 0.05);
    border-radius: 9999px;
    animation: fadeInUp 0.7s cubic-bezier(0.22,1,0.36,1) both;
  }
  .lp-eyebrow-dot {
    width: 6px; height: 6px;
    background: #0066ff;
    border-radius: 9999px;
  }
  .lp-eyebrow-text {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase !important;
    color: #0066ff;
  }
  .lp-hero-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(48px, 5vw, 80px);
    font-weight: 500;
    line-height: 1.1;
    color: #001433;
    margin: 0 0 24px 0;
    animation: fadeInUp 0.8s 0.2s cubic-bezier(0.22,1,0.36,1) both;
  }
  .lp-hero-title span {
    color: #0066ff;
    font-style: italic;
    background: linear-gradient(120deg, #0066ff 0%, #001433 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .lp-hero-body {
    font-size: 18px;
    font-weight: 400;
    line-height: 1.8;
    color: #4b5563;
    margin-bottom: 40px;
    animation: fadeInUp 0.8s 0.3s cubic-bezier(0.22,1,0.36,1) both;
  }
  .lp-hero-actions {
    display: flex;
    align-items: center;
    gap: 20px;
    animation: fadeInUp 0.8s 0.4s cubic-bezier(0.22,1,0.36,1) both;
  }
  .lp-cta-primary {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 16px 40px;
    background: #0066ff;
    border: none;
    border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 12px 30px rgba(0, 102, 255, 0.25);
  }
  .lp-cta-primary:hover {
    background: #0052cc;
    box-shadow: 0 16px 40px rgba(0, 102, 255, 0.35);
    transform: translateY(-2px);
  }
  .lp-cta-secondary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 16px 36px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 16px;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.3s;
  }
  .lp-cta-secondary:hover {
    border-color: #0066ff;
    color: #0066ff;
    background: rgba(0, 102, 255, 0.02);
  }

  .lp-hero-visual {
    position: relative;
    animation: scaleIn 1s cubic-bezier(0.22,1,0.36,1) both;
  }
  .lp-visual-card {
    position: relative;
    z-index: 2;
    border-radius: 32px;
    overflow: hidden;
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.08);
    aspect-ratio: 4/5;
    background: #f3f4f6;
  }
  .lp-visual-img {
    width: 100%; height: 100%;
    object-fit: cover;
    transition: transform 1s ease;
  }
  .lp-visual-card:hover .lp-visual-img {
    transform: scale(1.05);
  }
  .lp-visual-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%);
  }
  .lp-visual-caption {
    position: absolute;
    bottom: 32px; right: 32px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    padding: 16px 24px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.1);
  }
  .lp-caption-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px;
    font-weight: 600;
    color: #001433;
  }
  .lp-caption-text {
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase !important;
    letter-spacing: 0.1em;
  }
  .lp-visual-decor {
    position: absolute;
    top: -20px; right: -20px;
    width: 120px; height: 120px;
    background: #0066ff;
    border-radius: 24px;
    z-index: 1;
    opacity: 0.1;
    animation: float 6s infinite ease-in-out;
  }

  /* SECTION */
  .lp-section {
    padding: 140px 80px;
    max-width: 1440px;
    margin: 0 auto;
  }
  .lp-section-header {
    text-align: center;
    max-width: 700px;
    margin: 0 auto 80px;
  }
  .lp-label {
    font-size: 12px;
    font-weight: 600;
    color: #0066ff;
    text-transform: uppercase !important;
    letter-spacing: 0.2em;
    margin-bottom: 20px;
    display: block;
  }
  .lp-section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 48px;
    font-weight: 500;
    color: #001433;
    line-height: 1.2;
  }
  .lp-section-title span { color: #0066ff; font-style: italic; }

  /* FLOW CMS */
  .lp-flow {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
  }
  .lp-flow-card {
    padding: 48px 40px;
    background: #ffffff;
    border: 1px solid #f3f4f6;
    border-radius: 24px;
    transition: all 0.4s;
    text-align: center;
  }
  .lp-flow-card:hover {
    border-color: rgba(0, 102, 255, 0.2);
    transform: translateY(-8px);
    box-shadow: 0 24px 60px rgba(0, 102, 255, 0.08);
  }
  .lp-flow-icon {
    width: 64px; height: 64px;
    background: rgba(0, 102, 255, 0.05);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 32px;
    color: #0066ff;
  }
  .lp-flow-icon svg { width: 32px; height: 32px; }
  .lp-flow-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #001433;
  }
  .lp-flow-desc {
    font-size: 15px;
    color: #6b7280;
    line-height: 1.6;
  }

  /* FEATURES */
  .lp-features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
  .lp-feat-card {
    display: flex;
    gap: 24px;
    padding: 32px;
    border-radius: 20px;
    transition: background 0.3s;
  }
  .lp-feat-card:hover {
    background: #f9fafb;
  }
  .lp-feat-icon {
    flex-shrink: 0;
    width: 48px; height: 48px;
    background: #0066ff10;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0066ff;
  }
  .lp-feat-content h3 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 20px;
    font-weight: 600;
    color: #001433;
    margin-bottom: 8px;
  }
  .lp-feat-content p {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.6;
  }

  /* WORKFLOW JOURNEY */
  .lp-journey {
    padding: 140px 80px;
    background: #001433;
    color: #ffffff;
    border-radius: 60px;
    margin: 40px;
    position: relative;
    overflow: hidden;
  }
  .lp-journey-header {
    text-align: center;
    max-width: 800px;
    margin: 0 auto 100px;
  }
  .lp-journey-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 56px;
    font-weight: 500;
    margin-bottom: 24px;
  }
  .lp-journey-title span { color: #0066ff; font-style: italic; }
  .lp-journey-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 120px;
  }
  .lp-step {
    display: flex;
    align-items: center;
    gap: 100px;
  }
  .lp-step:nth-child(even) { flex-direction: row-reverse; }
  .lp-step-content { flex: 1; max-width: 500px; }
  .lp-step-num {
    font-size: 14px;
    font-weight: 600;
    color: #0066ff;
    text-transform: uppercase !important;
    margin-bottom: 16px;
    display: block;
    letter-spacing: 0.2em;
  }
  .lp-step-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 36px;
    font-weight: 600;
    margin-bottom: 24px;
    line-height: 1.2;
  }
  .lp-step-desc {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.8;
  }
  .lp-step-img-box {
    flex: 1;
    height: 500px;
    border-radius: 40px;
    overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,0.4);
    position: relative;
  }
  .lp-step-img {
    width: 100%; height: 100%;
    object-fit: cover;
    transition: transform 0.8s;
  }
  .lp-step:hover .lp-step-img { transform: scale(1.05); }

  /* CTA BAND */
  .lp-cta-band {
    margin: 80px;
    padding: 100px;
    background: #0066ff;
    border-radius: 40px;
    text-align: center;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    overflow: hidden;
  }
  .lp-cta-band::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url('/v2/hero-machine.png') center/cover;
    filter: brightness(0.3) saturate(1.2);
    opacity: 0.25;
  }
  .lp-cta-content { position: relative; z-index: 2; max-width: 700px; }
  .lp-cta-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(40px, 4vw, 64px);
    font-weight: 500;
    margin-bottom: 24px;
  }
  .lp-cta-body {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 48px;
  }
  .lp-btn-white {
    padding: 18px 48px;
    background: #ffffff;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    color: #0066ff;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  }
  .lp-btn-white:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  }

  /* FOOTER */
  .lp-footer {
    padding: 80px;
    background: #f9fafb;
    border-top: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .lp-footer-brand { max-width: 300px; }
  .lp-footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; margin-bottom: 16px; }
  .lp-footer-logo span { color: #0066ff; }
  .lp-footer-desc { font-size: 14px; color: #9ca3af; line-height: 1.6; }
  .lp-footer-nav { display: flex; gap: 80px; }
  .lp-footer-col h4 { font-size: 12px; font-weight: 600; text-transform: uppercase !important; color: #001433; margin-bottom: 24px; letter-spacing: 0.1em; }
  .lp-footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
  .lp-footer-col a { font-size: 14px; color: #6b7280; text-decoration: none; transition: color 0.2s; }
  .lp-footer-col a:hover { color: #0066ff; }

  @media (max-width: 1024px) {
    .lp-hero { grid-template-columns: 1fr; padding-top: 140px; text-align: center; }
    .lp-hero-content { margin: 0 auto; }
    .lp-hero-actions { justify-content: center; }
    .lp-hero-body { margin: 0 auto 40px; }
    .lp-flow { grid-template-columns: 1fr; }
    .lp-features-grid { grid-template-columns: 1fr; }
    .lp-cta-band { margin: 40px 20px; padding: 60px 24px; }
    .lp-section { padding: 80px 40px; }
    .lp-footer { flex-direction: column; gap: 60px; padding: 60px 40px; }
  }
`;

const FEATURES = [
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></svg>, title: 'Order Management', desc: 'Real-time tracking from placement to dispatch with full status visibility.' },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20m0-20l-4 4m4-4l4 4M2 12h20m-20 0l4-4m-4 4l4 4" /></svg>, title: 'Production Workflow', desc: 'Monitor machines, stages, and craftsmanship across the workshop.' },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, title: 'Inventory Control', desc: 'Automated yarn, dye, and material stock alerts and intelligent reordering.' },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>, title: 'Customer Experience', desc: 'Manage client profiles, custom designs, and purchase history seamlessly.' },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7m9-9l-9 9-4-4" /></svg>, title: 'Supplier Network', desc: 'Logistics and vendor management integrated into your core operations.' },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>, title: 'Business Insights', desc: 'Powerful analytics to optimize efficiency and drive profitable growth.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    injectFonts();
    const style = document.createElement('style');
    style.id = 'rajdhani-landing-css';
    style.textContent = css;
    document.head.appendChild(style);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.getElementById('rajdhani-landing-css')?.remove();
    };
  }, []);

  return (
    <div className="landing-root">
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="lp-logo-icon">R</div>
          <div>
            <div className="lp-logo-text">Rajdhani</div>
            <div className="lp-logo-sub">Operations ERP</div>
          </div>
        </div>
        <div className="lp-nav-links">
          <span className="lp-nav-link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Solutions</span>
          <span className="lp-nav-link" onClick={() => document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })}>Architecture</span>
          <button className="lp-login-btn" onClick={() => navigate('/login')}>
            Sign In to Portal
          </button>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-eyebrow">
            <div className="lp-eyebrow-dot" />
            <span className="lp-eyebrow-text">Industrial Excellence at Scale</span>
          </div>
          <h1 className="lp-hero-title">
            Precision <span>Engineering</span> at Global Scale.
          </h1>
          <p className="lp-hero-body">
            Empower your manufacturing hub with a digital ecosystem built for automated excellence.
            Track high-speed production, manage automated looms, and optimize industrial carpet output in one unified platform.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-cta-primary" onClick={() => navigate('/login')}>
              Launch Dashboard
            </button>
            <button className="lp-cta-secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              View Features
            </button>
          </div>
        </div>
        <div className="lp-hero-visual">
          <div className="lp-visual-card">
            <img src="/v2/hero-machine.png" alt="Rajdhani Industrial Hub" className="lp-visual-img" />
            <div className="lp-visual-overlay" />
            <div className="lp-visual-caption">
              <span className="lp-caption-title">Automated Excellence</span>
              <span className="lp-caption-text">Industrial Hub • Unit 07</span>
            </div>
          </div>
          <div className="lp-visual-decor" />
        </div>
      </header>

      <section id="process" className="lp-journey">
        <div className="lp-journey-header">
          <span className="lp-label">The Workflow</span>
          <h2 className="lp-journey-title">The Power of <span>Automated Excellence</span></h2>
          <p style={{ fontSize: '18px', opacity: 0.6, maxWidth: '600px', margin: '0 auto' }}>
            From CAD visualization to high-speed industrial knitting, witness the precision and scale that defines Rajdhani's modern manufacturing.
          </p>
        </div>

        <div className="lp-journey-grid">
          <div className="lp-step">
            <div className="lp-step-content">
              <span className="lp-step-num">Step 01</span>
              <h3 className="lp-step-title">Digital Precision & CAD Lab</h3>
              <p className="lp-step-desc">
                Every design starts in our high-tech CAD lab. Engineers transform complex concepts into precise digital matrices, ready for large-scale industrial output.
              </p>
            </div>
            <div className="lp-step-img-box">
              <img src="/v2/wf-design-machine.png" alt="CAD Design Stage" className="lp-step-img" />
            </div>
          </div>

          <div className="lp-step">
            <div className="lp-step-content">
              <span className="lp-step-num">Step 02</span>
              <h3 className="lp-step-title">Automated Scientific Dyeing</h3>
              <p className="lp-step-desc">
                Precision color matching through automated pressurized vats. Our system monitors chemical ratios and temperature in real-time for perfect consistency across thousands of kilograms.
              </p>
            </div>
            <div className="lp-step-img-box">
              <img src="/v2/wf-dyeing-machine.png" alt="Automated Dyeing Stage" className="lp-step-img" />
            </div>
          </div>

          <div className="lp-step">
            <div className="lp-step-content">
              <span className="lp-step-num">Step 03</span>
              <h3 className="lp-step-title">High-Speed Power Looms</h3>
              <p className="lp-step-desc">
                Witness industrial scale in motion. Automated power looms weave intricate patterns at elite speeds, tracked by our ERP to ensure zero-defect manufacturing and maximum efficiency.
              </p>
            </div>
            <div className="lp-step-img-box">
              <img src="/v2/wf-weaving-machine.png" alt="Industrial Weaving Stage" className="lp-step-img" />
            </div>
          </div>

          <div className="lp-step">
            <div className="lp-step-content">
              <span className="lp-step-num">Step 04</span>
              <h3 className="lp-step-title">Machine Perfected Finishing</h3>
              <p className="lp-step-desc">
                Automated clipping and shearing units ensure a perfect surface texture every time. Our quality control layer logs dozens of machine-verified checkpoints before dispatch.
              </p>
            </div>
            <div className="lp-step-img-box">
              <img src="/v2/wf-finishing-machine.png" alt="Automated Finishing Stage" className="lp-step-img" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="lp-section" style={{ background: '#fcfcfc' }}>
        <div className="lp-section-header">
          <span className="lp-label">Capabilities</span>
          <h2 className="lp-section-title">Built for the <span>Next Generation</span> of Manufacturing</h2>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="lp-feat-card">
              <div className="lp-feat-icon">{f.icon}</div>
              <div className="lp-feat-content">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-cta-band">
        <div className="lp-cta-content">
          <h2 className="lp-cta-title">Ready to <span>Experience</span> the Future of Rajdhani?</h2>
          <p className="lp-cta-body">Join the elite team managing India's finest carpet operations through data-driven precision.</p>
          <button className="lp-btn-white" onClick={() => navigate('/login')}>Get Started Now</button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <div className="lp-footer-logo">Rajdhani <span>ERP</span></div>
          <p className="lp-footer-desc">The ultimate management system for custom carpet manufacturing and supply chain excellence.</p>
        </div>
        <div className="lp-footer-nav">
          <div className="lp-footer-col">
            <h4>Solutions</h4>
            <ul>
              <li><a href="#">Production Management</a></li>
              <li><a href="#">Inventory Control</a></li>
              <li><a href="#">Order Tracking</a></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About Rajdhani</a></li>
              <li><a href="#">Contact Support</a></li>
              <li><a href="#">System Updates</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
