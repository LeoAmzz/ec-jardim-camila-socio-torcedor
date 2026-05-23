"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreatePost } from "@/components/feed/CreatePost";
import { PostCard } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import type { PostImage, PostWithAuthor } from "@/lib/types/post";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "ultimas" | "alta" | "exclusivo";

export default function HomePage() {
  const { user, profile, profileLoading } = useAuth();
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("ultimas");
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPosts = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }

    setErrorMessage(null);

    const canSeeExclusive = profile?.plan_type === "camisa" || profile?.plan_type === "campeao";
    const query = supabase
      .from("posts")
      .select(`
        id,
        author_id,
        content,
        image_url,
        visibility,
        created_at,
        updated_at,
        author:profiles (
          id,
          full_name,
          username,
          avatar_url,
          plan_type,
          email
        )
      `)
      .order("created_at", { ascending: false });

    // TODO: reforçar esta regra no RLS quando pagamentos e gestão de planos estiverem completos.
    if (!canSeeExclusive) {
      query.eq("visibility", "public");
    }

    const { data, error } = await query.returns<Omit<PostWithAuthor, "likes_count" | "liked_by_me" | "comments_count" | "images">[]>();

    if (error) {
      setPosts([]);
      if (!options?.silent) {
        setIsLoading(false);
      }

      setErrorMessage(
        error.code === "42P01"
          ? "A tabela posts ainda não foi criada no Supabase. Aplique a migration de posts para começar."
          : "Não foi possível carregar o feed agora. Tente novamente em instantes."
      );
      return;
    }

    const loadedPosts = data || [];
    const postIds = loadedPosts.map((post) => post.id);

    if (postIds.length === 0) {
      setPosts([]);
      if (!options?.silent) {
        setIsLoading(false);
      }

      return;
    }

    const { data: likesData, error: likesError } = await supabase
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", postIds);

    const likesByPost = new Map<string, number>();
    const likedPostIds = new Set<string>();

    if (!likesError) {
      likesData?.forEach((like) => {
        likesByPost.set(like.post_id, (likesByPost.get(like.post_id) || 0) + 1);

        if (user?.id && like.user_id === user.id) {
          likedPostIds.add(like.post_id);
        }
      });
    }

    const { data: commentsData } = await supabase
      .from("post_comments")
      .select("post_id")
      .in("post_id", postIds);

    const commentsByPost = new Map<string, number>();

    commentsData?.forEach((comment) => {
      commentsByPost.set(comment.post_id, (commentsByPost.get(comment.post_id) || 0) + 1);
    });

    const { data: imagesData } = await supabase
      .from("post_images")
      .select("id, post_id, author_id, image_url, storage_path, position, created_at")
      .in("post_id", postIds)
      .order("position", { ascending: true })
      .returns<PostImage[]>();

    const imagesByPost = new Map<string, PostImage[]>();

    imagesData?.forEach((image) => {
      const currentImages = imagesByPost.get(image.post_id) || [];
      imagesByPost.set(image.post_id, [...currentImages, image]);
    });

    setPosts(
      loadedPosts.map((post) => ({
        ...post,
        likes_count: likesByPost.get(post.id) || 0,
        liked_by_me: likedPostIds.has(post.id),
        comments_count: commentsByPost.get(post.id) || 0,
        images: imagesByPost.get(post.id) || [],
      }))
    );
    setIsLoading(false);
  }, [profile?.plan_type, user?.id]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    function scheduleFeedRefresh() {
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
      }

      realtimeRefreshTimeoutRef.current = setTimeout(() => {
        void loadPosts({ silent: true });
      }, 500);
    }

    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, scheduleFeedRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, scheduleFeedRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, scheduleFeedRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "post_images" }, scheduleFeedRefresh)
      .subscribe();

    return () => {
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
      }

      void supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  return (
    <div className="space-y-6">
      {/* Feed Tabs Component */}
      <div className="flex items-center gap-6 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("ultimas")}
          className={cn("text-sm font-bold pb-2 relative", activeTab === "ultimas" ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          ÚLTIMAS
          {activeTab === "ultimas" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
        </button>
        <button
          onClick={() => setActiveTab("alta")}
          className={cn("text-sm font-bold pb-2 relative", activeTab === "alta" ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          EM ALTA
          {activeTab === "alta" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
        </button>
        <button
          onClick={() => setActiveTab("exclusivo")}
          className={cn("text-sm font-bold pb-2 relative flex items-center gap-1.5", activeTab === "exclusivo" ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          EXCLUSIVO
          <Lock size={14} className={cn(activeTab === "exclusivo" ? "text-accent" : "text-muted-foreground")} />
          {activeTab === "exclusivo" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md" />}
        </button>
      </div>

      <CreatePost onPostCreated={loadPosts} />

      <div className="space-y-4">
        {isLoading && (
          <div className="bg-card rounded-lg border border-border p-6 text-sm font-semibold text-muted-foreground">
            Carregando feed...
          </div>
        )}

        {!isLoading && errorMessage && (
          <EmptyState
            title="Feed indisponível"
            description={errorMessage}
          />
        )}

        {!isLoading && !errorMessage && activeTab === "exclusivo" && !profileLoading && profile?.plan_type !== "camisa" && profile?.plan_type !== "campeao" && (
          <EmptyState
            title="Conteúdo exclusivo para sócios"
            description="Conteúdo exclusivo para sócios Camisa e Campeão."
          />
        )}

        {!isLoading && !errorMessage && !(activeTab === "exclusivo" && !profileLoading && profile?.plan_type !== "camisa" && profile?.plan_type !== "campeao") && posts.filter((post) => activeTab === "exclusivo" ? post.visibility === "exclusive" : true).length === 0 && (
          <EmptyState
            title={activeTab === "exclusivo" ? "Nenhum conteúdo exclusivo ainda" : "Nenhum post ainda"}
            description={activeTab === "exclusivo" ? "Os conteúdos exclusivos para sócios aparecerão aqui." : "Seja o primeiro a publicar uma mensagem para a torcida."}
          />
        )}

        {!isLoading && !errorMessage && !(activeTab === "exclusivo" && !profileLoading && profile?.plan_type !== "camisa" && profile?.plan_type !== "campeao") && posts
          .filter((post) => activeTab === "exclusivo" ? post.visibility === "exclusive" : true)
          .map((post) => (
          <PostCard key={post.id} post={post} onPostChanged={loadPosts} />
        ))}
      </div>
    </div>
  );
}
