import { cn } from "@/lib/utils";

export type TabType = "palpitar" | "ranking_assinantes" | "ranking_geral";

interface BolaoTabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export function BolaoTabs({ activeTab, onChange }: BolaoTabsProps) {
  const tabs: { id: TabType; label: string }[] = [
    { id: "palpitar", label: "PALPITAR" },
    { id: "ranking_assinantes", label: "RANKING ASSINANTES" },
    { id: "ranking_geral", label: "RANKING GERAL" },
  ];

  return (
    <div className="flex items-center gap-6 overflow-x-auto no-scrollbar border-b border-border/50 pb-[1px]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative pb-3 text-sm font-black tracking-widest whitespace-nowrap transition-colors",
              isActive ? "text-white" : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 h-1 w-full rounded-t-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
