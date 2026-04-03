import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Package, Link2, Users, ClipboardList, DollarSign, Settings, 
  Menu, X, ChevronRight, LogOut, Bot, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { path: "/", label: "物料看板", icon: Package },
  { path: "/clients", label: "产业链", icon: Link2 },
  { path: "/employees", label: "人事管理", icon: Users },
  { path: "/orders", label: "订单中枢", icon: ClipboardList },
  { path: "/finance", label: "财务风控", icon: DollarSign },
  { path: "/ai-memo", label: "龙虾聊天室", icon: Bot },
  { path: "/settings", label: "系统配置", icon: Settings },
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
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* 桌面端侧边栏 */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <ShieldCheck className="text-white h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sidebar-foreground font-bold text-lg leading-tight">正豪铁艺</span>
            <span className="text-sidebar-foreground/50 text-[10px] tracking-widest uppercase">V1.2 Premium</span>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== "/" && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto opacity-50" />}
                </Link>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="bg-sidebar-accent/50 rounded-2xl p-3 flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">少</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground text-xs font-bold truncate">少爷</p>
              <p className="text-sidebar-foreground/40 text-[10px]">Admin</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground/40" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden h-16 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}><Menu className="h-6 w-6" /></Button>
            <span className="font-bold text-lg text-primary">正豪铁艺</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background/50">
          <div className="max-w-[1400px] mx-auto p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="bg-sidebar w-72 h-full p-4 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8 px-2 text-white">
              <span className="font-bold text-xl">导航菜单</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}><X className="h-6 w-6" /></Button>
            </div>
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl text-base font-medium
                      ${isActive ? "bg-primary text-white" : "text-white/60 hover:bg-white/10"}`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
