"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PlatformContentWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isBolao = pathname?.startsWith("/bolao");

  return (
    <div className={cn("mx-auto w-full", isBolao ? "max-w-[1440px]" : "max-w-3xl")}>
      {children}
    </div>
  );
}
