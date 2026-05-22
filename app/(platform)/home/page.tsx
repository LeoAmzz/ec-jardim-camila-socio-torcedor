"use client";

import { useState } from "react";
import { MOCK_POSTS } from "@/lib/mock-data";
import { CreatePost } from "@/components/feed/CreatePost";
import { PostCard } from "@/components/feed/PostCard";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "ultimas" | "alta" | "exclusivo";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("ultimas");

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

      <CreatePost />

      <div className="space-y-4">
        {MOCK_POSTS.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
