import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BolaoTeam } from "@/lib/types/bolao";

interface TeamLogoProps {
  team: Pick<BolaoTeam, "id" | "name" | "short_name" | "logo_url"> | null;
  tone: "home" | "away";
}

export function TeamLogo({ team, tone }: TeamLogoProps) {
  const teamName = team?.short_name || team?.name || "Time";

  if (team?.logo_url) {
    return (
      <img
        src={team.logo_url}
        alt={`Logo de ${teamName}`}
        className="h-14 w-14 rounded-full border-2 border-background bg-card object-contain p-1 shadow-md md:h-16 md:w-16"
      />
    );
  }

  return (
    <div className={cn(
      "flex h-14 w-14 items-center justify-center rounded-full border-2 border-background shadow-md md:h-16 md:w-16",
      tone === "home" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
    )}>
      <ShieldCheck size={28} />
    </div>
  );
}
