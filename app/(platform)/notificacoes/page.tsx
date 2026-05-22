"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Bell } from "lucide-react";

export default function NotificacoesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
      <EmptyState 
        title="Você não tem notificações novas" 
        description="Quando houver alguma atualização no clube, sorteios ou interações nos seus posts, avisaremos aqui."
        icon={<Bell size={32} />}
      />
    </div>
  );
}
