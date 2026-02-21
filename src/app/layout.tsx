import { Outlet, NavLink, useLocation } from "react-router";
import { Upload, MessageSquare, Users, Bot, User } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Загрузка и обработка данных",
  "/requests": "Список обращений",
  "/managers": "Менеджеры",
  "/ai-assistant": "AI-ассистент",
};

function usePageTitle(): string {
  const { pathname } = useLocation();
  return PAGE_TITLES[pathname] ?? "";
}

export function Layout() {
  const pageTitle = usePageTitle();
  const navItems = [
    { to: "/", label: "Импорт данных", icon: Upload, exact: true },
    { to: "/requests", label: "Обращения", icon: MessageSquare },
    { to: "/managers", label: "Менеджеры", icon: Users },
    { to: "/ai-assistant", label: "AI-ассистент", icon: Bot },
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-[220px] bg-card border-r border-border flex flex-col">
        <div className="h-16 border-b border-border flex items-center px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-semibold text-sm">F</span>
            </div>
            <span className="font-semibold text-foreground">FIRE</span>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <item.icon size={18} />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-md cursor-pointer transition-colors">
              <User size={16} className="text-muted-foreground" />
              <span className="text-sm">Администратор</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
