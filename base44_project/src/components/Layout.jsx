import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Package, Link2, Users, ClipboardList, DollarSign, Settings, 
  Menu, X, ChevronRight, LogOut, Bot, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/", label: "01 物料管理", icon: Package },
  { path: "/clients", label: "02 产业链", icon: Link2 },
  { path: "/employees", label: "03 员工管理", icon: Users },
  { path: "/orders", label: "04 订单管理", icon: ClipboardList },
  { path: "/finance", label: "05 收支管理", icon: DollarSign },
  { path: "/quote-calculator", label: "06 报价中枢", icon: Calculator },
  { path: "/settings", label: "99 基础设置", icon: Settings },
  { path: "/ai-memo", label: "🦞 龙虾聊天室", icon: Bot },
];

export default function Layout() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">正</span>
            </div>
            <h1 className="text-sidebar-foreground font-semibold text-lg hidden sm:block">
              正豪铁艺管理系统
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sidebar-foreground/70 text-sm">
              当前用户: {user.full_name || user.email}
            </span>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <nav className="bg-gradient-to-r from-white via-blue-50 to-white border-b border-gray-200 sticky top-14 z-40 shadow-sm">
        <div className="hidden lg:flex items-center gap-0.5 px-4 h-14">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== "/" && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-2 px-5 h-full text-sm font-medium transition-all duration-200 relative
                  ${isActive 
                    ? "text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md rounded-t-lg" 
                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-t-lg"
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xl:inline">{item.label}</span>
                {isActive && item.label.length <= 8 && (
                  <div className="absolute -bottom-1 left-2 right-2 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 top-14 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
            <div className="bg-card w-64 h-full shadow-xl p-2" onClick={e => e.stopPropagation()}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <main className="p-4 lg:p-6 max-w-[1600px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
