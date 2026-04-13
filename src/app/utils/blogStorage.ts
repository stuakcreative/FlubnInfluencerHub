import { BLOG_POSTS } from "../data/mock-data";
import * as api from "./api";

const STORAGE_KEY = "flubn_blog_posts";

export type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;       // Full article body (markdown-lite)
  image: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  featured: boolean;
};

/** Seed mock-data entries with an empty content field so the type is consistent */
function seed(): BlogPost[] {
  return BLOG_POSTS.map((p) => ({
    content: "",
    ...p,
  })) as BlogPost[];
}

export function getBlogPosts(): BlogPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BlogPost[];
  } catch {}
  const seeded = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

export function saveBlogPosts(posts: BlogPost[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  // Sync to backend
  api.saveAllBlogPosts(posts).catch((err) => {
    if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && !err.message?.includes("Load failed")) {
      console.error("Blog posts sync error:", err.message);
    }
  });
}

export function createBlogPost(data: Omit<BlogPost, "id">): BlogPost[] {
  const posts = getBlogPosts();
  const newPost: BlogPost = { id: String(Date.now()), ...data };
  const updated = [newPost, ...posts];
  saveBlogPosts(updated);
  return updated;
}

export function updateBlogPost(id: string, data: Partial<Omit<BlogPost, "id">>): BlogPost[] {
  const posts = getBlogPosts();
  const updated = posts.map((p) => (p.id === id ? { ...p, ...data } : p));
  saveBlogPosts(updated);
  return updated;
}

export function deleteBlogPost(id: string): BlogPost[] {
  const posts = getBlogPosts();
  const updated = posts.filter((p) => p.id !== id);
  saveBlogPosts(updated);
  return updated;
}

export function resetBlogPosts(): BlogPost[] {
  const seeded = seed();
  saveBlogPosts(seeded);
  return seeded;
}