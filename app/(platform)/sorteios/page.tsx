"use client";

import { useState } from "react";
import { MOCK_RAFFLES } from "@/lib/mock-data";
import { Badge } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";
import { Users, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "abertos" | "encerrados";

export default function SorteiosPage() {
  const [activeTab, setActiveTab] = useState<Tab>("abertos");
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<typeof MOCK_RAFFLES[0] | null>(null);

  const abertos = MOCK_RAFFLES.filter(r => r.status === "open");
  const encerrados = MOCK_RAFFLES.filter(r => r.status === "closed");

  const displayList = activeTab === "abertos" ? abertos : encerrados;

  const handleVerGanhadores = (raffle: typeof MOCK_RAFFLES[0]) => {
    setSelectedRaffle(raffle);
    setWinnerModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 border-b border-border pb-1">
        <button 
          onClick={() => setActiveTab("abertos")}
          className={cn("text-sm font-bold pb-2 relative", activeTab === "abertos" ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          SORTEIOS ABERTOS
          {activeTab === "abertos" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
        </button>
        <button 
          onClick={() => setActiveTab("encerrados")}
          className={cn("text-sm font-bold pb-2 relative", activeTab === "encerrados" ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          SORTEIOS ENCERRADOS
          {activeTab === "encerrados" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayList.map((raffle) => (
          <div key={raffle.id} className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
            <img src={raffle.imageUrl} alt={raffle.title} className="w-full h-48 object-cover" />
            <div className="p-5 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-foreground leading-tight">{raffle.title}</h3>
                <Badge variant={raffle.status === 'open' ? 'green' : 'red'}>
                  {raffle.status === 'open' ? '● Aberto' : 'Encerrado'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{raffle.description}</p>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Calendar size={16} className="text-primary-light" />
                  <span>Sorteio: {new Date(raffle.drawDate).toLocaleDateString('pt-BR')}</span>
                </div>
                {raffle.status === 'open' && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Users size={16} className="text-primary-light" />
                    <span>{raffle.participantsCount} participantes</span>
                  </div>
                )}
              </div>

              {raffle.status === 'open' ? (
                raffle.amIParticipating ? (
                  <button className="w-full py-2.5 rounded-lg font-bold text-sm border-2 border-success text-success bg-success/10 hover:bg-success/20 transition-colors">
                    Você já participa
                  </button>
                ) : (
                  <button className="w-full py-2.5 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary-light transition-colors shadow-md">
                    Participar
                  </button>
                )
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button 
                    onClick={() => handleVerGanhadores(raffle)}
                    className="w-full py-2.5 rounded-lg font-bold text-xs bg-sidebar-accent hover:bg-border text-foreground transition-colors border border-border"
                  >
                    Ver ganhadores
                  </button>
                  <button className="w-full py-2.5 rounded-lg font-bold text-xs bg-background hover:bg-muted text-muted-foreground transition-colors border border-border">
                    Mais detalhes
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {displayList.length === 0 && (
          <div className="col-span-1 md:col-span-2 py-10 text-center text-muted-foreground">
            Nenhum sorteio encontrado nesta categoria.
          </div>
        )}
      </div>

      <Modal
        isOpen={winnerModalOpen}
        onClose={() => setWinnerModalOpen(false)}
        title="Ganhadores do Sorteio"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-primary-light border-b border-border pb-2">
            {selectedRaffle?.title}
          </p>
          <ul className="space-y-3">
            {selectedRaffle?.winners?.map((w, i) => (
              <li key={i} className="flex items-center justify-between bg-background p-3 rounded-lg border border-border">
                <span className="font-bold text-foreground">{w.name}</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 px-2 py-1 rounded-full">
                  <Trophy size={12} /> {w.prize}
                </span>
              </li>
            ))}
          </ul>
          <button 
            onClick={() => setWinnerModalOpen(false)}
            className="w-full mt-4 py-2 bg-sidebar-accent text-foreground hover:bg-border rounded-lg font-bold text-sm transition-colors"
          >
            Fechar
          </button>
        </div>
      </Modal>
    </div>
  );
}
