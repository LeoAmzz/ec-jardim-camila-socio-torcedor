"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/lib/mock-data";
import type { PostCommentWithAuthor, PostWithAuthor } from "@/lib/types/post";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/shared/Badge";
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, MessageCircle, Lock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [areCommentsOpen, setAreCommentsOpen] = useState(false);
  const [commentsList, setCommentsList] = useState<PostCommentWithAuthor[]>([]);
  const [areCommentsLoading, setAreCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentEditDraft, setCommentEditDraft] = useState("");
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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
  const images = isRealPost
    ? post.images.length > 0
      ? post.images.map((image) => image.image_url)
      : post.image_url
        ? [post.image_url]
        : []
    : post.imageUrl
      ? [post.imageUrl]
      : [];
  const activeImageUrl = images[activeImageIndex];
  const initialLikes = isRealPost ? post.likes_count : post.likes;
  const initialComments = isRealPost ? post.comments_count : post.comments;
  const initialLikedByMe = isRealPost ? post.liked_by_me : post.isLikedByMe;
  const [likes, setLikes] = useState(initialLikes);
  const [isLikedByMe, setIsLikedByMe] = useState(initialLikedByMe);
  const [commentsCount, setCommentsCount] = useState(initialComments);

  useEffect(() => {
    setLikes(initialLikes);
    setIsLikedByMe(initialLikedByMe);
    setCommentsCount(initialComments);
    setActiveImageIndex(0);
  }, [initialComments, initialLikedByMe, initialLikes, post.id]);

  function handlePreviousImage() {
    setActiveImageIndex((currentIndex) => (currentIndex === 0 ? images.length - 1 : currentIndex - 1));
  }

  function handleNextImage() {
    setActiveImageIndex((currentIndex) => (currentIndex === images.length - 1 ? 0 : currentIndex + 1));
  }

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

    if (isRealPost && post.images.length > 0) {
      await supabase.storage.from("post-images").remove(post.images.map((image) => image.storage_path));
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

  async function loadComments() {
    if (!isRealPost) {
      return;
    }

    setAreCommentsLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("post_comments")
      .select(`
        id,
        post_id,
        author_id,
        content,
        created_at,
        updated_at,
        author:profiles (
          id,
          full_name,
          username,
          avatar_url,
          email
        )
      `)
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .returns<PostCommentWithAuthor[]>();

    setAreCommentsLoading(false);

    if (error) {
      setMessage(
        error.code === "42P01"
          ? "A tabela de comentários ainda não foi criada no Supabase."
          : "Não foi possível carregar os comentários. Tente novamente."
      );
      return;
    }

    setCommentsList(data || []);
    setCommentsCount(data?.length || 0);
  }

  async function handleToggleComments() {
    if (!isRealPost) {
      return;
    }

    const nextOpenState = !areCommentsOpen;
    setAreCommentsOpen(nextOpenState);

    if (nextOpenState && commentsList.length === 0) {
      await loadComments();
    }
  }

  async function handleCreateComment() {
    const nextComment = commentDraft.trim();

    if (!isRealPost || isCommentSubmitting) {
      return;
    }

    if (!user) {
      setMessage("Faça login para comentar.");
      return;
    }

    if (!nextComment) {
      setMessage("O comentário não pode ficar vazio.");
      return;
    }

    setIsCommentSubmitting(true);
    setMessage(null);

    const { error } = await supabase
      .from("post_comments")
      .insert({
        post_id: post.id,
        author_id: user.id,
        content: nextComment,
      });

    setIsCommentSubmitting(false);

    if (error) {
      setMessage(
        error.code === "42P01"
          ? "A tabela de comentários ainda não foi criada no Supabase."
          : "Não foi possível publicar o comentário. Tente novamente."
      );
      return;
    }

    setCommentDraft("");
    await loadComments();
  }

  function handleStartEditComment(comment: PostCommentWithAuthor) {
    setEditingCommentId(comment.id);
    setCommentEditDraft(comment.content);
    setMessage(null);
  }

  function handleCancelEditComment() {
    setEditingCommentId(null);
    setCommentEditDraft("");
    setMessage(null);
  }

  async function handleSaveComment(comment: PostCommentWithAuthor) {
    const nextComment = commentEditDraft.trim();

    if (!user || savingCommentId) {
      return;
    }

    if (!nextComment) {
      setMessage("O comentário não pode ficar vazio.");
      return;
    }

    setSavingCommentId(comment.id);
    setMessage(null);

    const { error } = await supabase
      .from("post_comments")
      .update({
        content: nextComment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", comment.id)
      .eq("author_id", user.id);

    setSavingCommentId(null);

    if (error) {
      setMessage("Não foi possível salvar o comentário. Tente novamente.");
      return;
    }

    setCommentsList((currentComments) =>
      currentComments.map((currentComment) =>
        currentComment.id === comment.id
          ? {
              ...currentComment,
              content: nextComment,
              updated_at: new Date().toISOString(),
            }
          : currentComment
      )
    );
    handleCancelEditComment();
  }

  async function handleDeleteComment(comment: PostCommentWithAuthor) {
    if (!user || deletingCommentId) {
      return;
    }

    const confirmed = window.confirm("Excluir este comentário?");

    if (!confirmed) {
      return;
    }

    setDeletingCommentId(comment.id);
    setMessage(null);

    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", comment.id)
      .eq("author_id", user.id);

    setDeletingCommentId(null);

    if (error) {
      setMessage("Não foi possível excluir o comentário. Tente novamente.");
      return;
    }

    setCommentsList((currentComments) => currentComments.filter((currentComment) => currentComment.id !== comment.id));
    setCommentsCount((currentCount) => Math.max(0, currentCount - 1));

    if (editingCommentId === comment.id) {
      handleCancelEditComment();
    }
  }

  const formatRelativeTime = () => {
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
              {isExclusive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bg-dark">
                  <Lock size={10} />
                  Exclusivo
                </span>
              )}
              <span className="text-muted-foreground text-xs">{formatRelativeTime()}</span>
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
      
      {activeImageUrl && (
        <div className="relative w-full bg-background">
          {/* Using img tag directly for dummy visual data rather than Next/Image to avoid configuration overhead */}
          <img src={activeImageUrl} alt="Conteúdo da publicação" className="w-full h-auto object-cover max-h-[500px]" />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePreviousImage}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-bg-dark/75 text-white transition-colors hover:bg-bg-dark"
                aria-label="Imagem anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-bg-dark/75 text-white transition-colors hover:bg-bg-dark"
                aria-label="Próxima imagem"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute right-3 top-3 rounded-full bg-bg-dark/75 px-3 py-1 text-xs font-bold text-white">
                {activeImageIndex + 1}/{images.length}
              </div>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      activeImageIndex === index ? "bg-white" : "bg-white/45"
                    )}
                    aria-label={`Ir para imagem ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
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
          <button
            type="button"
            onClick={handleToggleComments}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold transition-colors",
              areCommentsOpen ? "text-primary-light" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageCircle size={16} />
            <span>{commentsCount}</span>
          </button>
        </div>
      </div>
      {areCommentsOpen && (
        <div className="border-t border-border px-4 py-4">
          {areCommentsLoading ? (
            <p className="text-xs font-semibold text-muted-foreground">Carregando comentários...</p>
          ) : commentsList.length === 0 ? (
            <p className="text-xs font-semibold text-muted-foreground">Nenhum comentário ainda. Seja o primeiro a comentar.</p>
          ) : (
            <div className="space-y-3">
              {commentsList.map((comment) => {
                const commentAuthorName =
                  comment.author?.full_name ||
                  comment.author?.username ||
                  comment.author?.email?.split("@")[0] ||
                  "Torcedor Camila";
                const canManageComment = user?.id === comment.author_id;
                const isEditingComment = editingCommentId === comment.id;
                const isSavingComment = savingCommentId === comment.id;
                const isDeletingComment = deletingCommentId === comment.id;

                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar src={comment.author?.avatar_url || undefined} name={commentAuthorName} className="h-8 w-8 flex-shrink-0" />
                    <div className="min-w-0 flex-1 rounded-lg bg-sidebar px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-bold text-foreground">{commentAuthorName}</p>
                        {canManageComment && !isEditingComment && (
                          <div className="flex items-center gap-2 text-[11px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleStartEditComment(comment)}
                              className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment)}
                              disabled={isDeletingComment}
                              className="text-danger transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isDeletingComment ? "Excluindo..." : "Excluir"}
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditingComment ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={commentEditDraft}
                            onChange={(event) => setCommentEditDraft(event.target.value)}
                            className="w-full min-h-[72px] resize-none rounded-lg border border-border bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveComment(comment)}
                              disabled={isSavingComment}
                              className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isSavingComment ? "Salvando..." : "Salvar"}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditComment}
                              disabled={isSavingComment}
                              className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{comment.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Escreva um comentário..."
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleCreateComment}
              disabled={isCommentSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCommentSubmitting ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
