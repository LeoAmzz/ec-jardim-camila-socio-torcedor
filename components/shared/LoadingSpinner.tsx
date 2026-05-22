import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex justify-center items-center w-full min-h-[100px]", className)}>
      <Loader2 size={size} className="animate-spin text-primary" />
    </div>
  );
}
