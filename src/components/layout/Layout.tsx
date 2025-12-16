import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useActivityLogs } from '@/hooks/useActivityLogs';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // Initialize activity logs (Socket.IO connection)
  useActivityLogs();
  // Initialize sidebar state: use localStorage to persist user preference
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check localStorage first
      const savedState = localStorage.getItem('sidebarOpen');
      if (savedState !== null) {
        return savedState === 'true';
      }
      // Default: open on desktop, closed on mobile
      return window.innerWidth >= 1024;
    }
    return false; // Default to closed on SSR
  });

  // Update sidebar state when window is resized
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      // On mobile (< 1024px), close sidebar if open
      // On desktop, don't auto-open - let user control it
      if (!isDesktop && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', String(newState));
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    localStorage.setItem('sidebarOpen', 'false');
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
      <Header onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

      <div className="flex w-full overflow-x-hidden pt-16">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          onToggle={toggleSidebar}
        />

        {/* Main Content */}
        <main
          className={`
            flex-1 transition-all duration-300
            ${isSidebarOpen ? 'lg:ml-56' : 'lg:ml-16'}
            p-2 sm:p-3 lg:p-4
            w-full
            min-w-0
            overflow-x-hidden
          `}
        >
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
