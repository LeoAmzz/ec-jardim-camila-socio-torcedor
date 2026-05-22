import { Avatar as ShadcnAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export function Avatar({ src, name, className, fallbackClassName }: AvatarProps) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <ShadcnAvatar className={cn("border border-border", className)}>
      <AvatarImage src={src} alt={name} />
      <AvatarFallback className={cn("bg-primary text-primary-foreground font-semibold", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </ShadcnAvatar>
  );
}
