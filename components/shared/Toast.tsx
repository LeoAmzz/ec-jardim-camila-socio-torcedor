"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  onClose: (id: string) => void;
  duration?: number;
}

export function Toast({ id, message, type = "info", onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300); // Wait for transition
  };

  const icons = {
    success: <CheckCircle2 className="text-success" size={20} />,
    error: <XCircle className="text-danger" size={20} />,
    warning: <AlertCircle className="text-accent" size={20} />,
    info: <Info className="text-primary-light" size={20} />
  };

  return (
    <div
      className={cn(
        "flex w-full max-w-sm items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-lg transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="flex-1 text-sm font-medium text-foreground">{message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
