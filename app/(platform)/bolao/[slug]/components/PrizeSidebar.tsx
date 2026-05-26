import { Trophy } from "lucide-react";
import type { BolaoPrize } from "@/lib/types/bolao";

interface PrizeSidebarProps {
  prizes: BolaoPrize[];
  rankingType: "general" | "subscribers";
}

function PrizeList({ prizes, title }: { prizes: BolaoPrize[]; title: string }) {
  if (prizes.length === 0) return (
    <p className="rounded-xl border border-border bg-background/60 p-4 text-sm font-medium text-muted-foreground">
      Premiação será divulgada em breve.
    </p>
  );

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{title}</p>
      {prizes.map((prize) => (
        <div key={prize.id} className="overflow-hidden rounded-2xl border border-border bg-background/80 shadow-md transition-transform hover:scale-[1.02]">
          {prize.image_url ? (
            <img src={prize.image_url} alt={prize.title} className="h-32 w-full object-cover" />
          ) : (
            <div className="flex h-32 w-full items-center justify-center bg-muted/30 text-accent">
              <Trophy size={40} className="opacity-50" />
            </div>
          )}
          <div className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">{prize.position}º lugar</p>
            <p className="mt-1 text-base font-black text-foreground">{prize.title}</p>
            {prize.description && <p className="mt-1 text-xs text-muted-foreground">{prize.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PrizeSidebar({ prizes, rankingType }: PrizeSidebarProps) {
  const filteredPrizes = prizes.filter(p => p.ranking_type === rankingType);
  const title = rankingType === "general" ? "Ranking Geral" : "Ranking Assinantes";

  return (
    <aside className="rounded-2xl border border-border bg-card p-5 shadow-lg xl:sticky xl:top-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-inner">
          <Trophy size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Premiação</p>
          <h3 className="text-xl font-black tracking-tight text-foreground">Prêmios do Bolão</h3>
        </div>
      </div>

      <div className="space-y-8">
        <PrizeList prizes={filteredPrizes} title={title} />
      </div>
    </aside>
  );
}
