"use client";

import { useEffect, useRef, useState } from "react";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
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
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxImageSize = 5 * 1024 * 1024;

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      setMessageType("error");
      setMessage("Use uma imagem JPG, PNG ou WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > maxImageSize) {
      setMessageType("error");
      setMessage("A imagem deve ter no máximo 5MB.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setMessage(null);
  }

  function handleRemoveImage() {
    setImageFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadPostImage(file: File) {
    if (!user) {
      return { publicUrl: null, path: null, errorMessage: "Você precisa estar logado para enviar imagem." };
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "imagem";
    const path = `${user.id}/${Date.now()}-${safeName}.${extension}`;

    const { error } = await supabase.storage
      .from("post-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      return {
        publicUrl: null,
        path: null,
        errorMessage:
          error.message.includes("Bucket not found")
            ? "O bucket post-images ainda não foi criado no Supabase."
            : "Não foi possível enviar a imagem. Tente novamente.",
      };
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);

    return { publicUrl: data.publicUrl, path, errorMessage: null };
  }

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

    let imageUrl: string | null = null;
    let uploadedImagePath: string | null = null;

    if (imageFile) {
      const uploadResult = await uploadPostImage(imageFile);

      if (uploadResult.errorMessage) {
        setIsPosting(false);
        setMessageType("error");
        setMessage(uploadResult.errorMessage);
        return;
      }

      imageUrl = uploadResult.publicUrl;
      uploadedImagePath = uploadResult.path;
    }

    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      content: trimmedContent,
      image_url: imageUrl,
      visibility: "public",
    });

    setIsPosting(false);

    if (error) {
      if (uploadedImagePath) {
        await supabase.storage.from("post-images").remove([uploadedImagePath]);
      }

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
    handleRemoveImage();
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
      {imagePreviewUrl && (
        <div className="mt-3 pl-[52px]">
          <div className="relative inline-block overflow-hidden rounded-lg border border-border bg-background">
            <img src={imagePreviewUrl} alt="Prévia da imagem selecionada" className="max-h-48 max-w-full object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={isPosting}
              className="absolute right-2 top-2 rounded-md bg-bg-dark/80 px-2 py-1 text-xs font-bold text-white transition-colors hover:bg-bg-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              Remover
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pl-[52px]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPosting || loading || !user}
          className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-background disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="Adicionar imagem ao post"
        >
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
