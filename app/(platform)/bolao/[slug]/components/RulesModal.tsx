import { Info, X } from "lucide-react";
import type { BolaoCompetition } from "@/lib/types/bolao";

interface RulesModalProps {
  competition: BolaoCompetition | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ competition, isOpen, onClose }: RulesModalProps) {
  if (!isOpen || !competition) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
        
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Info size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Regulamento</p>
              <p className="text-lg font-black text-foreground">Como pontuar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/70 p-5 shadow-sm">
              <p className="text-3xl font-black text-accent">{competition.points_winner || 3}</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">pontos</p>
              <p className="mt-2 text-sm font-medium text-foreground">Acertar vencedor ou empate.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-5 shadow-sm">
              <p className="text-3xl font-black text-accent">+{competition.points_exact_score || 2}</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">extras</p>
              <p className="mt-2 text-sm font-medium text-foreground">Acertar o placar exato.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background/70 p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wider text-accent">Critérios de Desempate</p>
            <ol className="mt-3 space-y-2 text-sm font-medium text-foreground">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-black text-primary">1</span>
                Mais placares exatos
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-black text-primary">2</span>
                Quem palpitou primeiro
              </li>
            </ol>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-primary-light hover:shadow-lg"
          >
            ENTENDI
          </button>
        </div>
      </div>
    </div>
  );
}
