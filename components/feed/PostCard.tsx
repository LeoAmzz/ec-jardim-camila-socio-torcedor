"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/lib/mock-data";
import type { PostWithAuthor } from "@/lib/types/post";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/shared/Badge";
import { ThumbsUp, ThumbsDown, MessageCircle, Lock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";

interface PostCardProps {
  post: Post | PostWithAuthor;
  onPostChanged?: () => Promise<void> | void;
}

export function PostCard({ post, onPostChanged }: PostCardProps) {
  const { user } = useAuth();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isRealPost = "visibility" in post;
  const canManagePost = isRealPost && user?.id === post.author_id;
  const isExclusive = isRealPost ? post.visibility === "exclusive" : post.isExclusive;
  const author = isRealPost
    ? {
        name: post.author?.full_name || post.author?.username || post.author?.email?.split("@")[0] || "Torcedor Camila",
        avatar: post.author?.avatar_url || undefined,
        plan: post.author?.plan_type || "torcedor",
      }
    : post.author;
  const content = post.content;
  const imageUrl = isRealPost ? post.image_url || undefined : post.imageUrl;
  const createdAt = isRealPost ? post.created_at : post.createdAt;
  const initialLikes = isRealPost ? post.likes_count : post.likes;
  const comments = isRealPost ? 0 : post.comments;
  const initialLikedByMe = isRealPost ? post.liked_by_me : post.isLikedByMe;
  const [likes, setLikes] = useState(initialLikes);
  const [isLikedByMe, setIsLikedByMe] = useState(initialLikedByMe);

  useEffect(() => {
    setLikes(initialLikes);
    setIsLikedByMe(initialLikedByMe);
  }, [initialLikedByMe, initialLikes, post.id]);

  async function handleSaveEdit() {
    const nextContent = draftContent.trim();

    if (!isRealPost || !user || isSaving) {
      return;
    }

    if (!nextContent) {
      setMessage("O post não pode ficar vazio.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("posts")
      .update({
        content: nextContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id)
      .eq("author_id", user.id);

    setIsSaving(false);

    if (error) {
      setMessage("Não foi possível salvar a edição. Tente novamente.");
      return;
    }

    setDraftContent(nextContent);
    setIsEditing(false);
    setIsActionsOpen(false);
    await onPostChanged?.();
  }

  async function handleDeletePost() {
    if (!isRealPost || !user || isDeleting) {
      return;
    }

    const confirmed = window.confirm("Excluir este post?");

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("author_id", user.id);

    setIsDeleting(false);

    if (error) {
      setMessage("Não foi possível excluir o post. Tente novamente.");
      return;
    }

    await onPostChanged?.();
  }

  function handleCancelEdit() {
    setDraftContent(content);
    setIsEditing(false);
    setMessage(null);
  }

  async function handleToggleLike() {
    if (!isRealPost || isLikeLoading) {
      return;
    }

    if (!user) {
      setMessage("Faça login para curtir posts.");
      return;
    }

    setIsLikeLoading(true);
    setMessage(null);

    const { error } = isLikedByMe
      ? await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id)
      : await supabase
          .from("post_likes")
          .insert({
            post_id: post.id,
            user_id: user.id,
          });

    setIsLikeLoading(false);

    if (error) {
      setMessage(
        error.code === "42P01"
          ? "A tabela de curtidas ainda não foi criada no Supabase."
          : "Não foi possível atualizar a curtida. Tente novamente."
      );
      return;
    }

    setIsLikedByMe((current) => !current);
    setLikes((current) => {
      if (isLikedByMe) {
        return Math.max(0, current - 1);
      }

      return current + 1;
    });
  }

  if (isExclusive) {
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
    switch(author.plan) {
      case 'campeao': return 'gradient';
      case 'camisa': return 'yellow';
      case 'torcedor': return 'blue';
      default: return 'gray';
    }
  })();

  const planLabel = (() => {
    switch(author.plan) {
      case 'campeao': return 'Campeão';
      case 'camisa': return 'Camisa';
      case 'torcedor': return 'Torcedor';
      default: return 'Gratuito';
    }
  })();

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 flex items-start gap-4">
        <Avatar src={author.avatar} name={author.name} className="w-10 h-10 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground text-sm">{author.name}</span>
              <Badge variant={planBadgeVariant} className="text-[10px] py-0">{planLabel}</Badge>
              <span className="text-muted-foreground text-xs">{formatRelativeTime(createdAt)}</span>
            </div>
            <div className="relative">
              {canManagePost && (
                <button
                  type="button"
                  onClick={() => setIsActionsOpen((value) => !value)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Ações do post"
                >
                  <MoreHorizontal size={18} />
                </button>
              )}
              {canManagePost && isActionsOpen && (
                <div className="absolute right-0 top-6 z-20 w-28 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftContent(content);
                      setMessage(null);
                      setIsEditing(true);
                      setIsActionsOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-sidebar"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-danger hover:bg-sidebar disabled:opacity-60"
                  >
                    {isDeleting ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="mt-3 space-y-3">
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                className="w-full min-h-[96px] resize-none rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-foreground text-sm mt-3 leading-relaxed whitespace-pre-wrap">{content}</p>
          )}
          {message && <p className="mt-3 text-xs font-semibold text-danger">{message}</p>}
        </div>
      </div>
      
      {imageUrl && (
        <div className="w-full">
          {/* Using img tag directly for dummy visual data rather than Next/Image to avoid configuration overhead */}
          <img src={imageUrl} alt="Conteúdo da publicação" className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      )}

      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={isLikeLoading}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
              isLikedByMe ? "text-primary-light" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ThumbsUp size={16} className={cn(isLikedByMe && "fill-current")} />
            <span>{likes}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ThumbsDown size={16} />
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle size={16} />
            <span>{comments}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
