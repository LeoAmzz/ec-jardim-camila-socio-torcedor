import Link from "next/link";
import { Info } from "lucide-react";
import type { BolaoCompetition } from "@/lib/types/bolao";
import { useAuth } from "@/components/auth/AuthProvider";

interface BolaoHeaderProps {
  competition: BolaoCompetition | null;
  onShowRules: () => void;
}

export function BolaoHeader({ competition, onShowRules }: BolaoHeaderProps) {
  const { profile } = useAuth();

  return (
    <div className="flex flex-col border-b border-border pb-4 md:flex-row md:items-start md:justify-between gap-4">
      <div>
        <Link href="/bolao" className="text-xs font-bold text-accent uppercase tracking-wider hover:text-accent-light transition-colors">
          Voltar para bolões
        </Link>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
          {competition?.name || "Bolão"}
        </h1>
        {competition?.description && (
          <p className="mt-2 text-sm text-muted-foreground">{competition.description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {profile?.role === "admin" && (
          <Link href="/bolao/admin" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Admin do Bolão
          </Link>
        )}
        <button
          type="button"
          onClick={onShowRules}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:border-primary/50 hover:bg-primary/10 transition-all"
        >
          <Info size={16} className="text-accent" /> Regras
        </button>
      </div>
    </div>
  );
}
