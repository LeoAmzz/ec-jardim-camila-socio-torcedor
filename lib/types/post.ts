import type { Profile } from "@/lib/types/profile";

export type PostVisibility = "public" | "exclusive";

export interface Post {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  visibility: PostVisibility;
  created_at: string;
  updated_at: string;
}

export interface PostWithAuthor extends Post {
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url" | "plan_type" | "email"> | null;
  likes_count: number;
  liked_by_me: boolean;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}
