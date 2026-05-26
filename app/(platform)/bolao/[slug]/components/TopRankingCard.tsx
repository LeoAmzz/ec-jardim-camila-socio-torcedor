import { Badge } from "@/components/shared/Badge";
import type { BolaoRankingRow } from "@/lib/types/bolao";
import { cn } from "@/lib/utils";

interface TopRankingCardProps {
  row: BolaoRankingRow;
  index: number;
}

function getInitials(row: BolaoRankingRow) {
  const name = row.full_name || row.username || "Torcedor";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function RankingAvatar({ row, featured = false }: { row: BolaoRankingRow; featured?: boolean }) {
  const sizeClass = featured ? "h-16 w-16 text-lg" : "h-10 w-10 text-xs";

  if (row.avatar_url) {
    return (
      <img
        src={row.avatar_url}
        alt={`Avatar de ${row.full_name || row.username || "torcedor"}`}
        className={cn(sizeClass, "rounded-full border-2 border-background bg-card object-cover shadow-md")}
      />
    );
  }

  return (
    <div className={cn(sizeClass, "flex items-center justify-center rounded-full border-2 border-background bg-primary font-black text-white shadow-md")}>
      {getInitials(row)}
    </div>
  );
}

function getPlanLabel(planType: string | null) {
  if (planType === "campeao") return "Campeão";
  if (planType === "camisa") return "Camisa";
  return "Torcedor";
}

export function TopRankingCard({ row, index }: TopRankingCardProps) {
  const medalStyles = [
    "border-amber-400/50 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.15)]", // Gold
    "border-slate-300/40 bg-slate-300/10 shadow-[0_0_15px_rgba(203,213,225,0.1)]", // Silver
    "border-orange-600/50 bg-orange-600/10 shadow-[0_0_15px_rgba(234,88,12,0.1)]", // Bronze
  ];

  const numberColors = [
    "text-amber-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]",
    "text-slate-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]",
    "text-orange-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]",
  ];

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-transform hover:scale-[1.02]", medalStyles[index] || "border-border bg-card")}>
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
      
      <div className="flex items-center gap-4 relative z-10">
        <span className={cn("text-5xl font-black italic", numberColors[index])}>
          {row.position}
        </span>
        <RankingAvatar row={row} featured />
        <div className="flex-1 min-w-0">
          <p className="line-clamp-2 break-words leading-tight text-lg font-black text-foreground">{row.full_name || row.username || "Torcedor"}</p>
          {row.username && <p className="truncate text-xs text-muted-foreground">@{row.username}</p>}
        </div>
        <div className="hidden sm:block">
           <Badge variant={row.plan_type === "torcedor" ? "gray" : "yellow"}>{getPlanLabel(row.plan_type)}</Badge>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 items-center gap-2 relative z-10">
        <div className="col-span-1 rounded-xl bg-background/40 p-2 text-center shadow-inner">
           <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">V/E</p>
           <p className="text-lg font-black text-foreground">{row.winner_hits}</p>
        </div>
        <div className="col-span-1 rounded-xl bg-background/40 p-2 text-center shadow-inner">
           <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Exato</p>
           <p className="text-lg font-black text-foreground">{row.exact_score_hits}</p>
        </div>
        <div className="col-span-2 rounded-xl bg-primary/20 p-2 text-center shadow-inner border border-primary/30">
           <p className="text-[10px] font-black uppercase tracking-wider text-primary">Pontuação total</p>
           <p className="text-2xl sm:text-3xl font-black text-white">{row.points_total}</p>
        </div>
      </div>
    </div>
  );
}

export { RankingAvatar, getPlanLabel };
