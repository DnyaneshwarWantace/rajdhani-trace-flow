import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Cog,
  Factory,
  BarChart3,
  Settings,
  Users,
  AlertTriangle,
  Home,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Calculator,
  Activity,
  Warehouse
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarContext } from "@/contexts/SidebarContext";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

interface SidebarItem {
  title: string;
  icon: any;
  href: string;
  color: string;
  permission: string; // Page permission key (e.g., 'products', 'orders', 'dashboard')
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    color: "text-primary",
    permission: 'dashboard'
  },
  {
    title: "Order Management",
    icon: ShoppingCart,
    href: "/orders",
    color: "text-blue-600",
    permission: 'orders'
  },
  {
    title: "Customer & Suppliers",
    icon: Users,
    href: "/customers",
    color: "text-indigo-600",
    permission: 'customers' // User needs either customers OR suppliers permission
  },
  {
    title: "Products",
    icon: Package,
    href: "/products",
    color: "text-green-600",
    permission: 'products'
  },
  {
    title: "Production",
    icon: Factory,
    href: "/production",
    color: "text-orange-600",
    permission: 'production'
  },
  {
    title: "Raw Materials",
    icon: Warehouse,
    href: "/materials",
    color: "text-amber-600",
    permission: 'materials'
  },
  {
    title: "Manage Stock",
    icon: AlertTriangle,
    href: "/manage-stock",
    color: "text-red-600",
    permission: 'products' // Uses products permission for stock management
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/analytics",
    color: "text-purple-600",
    permission: 'reports'
  },
  {
    title: "Recipe Calculator",
    icon: Calculator,
    href: "/recipe-calculator",
    color: "text-teal-600",
    permission: 'production' // Uses production permission
  },
  {
    title: "Dropdown Master",
    icon: Cog,
    href: "/dropdown-master",
    color: "text-purple-600",
    permission: 'settings'
  }
];

// Admin-only items (won't be filtered by permissions)
const adminOnlyItems: SidebarItem[] = [
  {
    title: "Activity Logs",
    icon: Activity,
    href: "/activity-logs",
    color: "text-blue-600",
    permission: 'admin' // Admin only
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    color: "text-gray-600",
    permission: 'admin' // Admin only
  }
];

export function Sidebar({ className, onLinkClick }: SidebarProps) {
  const location = useLocation();
  const { isCollapsed, setIsCollapsed, toggleSidebar } = useSidebarContext();
  const { user, hasPageAccess, logout } = useAuth();

  // Filter sidebar items based on page permissions
  const filteredSidebarItems = sidebarItems.filter(item => {
    if (!user) return false;

    // Admin always has access to everything
    if (user.role === 'admin') return true;

    // Special case: Customer & Suppliers - check if user has either customers OR suppliers permission
    if (item.permission === 'customers' && item.href === '/customers') {
      return hasPageAccess('customers') || hasPageAccess('suppliers');
    }
    
    // Check page permission if specified
    if (item.permission) {
      return hasPageAccess(item.permission);
    }
    
    // Default to false if no permission specified
    return false;
  });


  return (
    <div className={cn(
      "flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
      "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)]",
      isCollapsed ? "w-16" : "w-56",
      className
    )}>
      {/* Desktop Toggle Button */}
      <div className="hidden lg:flex justify-end p-3 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <TooltipProvider>
        <nav className="flex-1 space-y-1 overflow-y-auto sidebar-scrollbar p-3">
          {filteredSidebarItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            const linkContent = (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => {
                  // Close mobile menu when link is clicked
                  if (onLinkClick && window.innerWidth < 1024) {
                    onLinkClick();
                  }
                }}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary-600"
                    : "text-gray-600 hover:bg-gray-100",
                  isCollapsed ? "justify-center" : "justify-start"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-primary-600" : "text-gray-600"
                )} />
                {!isCollapsed && (
                  <span className="font-medium text-sm whitespace-nowrap">
                    {item.title}
                  </span>
                )}
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-r-full"></div>
                )}
              </Link>
            );

            return isCollapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.title}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              linkContent
            );
          })}

          {/* Admin-only items */}
          {user?.role === 'admin' && (
            <>
              {!isCollapsed && (
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold mb-2 px-3">ADMIN</p>
                </div>
              )}
              {adminOnlyItems.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                const Icon = item.icon;

                const linkContent = (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => {
                      // Close mobile menu when link is clicked
                      if (onLinkClick && window.innerWidth < 1024) {
                        onLinkClick();
                      }
                    }}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary-600"
                        : "text-gray-600 hover:bg-gray-100",
                      isCollapsed ? "justify-center" : "justify-start"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 flex-shrink-0",
                      isActive ? "text-primary-600" : "text-gray-600"
                    )} />
                    {!isCollapsed && (
                      <span className="font-medium text-sm whitespace-nowrap">
                        {item.title}
                      </span>
                    )}
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-600 rounded-r-full"></div>
                    )}
                  </Link>
                );

                return isCollapsed ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                );
              })}
            </>
          )}
        </nav>
      </TooltipProvider>

      {/* Footer - Logout */}
      <div className="border-t border-gray-200 p-3">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={logout}
                className="w-full flex items-center justify-center p-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors justify-start"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Logout</span>
          </Button>
        )}
      </div>
    </div>
  );
}