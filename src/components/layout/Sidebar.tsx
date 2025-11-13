import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Calculator
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarContext } from "@/contexts/SidebarContext";

interface SidebarProps {
  className?: string;
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
    icon: Factory,
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
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    color: "text-gray-600",
    permission: 'settings'
  }
];

export function Sidebar({ className }: SidebarProps) {
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
      "flex flex-col bg-card border-r transition-all duration-300",
      "h-screen fixed left-0 top-0",
      isCollapsed ? "w-16" : "w-64",
      "z-50",
      className
    )}>
      {/* Header */}
      <div className={cn("border-b", isCollapsed ? "p-2" : "p-4 md:p-6")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center">
              <Factory className="w-4 h-4 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg md:text-xl font-bold text-primary">Rajdhani Carpet</h1>
                <p className="text-xs md:text-sm text-muted-foreground">ERP System</p>
                {user && (
                  <p className="text-xs text-primary font-medium capitalize">
                    {user.role.replace('_', ' ')} User
                  </p>
                )}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-6 w-6 md:h-8 md:w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
            ) : (
              <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1 md:space-y-2 overflow-y-auto sidebar-scrollbar", isCollapsed ? "p-1 md:p-2" : "p-2 md:p-4")}>
        {filteredSidebarItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} to={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full text-left transition-all duration-200 group",
                  isCollapsed ? "h-10 md:h-12 justify-center px-0" : "h-10 md:h-12 justify-start",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/20 shadow-sm",
                  !isActive && "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon className={cn(
                  "h-4 w-4 md:h-5 md:w-5 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-primary" : item.color,
                  !isActive && "group-hover:text-slate-700 dark:group-hover:text-slate-300",
                  !isCollapsed && "mr-2 md:mr-3"
                )} />
                {!isCollapsed && (
                  <span className="font-medium text-sm md:text-base truncate transition-colors duration-200 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                    {item.title}
                  </span>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("border-t", isCollapsed ? "p-1 md:p-2" : "p-2 md:p-4")}>
        {/* User Info & Logout */}
        {!isCollapsed && user && (
          <div className="mb-3 p-2 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Logged in as:</div>
            <div className="text-sm font-medium truncate">{user.full_name}</div>
            <div className="text-xs text-muted-foreground">{user.role}</div>
          </div>
        )}
        
        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            "w-full text-left transition-all duration-200 group",
            isCollapsed ? "h-10 md:h-12 justify-center px-0" : "h-10 md:h-12 justify-start",
            "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className={cn(
            "h-4 w-4 md:h-5 md:w-5 flex-shrink-0 transition-colors duration-200",
            "group-hover:text-red-600 dark:group-hover:text-red-400",
            !isCollapsed && "mr-2 md:mr-3"
          )} />
          {!isCollapsed && (
            <span className="font-medium text-sm md:text-base transition-colors duration-200 group-hover:text-red-600 dark:group-hover:text-red-400">
              Logout
            </span>
          )}
        </Button>

        {!isCollapsed && (
          <div className="text-xs text-muted-foreground text-center mt-2">
            Version 1.0.0
          </div>
        )}
      </div>
    </div>
  );
}