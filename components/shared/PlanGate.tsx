import { Plan } from "@/lib/mock-data";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PlanGateProps {
  requiredPlan: Plan | Plan[];
  currentPlan: Plan;
  children: React.ReactNode;
  fallbackMessage?: string;
  className?: string;
}

const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 0,
  torcedor: 1, // Actually free is Torcedor according to rules, or Torcedor is free
  camisa: 2,
  campeao: 3
};

export function PlanGate({ requiredPlan, currentPlan, children, fallbackMessage, className }: PlanGateProps) {
  const reqLevels = Array.isArray(requiredPlan) 
    ? requiredPlan.map(p => PLAN_HIERARCHY[p])
    : [PLAN_HIERARCHY[requiredPlan]];
  
  const currentLevel = PLAN_HIERARCHY[currentPlan];
  const minRequiredLevel = Math.min(...reqLevels);

  const hasAccess = currentLevel >= minRequiredLevel;

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border bg-card/50", className)}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-accent text-bg-dark flex items-center justify-center mb-4">
          <Lock size={24} />
        </div>
        <h4 className="text-lg font-bold text-foreground mb-2">Conteúdo Exclusivo</h4>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          {fallbackMessage || "Faça upgrade do seu plano para acessar este conteúdo e ajudar o Camila FC a crescer!"}
        </p>
        <Link 
          href="/planos"
          className="bg-primary hover:bg-primary-light text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Ver Planos
        </Link>
      </div>
      {/* Render children blurred behind the gate */}
      <div className="opacity-30 pointer-events-none select-none blur-sm">
        {children}
      </div>
    </div>
  );
}
