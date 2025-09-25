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
  QrCode,
  LogOut
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  className?: string;
}

const sidebarItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    color: "text-primary"
  },
  {
    title: "Order Management",
    icon: ShoppingCart,
    href: "/orders",
    color: "text-orders"
  },
  {
    title: "Inventory System",
    icon: Package,
    href: "/inventory",
    color: "text-inventory"
  },
  {
    title: "Production",
    icon: Factory,
    href: "/production",
    color: "text-production"
  },
  {
    title: "Raw Materials",
    icon: Factory,
    href: "/materials",
    color: "text-materials"
  },
  {
    title: "Products",
    icon: Package,
    href: "/products",
    color: "text-products"
  },
  {
    title: "QR Scanner",
    icon: QrCode,
    href: "/qr-scanner",
    color: "text-purple-600"
  },
  {
    title: "Manage Stock",
    icon: AlertTriangle,
    href: "/manage-stock",
    color: "text-warning"
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/analytics",
    color: "text-accent"
  },
  {
    title: "Customers",
    icon: Users,
    href: "/customers",
    color: "text-muted-foreground"
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    color: "text-muted-foreground"
  },
  {
    title: "Data Initializer",
    icon: Settings,
    href: "/data-initializer",
    color: "text-green-600"
  },
  {
    title: "Backend Test",
    icon: Cog,
    href: "/backend-test",
    color: "text-blue-600"
  }
];

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={cn(
      "flex h-full flex-col bg-card border-r transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      "md:relative fixed z-50 md:z-auto",
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
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
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
      <nav className={cn("flex-1 space-y-1 md:space-y-2", isCollapsed ? "p-1 md:p-2" : "p-2 md:p-4")}>
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} to={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full text-left transition-all",
                  isCollapsed ? "h-10 md:h-12 justify-center px-0" : "h-10 md:h-12 justify-start",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/15",
                  !isActive && "hover:bg-muted"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon className={cn(
                  "h-4 w-4 md:h-5 md:w-5 flex-shrink-0",
                  isActive ? "text-primary" : item.color,
                  !isCollapsed && "mr-2 md:mr-3"
                )} />
                {!isCollapsed && (
                  <span className="font-medium text-sm md:text-base truncate">{item.title}</span>
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
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.role}</div>
          </div>
        )}
        
        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            "w-full text-left transition-all",
            isCollapsed ? "h-10 md:h-12 justify-center px-0" : "h-10 md:h-12 justify-start",
            "hover:bg-destructive/10 hover:text-destructive"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className={cn(
            "h-4 w-4 md:h-5 md:w-5 flex-shrink-0",
            !isCollapsed && "mr-2 md:mr-3"
          )} />
          {!isCollapsed && (
            <span className="font-medium text-sm md:text-base">Logout</span>
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