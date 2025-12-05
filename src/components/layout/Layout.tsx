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
  // Initialize sidebar state: closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Check if we're on desktop (lg breakpoint = 1024px)
    if (typeof window !== 'undefined') {
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
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

      <div className="flex">
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
            pt-0
            px-2 sm:px-3 lg:px-4
          `}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
