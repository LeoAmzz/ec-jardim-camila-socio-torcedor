"use client";

import { useState } from "react";
import { CURRENT_USER } from "@/lib/mock-data";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { ImagePlus } from "lucide-react";

interface CreatePostProps {
  onPostCreated?: () => Promise<void> | void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user, profile, loading } = useAuth();
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const metadata = user?.user_metadata;
  const emailName = profile?.email?.split("@")[0] || user?.email?.split("@")[0];
  const displayName =
    profile?.full_name ||
    (typeof metadata?.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name
      : emailName || CURRENT_USER.name);
  const avatarUrl =
    profile?.avatar_url ||
    (typeof metadata?.avatar_url === "string" && metadata.avatar_url.trim()
      ? metadata.avatar_url
      : user ? undefined : CURRENT_USER.avatar);

  async function handleCreatePost() {
    const trimmedContent = content.trim();

    if (isPosting || loading) {
      return;
    }

    if (!user) {
      setMessageType("error");
      setMessage("Você precisa estar logado para publicar.");
      return;
    }

    if (!trimmedContent) {
      setMessageType("error");
      setMessage("Escreva algo antes de publicar.");
      return;
    }

    setIsPosting(true);
    setMessage(null);

    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      content: trimmedContent,
      visibility: "public",
    });

    setIsPosting(false);

    if (error) {
      setMessageType("error");

      if (error.code === "42P01") {
        setMessage("A tabela posts ainda não foi criada no Supabase.");
        return;
      }

      if (error.code === "23503") {
        setMessage("Seu profile ainda não foi encontrado. Recarregue a página e tente novamente.");
        return;
      }

      setMessage("Não foi possível publicar agora. Tente novamente em instantes.");
      return;
    }

    setContent("");
    setMessageType("success");
    setMessage("Post publicado com sucesso.");
    await onPostCreated?.();
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex gap-3 items-start">
        <Avatar src={avatarUrl} name={loading ? CURRENT_USER.name : displayName} className="w-10 h-10 flex-shrink-0" />
        <div className="flex-1">
          <textarea 
            placeholder="No que você está pensando?"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
          />
        </div>
      </div>
      {message && (
        <p className={`mt-3 pl-[52px] text-xs font-semibold ${messageType === "success" ? "text-success" : "text-danger"}`}>
          {message}
        </p>
      )}
      <div className="flex items-center justify-between mt-3 pl-[52px]">
        <button className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-background">
          <ImagePlus size={20} />
        </button>
        <button
          type="button"
          onClick={handleCreatePost}
          disabled={isPosting || loading || !user}
          className="bg-primary hover:bg-primary-light disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-bold py-2 px-5 rounded-lg transition-colors"
        >
          {isPosting ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </div>
  );
}
