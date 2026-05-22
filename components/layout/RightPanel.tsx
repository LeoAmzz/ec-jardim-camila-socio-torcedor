"use client";

import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";
import { MOCK_POOL } from "@/lib/mock-data";
import { Avatar } from "@/components/shared/Avatar";
import Link from "next/link";

export function RightPanel() {
  const pathname = usePathname();

  // Show only on specific paths
  if (pathname !== "/home" && pathname !== "/bolao") {
    return null;
  }

  const top3 = MOCK_POOL.ranking.slice(0, 3);

  return (
    <aside className="fixed right-0 top-0 h-full w-[280px] bg-background border-l border-border hidden xl:flex flex-col z-40 p-4 overflow-y-auto">
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={20} className="text-accent" />
          <h3 className="font-bold text-white">BOLÃO DA RODADA</h3>
        </div>
        
        <p className="text-xs text-muted-foreground mb-4 font-semibold uppercase">{MOCK_POOL.title}</p>
        
        <div className="space-y-3 mb-4">
          {top3.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 text-center font-bold text-sm">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </div>
              <Avatar name={r.user.name} className="w-8 h-8" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{r.user.name}</p>
                <p className="text-xs text-muted-foreground">{r.points} pts</p>
              </div>
            </div>
          ))}
        </div>

        <Link href="/bolao" className="text-xs text-primary-light hover:text-primary font-bold transition-colors w-full inline-block mb-6">
          Ranking completo &gt;
        </Link>

        <div>
          <h4 className="text-xs font-bold text-muted-foreground mb-3 uppercase">Seus Palpites</h4>
          <div className="space-y-2 mb-4">
            {MOCK_POOL.matches.slice(0, 3).map((match) => (
              <div key={match.id} className="flex items-center justify-between bg-background rounded-lg p-2 border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-primary/20 rounded-full" />
                  <span className="text-xs font-bold">X</span>
                  <div className="w-5 h-5 bg-muted rounded-full" />
                </div>
                <div className="bg-primary/10 text-primary-light font-bold text-xs px-2 py-1 rounded">
                  0 - 0
                </div>
              </div>
            ))}
          </div>
          
          <Link href="/bolao">
            <button className="w-full py-2 bg-sidebar-accent hover:bg-border text-foreground rounded-lg text-xs font-bold transition-colors">
              Revisar palpites &gt;
            </button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
