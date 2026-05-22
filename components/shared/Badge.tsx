import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "blue" | "yellow" | "gradient" | "green" | "red" | "gray" | "outline";
}

export function Badge({ children, variant = "blue", className, ...props }: BadgeProps) {
  const variants = {
    blue: "bg-primary text-white border-primary",
    yellow: "bg-accent text-bg-dark border-accent",
    gradient: "bg-gradient-to-r from-primary to-accent text-white border-none",
    green: "bg-success text-white border-success",
    red: "bg-danger text-white border-danger",
    gray: "bg-muted text-muted-foreground border-border",
    outline: "bg-transparent border border-muted-foreground text-muted-foreground"
  };

  return (
    <ShadcnBadge 
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", 
        variants[variant], 
        className
      )}
      {...props}
    >
      {children}
    </ShadcnBadge>
  );
}
