"use client";

import { useEffect, useState } from "react";
import { CreatePost } from "@/components/feed/CreatePost";
import { PostCard } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/lib/supabase/client";
import type { PostWithAuthor } from "@/lib/types/post";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "ultimas" | "alta" | "exclusivo";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("ultimas");
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadPosts() {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
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
      .order("created_at", { ascending: false })
      .returns<PostWithAuthor[]>();

    setIsLoading(false);

    if (error) {
      setPosts([]);
      setErrorMessage(
        error.code === "42P01"
          ? "A tabela posts ainda não foi criada no Supabase. Aplique a migration de posts para começar."
          : "Não foi possível carregar o feed agora. Tente novamente em instantes."
      );
      return;
    }

    setPosts(data || []);
  }

  useEffect(() => {
    void loadPosts();
  }, []);

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

        {!isLoading && !errorMessage && posts.length === 0 && (
          <EmptyState
            title="Nenhum post ainda"
            description="Seja o primeiro a publicar uma mensagem para a torcida."
          />
        )}

        {!isLoading && !errorMessage && posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
