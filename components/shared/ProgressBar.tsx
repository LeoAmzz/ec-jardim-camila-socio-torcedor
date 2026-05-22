import { Progress as ShadcnProgress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percentage: number;
  className?: string;
  indicatorClassName?: string;
}

export function ProgressBar({ percentage, className, indicatorClassName }: ProgressBarProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <ShadcnProgress value={percentage} className="h-3 bg-muted" />
      {/* We need to apply the color to the indicator inside ShadcnProgress or use child components if possible */}
      {/* Shadcn's Progress component receives value and sets transform. To style the internal indicator, 
          we might need standard CSS or wrap it. As a fallback, we'll use a direct div if Shadcn doesn't support indicatorClassName */}
      <div 
        className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-500 bg-primary", indicatorClassName)} 
        style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
      />
    </div>
  );
}
