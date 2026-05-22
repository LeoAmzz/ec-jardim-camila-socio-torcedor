"use client";

import { Menu, Bell, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 w-full h-14 bg-background border-b border-border flex items-center justify-between px-4 z-40 md:hidden">
      <button className="p-2 text-muted-foreground hover:text-foreground">
        <Menu size={24} />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center border border-accent">
          <ShieldCheck size={14} className="text-accent" />
        </div>
        <span className="font-bold text-white tracking-wide">Camila</span>
      </div>

      <Link href="/notificacoes" className="p-2 text-muted-foreground hover:text-foreground relative">
        <Bell size={24} />
        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-background" />
      </Link>
    </header>
  );
}
