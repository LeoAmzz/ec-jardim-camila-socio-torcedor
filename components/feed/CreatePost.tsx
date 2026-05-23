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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
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
  const maxImages = 5;

  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviewUrls([]);
      return;
    }

    const previewUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(previewUrls);

    return () => {
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [imageFiles]);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    if (imageFiles.length + selectedFiles.length > maxImages) {
      setMessageType("error");
      setMessage("Você pode adicionar no máximo 5 imagens por post.");
      event.target.value = "";
      return;
    }

    const invalidTypeFile = selectedFiles.find((file) => !allowedImageTypes.includes(file.type));

    if (invalidTypeFile) {
      setMessageType("error");
      setMessage("Use uma imagem JPG, PNG ou WebP.");
      event.target.value = "";
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > maxImageSize);

    if (oversizedFile) {
      setMessageType("error");
      setMessage("A imagem deve ter no máximo 5MB.");
      event.target.value = "";
      return;
    }

    setImageFiles((currentFiles) => [...currentFiles, ...selectedFiles].slice(0, maxImages));
    setMessage(null);
    event.target.value = "";
  }

  function handleRemoveImage(index: number) {
    setImageFiles((currentFiles) => currentFiles.filter((_, currentIndex) => currentIndex !== index));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveAllImages() {
    setImageFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadPostImage(file: File, postId: string, position: number) {
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
    const path = `${user.id}/${postId}/${Date.now()}-${position}-${safeName}.${extension}`;

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

    const { data: createdPost, error } = await supabase.from("posts").insert({
      author_id: user.id,
      content: trimmedContent,
      image_url: null,
      visibility: "public",
    }).select("id").single();

    if (error) {
      setIsPosting(false);
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

    const uploadedImages: Array<{ image_url: string; storage_path: string; position: number }> = [];

    if (createdPost && imageFiles.length > 0) {
      for (let position = 0; position < imageFiles.length; position += 1) {
        const file = imageFiles[position];
        const uploadResult = await uploadPostImage(file, createdPost.id, position);

        if (uploadResult.errorMessage || !uploadResult.publicUrl || !uploadResult.path) {
          if (uploadedImages.length > 0) {
            await supabase.storage.from("post-images").remove(uploadedImages.map((image) => image.storage_path));
          }

          await supabase.from("posts").delete().eq("id", createdPost.id).eq("author_id", user.id);
          setIsPosting(false);
          setMessageType("error");
          setMessage(uploadResult.errorMessage || "Não foi possível enviar uma das imagens.");
          return;
        }

        uploadedImages.push({
          image_url: uploadResult.publicUrl,
          storage_path: uploadResult.path,
          position,
        });
      }

      const { error: imagesError } = await supabase.from("post_images").insert(
        uploadedImages.map((image) => ({
          post_id: createdPost.id,
          author_id: user.id,
          image_url: image.image_url,
          storage_path: image.storage_path,
          position: image.position,
        }))
      );

      if (imagesError) {
        await supabase.storage.from("post-images").remove(uploadedImages.map((image) => image.storage_path));
        await supabase.from("posts").delete().eq("id", createdPost.id).eq("author_id", user.id);
        setIsPosting(false);
        setMessageType("error");
        setMessage(
          imagesError.code === "42P01"
            ? "A tabela post_images ainda não foi criada no Supabase."
            : "Não foi possível salvar as imagens do post."
        );
        return;
      }

      await supabase
        .from("posts")
        .update({ image_url: uploadedImages[0]?.image_url || null })
        .eq("id", createdPost.id)
        .eq("author_id", user.id);
    }

    setIsPosting(false);
    setContent("");
    handleRemoveAllImages();
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
      {imagePreviewUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 pl-[52px] sm:grid-cols-3">
          {imagePreviewUrls.map((previewUrl, index) => (
            <div key={previewUrl} className="relative overflow-hidden rounded-lg border border-border bg-background">
              <img src={previewUrl} alt={`Prévia da imagem ${index + 1}`} className="h-32 w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-md bg-bg-dark/80 px-2 py-1 text-[11px] font-bold text-white">
                {index + 1}/{imagePreviewUrls.length}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                disabled={isPosting}
                className="absolute right-2 top-2 rounded-md bg-bg-dark/80 px-2 py-1 text-xs font-bold text-white transition-colors hover:bg-bg-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pl-[52px]">
        <input
          ref={fileInputRef}
          type="file"
          multiple
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
