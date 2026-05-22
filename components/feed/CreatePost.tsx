"use client";

import { CURRENT_USER } from "@/lib/mock-data";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { ImagePlus } from "lucide-react";

export function CreatePost() {
  const { user, loading } = useAuth();
  const metadata = user?.user_metadata;
  const emailName = user?.email?.split("@")[0];
  const displayName =
    typeof metadata?.full_name === "string" && metadata.full_name.trim()
      ? metadata.full_name
      : emailName || CURRENT_USER.name;
  const avatarUrl =
    typeof metadata?.avatar_url === "string" && metadata.avatar_url.trim()
      ? metadata.avatar_url
      : user ? undefined : CURRENT_USER.avatar;

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex gap-3 items-start">
        <Avatar src={avatarUrl} name={loading ? CURRENT_USER.name : displayName} className="w-10 h-10 flex-shrink-0" />
        <div className="flex-1">
          <textarea 
            placeholder="No que você está pensando?"
            className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
          />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pl-[52px]">
        <button className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-background">
          <ImagePlus size={20} />
        </button>
        <button className="bg-primary hover:bg-primary-light text-white text-sm font-bold py-2 px-5 rounded-lg transition-colors">
          Publicar
        </button>
      </div>
    </div>
  );
}
