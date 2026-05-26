import type { BolaoRankingRow } from "@/lib/types/bolao";
import { RankingAvatar, getPlanLabel } from "./TopRankingCard";
import { Badge } from "@/components/shared/Badge";

interface RankingTableProps {
  rows: BolaoRankingRow[];
}

export function RankingTable({ rows }: RankingTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-lg">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/30 text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-12 px-4 py-4 text-center">Pos</th>
            <th className="px-4 py-4">Usuário</th>
            <th className="hidden px-4 py-4 text-center md:table-cell">Plano</th>
            <th className="hidden px-4 py-4 text-center md:table-cell">V/E</th>
            <th className="hidden px-4 py-4 text-center md:table-cell">Exato</th>
            <th className="px-4 py-4 text-right">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.user_id} className="transition-colors hover:bg-muted/10">
              <td className="px-4 py-3 text-center text-base font-black text-muted-foreground">
                {row.position}
              </td>
              <td className="px-4 py-3 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <RankingAvatar row={row} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">{row.full_name || row.username || "Torcedor"}</p>
                    {row.username && <p className="truncate text-xs text-muted-foreground">@{row.username}</p>}
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-center md:table-cell">
                <Badge variant={row.plan_type === "torcedor" ? "gray" : "yellow"}>{getPlanLabel(row.plan_type)}</Badge>
              </td>
              <td className="hidden px-4 py-3 text-center text-sm font-semibold text-muted-foreground md:table-cell">
                {row.winner_hits}
              </td>
              <td className="hidden px-4 py-3 text-center text-sm font-semibold text-muted-foreground md:table-cell">
                {row.exact_score_hits}
              </td>
              <td className="px-4 py-3 text-right text-xl font-black text-primary">
                {row.points_total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
