"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Search, Bell, Scale, Trophy, Target, BarChart2, Settings, ShieldCheck 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENT_USER } from "@/lib/mock-data";
import { Avatar } from "@/components/shared/Avatar";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { Badge } from "@/components/shared/Badge";

const NAV_ITEMS = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Buscar", href: "/buscar", icon: Search },
  { label: "Notificações", href: "/notificacoes", icon: Bell, badge: 3 },
  { label: "Conselho", href: "/conselho", icon: Scale },
  { label: "Sorteios", href: "/sorteios", icon: Trophy },
  { label: "Bolão", href: "/bolao", icon: Target },
  { label: "Transparência", href: "/transparencia", icon: BarChart2 },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-sidebar border-r border-sidebar-border hidden md:flex flex-col z-40">
      {/* Topo / Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center border border-accent">
          <ShieldCheck size={20} className="text-accent" />
        </div>
        <span className="font-bold text-white text-lg tracking-wide">Camila</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (pathname === '/' && item.href === '/home');
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-accent text-white" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              )}
            >
              <item.icon size={20} className={isActive ? "text-white" : "text-muted-foreground"} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="my-6 border-t border-sidebar-border" />

        {/* Card Complete seu Perfil */}
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="mb-2">
            <h4 className="text-xs font-bold text-foreground mb-1">Complete seu perfil</h4>
            <div className="flex items-center gap-2">
              <ProgressBar percentage={33} indicatorClassName="bg-accent" className="h-1.5 flex-1" />
              <span className="text-[10px] font-bold text-accent">33%</span>
            </div>
          </div>
          <ul className="text-xs space-y-1.5 text-muted-foreground">
            <li className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-border" />
              Foto de perfil
            </li>
            <li className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-border" />
              Endereço
            </li>
          </ul>
        </div>
      </nav>

      {/* Rodapé */}
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 mb-3">
          <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} className="w-10 h-10" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{CURRENT_USER.username}</p>
            <Badge variant="blue" className="text-[10px] py-0">{CURRENT_USER.plan}</Badge>
          </div>
        </div>
        <button className="w-full bg-accent hover:bg-accent-dark text-bg-dark font-bold text-sm py-2 px-4 rounded-lg transition-colors">
          Fala, Camila!
        </button>
      </div>
    </aside>
  );
}
