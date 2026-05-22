import { cn } from "@/lib/utils";
import { FileQuestion } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center rounded-lg border border-border bg-card", className)}>
      <div className="w-16 h-16 flex items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
        {icon || <FileQuestion size={32} />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
