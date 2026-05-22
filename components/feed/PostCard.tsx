import { Post } from "@/lib/mock-data";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/shared/Badge";
import { ThumbsUp, ThumbsDown, MessageCircle, Lock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  if (post.isExclusive) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 text-center relative overflow-hidden">
        <div className="flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 bg-accent text-bg-dark rounded-full flex items-center justify-center mb-4">
            <Lock size={24} />
          </div>
          <h4 className="text-foreground font-bold text-lg mb-2">Conteúdo Exclusivo</h4>
          <p className="text-muted-foreground text-sm mb-4">Este conteúdo está disponível apenas para assinantes do plano Camisa ou superior.</p>
          <Link href="/planos">
            <button className="bg-accent text-bg-dark font-bold text-sm px-6 py-2 rounded-lg hover:bg-accent-dark transition-colors">
              Ver Planos
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const formatRelativeTime = (_dateString: string) => {
    // simplified for visual purposes. You could use date-fns formatDistanceToNow
    return "há 2 horas";
  };

  const planBadgeVariant = (() => {
    switch(post.author.plan) {
      case 'campeao': return 'gradient';
      case 'camisa': return 'yellow';
      case 'torcedor': return 'blue';
      default: return 'gray';
    }
  })();

  const planLabel = (() => {
    switch(post.author.plan) {
      case 'campeao': return 'Campeão';
      case 'camisa': return 'Camisa';
      case 'torcedor': return 'Torcedor';
      default: return 'Gratuito';
    }
  })();

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 flex items-start gap-4">
        <Avatar src={post.author.avatar} name={post.author.name} className="w-10 h-10 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-sm">{post.author.name}</span>
              <Badge variant={planBadgeVariant} className="text-[10px] py-0">{planLabel}</Badge>
              <span className="text-muted-foreground text-xs">{formatRelativeTime(post.createdAt)}</span>
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <p className="text-foreground text-sm mt-3 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>
      </div>
      
      {post.imageUrl && (
        <div className="w-full">
          {/* Using img tag directly for dummy visual data rather than Next/Image to avoid configuration overhead */}
          <img src={post.imageUrl} alt="Conteúdo da publicação" className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      )}

      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className={cn("flex items-center gap-1.5 text-xs font-semibold transition-colors", post.isLikedByMe ? "text-primary-light" : "text-muted-foreground hover:text-foreground")}>
            <ThumbsUp size={16} className={cn(post.isLikedByMe && "fill-current")} />
            <span>{post.likes}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ThumbsDown size={16} />
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle size={16} />
            <span>{post.comments}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
