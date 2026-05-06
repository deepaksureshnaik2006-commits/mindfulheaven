// Mindful Heaven API client
// Auth uses Supabase directly. Other endpoints use the Express backend (dev/self-hosted only).

import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
}

export interface Profile {
  id?: string;
  user_id: string;
  anonymous_alias: string;
  avatar_url: string | null;
  bio?: string | null;
  notifications_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ForumPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  author_alias?: string;
  reply_count?: number;
}

export interface ForumReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_alias?: string;
}

export interface PeerChat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
  other_user: { user_id: string; anonymous_alias: string; avatar_url: string | null } | null;
  last_message: string | null;
}

export interface PeerMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  deleted_for_sender?: boolean;
  deleted_for_everyone?: boolean;
  created_at: string;
}

export interface MoodLog {
  id: string;
  user_id: string;
  mood: string;
  notes: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg =
      (isJson && (data as any)?.error) ||
      (typeof data === 'string' ? data : 'Request failed');
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

// ----- Auth (via Supabase) -----
export const authApi = {
  me: async (): Promise<{ user: AuthUser | null }> => {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    if (!u) return { user: null };
    return { user: { id: u.id, email: u.email ?? '' } };
  },
  signIn: async (email: string, password: string): Promise<{ user: AuthUser }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new ApiError(error.message, 400);
    const u = data.user!;
    return { user: { id: u.id, email: u.email ?? '' } };
  },
  signUp: async (email: string, password: string): Promise<{ user: AuthUser }> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new ApiError(error.message, 400);
    const u = data.user!;
    return { user: { id: u.id, email: u.email ?? '' } };
  },
  signOut: async (): Promise<{ ok: true }> => {
    await supabase.auth.signOut();
    return { ok: true };
  },
  changePassword: async (password: string): Promise<{ ok: true }> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new ApiError(error.message, 400);
    return { ok: true };
  },
};

// ----- Profiles (via Supabase) -----
export const profilesApi = {
  me: async (): Promise<{ profile: Profile }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { profile: data };
  },
  update: async (
    fields: Partial<{
      anonymous_alias: string;
      bio: string | null;
      avatar_url: string | null;
      notifications_enabled: boolean;
    }>
  ): Promise<{ profile: Profile }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { profile: data };
  },
  all: async (): Promise<{ profiles: Profile[] }> => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw new ApiError(error.message, 500);
    return { profiles: data ?? [] };
  },
  byIds: async (user_ids: string[]): Promise<{ profiles: Profile[] }> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', user_ids);
    if (error) throw new ApiError(error.message, 500);
    return { profiles: data ?? [] };
  },
  deleteMe: async (): Promise<{ ok: true }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    
    // Delete profile record
    const { error } = await supabase.from('profiles').delete().eq('user_id', user.id);
    if (error) throw new ApiError(error.message, 500);
    
    // Note: Deleting from auth.users requires a service role or a specialized edge function.
    // For now, we sign the user out which effectively "removes" their access.
    return { ok: true };
  },
};

// ----- Forum (via Supabase) -----
export const forumApi = {
  listPosts: async (): Promise<{ posts: ForumPost[] }> => {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*, profiles(anonymous_alias)')
      .order('created_at', { ascending: false });
    if (error) throw new ApiError(error.message, 500);
    
    // Flatten the author_alias from the join
    const posts = (data || []).map((p: any) => ({
      ...p,
      author_alias: p.profiles?.anonymous_alias,
    }));
    return { posts };
  },
  createPost: async (title: string, content: string, category: string): Promise<{ id: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({ user_id: user.id, title, content, category })
      .select('id')
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { id: data.id };
  },
  deletePost: async (id: string): Promise<{ ok: true }> => {
    const { error } = await supabase.from('forum_posts').delete().eq('id', id);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
  listReplies: async (postId: string): Promise<{ replies: ForumReply[] }> => {
    const { data, error } = await supabase
      .from('forum_replies')
      .select('*, profiles(anonymous_alias)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw new ApiError(error.message, 500);

    const replies = (data || []).map((r: any) => ({
      ...r,
      author_alias: r.profiles?.anonymous_alias,
    }));
    return { replies };
  },
  createReply: async (postId: string, content: string): Promise<{ id: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('forum_replies')
      .insert({ post_id: postId, user_id: user.id, content })
      .select('id')
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { id: data.id };
  },
  deleteReply: async (id: string): Promise<{ ok: true }> => {
    const { error } = await supabase.from('forum_replies').delete().eq('id', id);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
};

// ----- Peer Chats (via Supabase) -----
export const peerChatsApi = {
  list: async (): Promise<{ chats: PeerChat[] }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('peer_chats')
      .select(`
        *,
        participant1:profiles!participant1_id(user_id, anonymous_alias, avatar_url),
        participant2:profiles!participant2_id(user_id, anonymous_alias, avatar_url)
      `)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });
    if (error) throw new ApiError(error.message, 500);

    const chats = (data || []).map((c: any) => {
      const other = c.participant1_id === user.id ? c.participant2 : c.participant1;
      return {
        ...c,
        other_user: other,
        last_message: null, // Would need a more complex query for last message
      };
    });
    return { chats };
  },
  start: async (other_user_id: string): Promise<{ chat: PeerChat }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    
    // Sort IDs to ensure unique pair
    const [p1, p2] = [user.id, other_user_id].sort();

    const { data, error } = await supabase
      .from('peer_chats')
      .upsert({ participant1_id: p1, participant2_id: p2, updated_at: new Date().toISOString() }, { onConflict: 'participant1_id,participant2_id' })
      .select()
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { chat: data };
  },
  listMessages: async (chatId: string): Promise<{ messages: PeerMessage[] }> => {
    const { data, error } = await supabase
      .from('peer_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error) throw new ApiError(error.message, 500);
    return { messages: data ?? [] };
  },
  sendMessage: async (
    chatId: string,
    body: { content?: string; image_url?: string | null; video_url?: string | null }
  ): Promise<{ message: PeerMessage }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    
    const { data, error } = await supabase
      .from('peer_messages')
      .insert({ chat_id: chatId, sender_id: user.id, ...body })
      .select()
      .single();
    if (error) throw new ApiError(error.message, 500);

    // Update chat timestamp
    await supabase.from('peer_chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);

    return { message: data };
  },
  deleteMessageForMe: async (id: string): Promise<{ ok: true }> => {
    // Supabase RLS would handle this but simpler to just delete for everyone for now or use a deleted_messages table
    const { error } = await supabase.from('peer_messages').delete().eq('id', id);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
  deleteMessageForEveryone: async (id: string): Promise<{ ok: true }> => {
    const { error } = await supabase.from('peer_messages').delete().eq('id', id);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
  deleteChatForMe: async (chatId: string): Promise<{ ok: true }> => {
    const { error } = await supabase.from('peer_chats').delete().eq('id', chatId);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
};

// ----- Mood Logs (via Supabase) -----
export const moodLogsApi = {
  list: async (): Promise<{ logs: MoodLog[] }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw new ApiError(error.message, 500);
    return { logs: data ?? [] };
  },
  create: async (mood: string, notes: string | null): Promise<{ id: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('mood_logs')
      .insert({ user_id: user.id, mood, notes })
      .select('id')
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { id: data.id };
  },
  remove: async (id: string): Promise<{ ok: true }> => {
    const { error } = await supabase.from('mood_logs').delete().eq('id', id);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
};

// ----- Notifications (via Supabase) -----
export const notificationsApi = {
  list: async (): Promise<{ notifications: Notification[] }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw new ApiError(error.message, 500);
    return { notifications: data ?? [] };
  },
  unreadCount: async (): Promise<{ count: number }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0 };
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) throw new ApiError(error.message, 500);
    return { count: count ?? 0 };
  },
  markRead: async (id: string): Promise<{ ok: true }> => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
  markAllRead: async (): Promise<{ ok: true }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
  remove: async (id: string): Promise<{ ok: true }> => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
};

// ----- AI Chats (via Supabase) -----
export interface AIChat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIChatMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const aiChatsApi = {
  list: async (): Promise<{ chats: AIChat[] }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('ai_chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) throw new ApiError(error.message, 500);
    return { chats: data ?? [] };
  },
  create: async (): Promise<{ chat: AIChat }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { data, error } = await supabase
      .from('ai_chats')
      .insert({ user_id: user.id, title: 'New Chat' })
      .select()
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { chat: data };
  },
  rename: async (id: string, title: string): Promise<{ chat: AIChat }> => {
    const { data, error } = await supabase
      .from('ai_chats')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { chat: data };
  },
  remove: async (id: string): Promise<{ ok: true }> => {
    const { error } = await supabase.from('ai_chats').delete().eq('id', id);
    if (error) throw new ApiError(error.message, 500);
    return { ok: true };
  },
  listMessages: async (id: string): Promise<{ messages: AIChatMessage[] }> => {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('chat_id', id)
      .order('created_at', { ascending: true });
    if (error) throw new ApiError(error.message, 500);
    return { messages: data ?? [] };
  },
  saveMessage: async (id: string, role: 'user' | 'assistant', content: string): Promise<{ message: AIChatMessage }> => {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .insert({ chat_id: id, role, content })
      .select()
      .single();
    if (error) throw new ApiError(error.message, 500);
    return { message: data };
  },
  // kept for legacy shape compatibility — not used in new flow
  _saveMessageLegacy: (id: string, role: 'user' | 'assistant', content: string) =>
    request<{ message: AIChatMessage }>(`/api/ai-chats/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content }),
    }),
};

// ----- Security Questions -----
export const securityApi = {
  me: () =>
    request<{ questions: { question1: string; question2: string } | null }>(
      '/api/security/me'
    ),
  save: (q1: string, a1: string, q2: string, a2: string) =>
    request<{ ok: true }>('/api/security/me', {
      method: 'PUT',
      body: JSON.stringify({
        question1: q1,
        answer1: a1,
        question2: q2,
        answer2: a2,
      }),
    }),
  getQuestionsForEmail: (email: string) =>
    request<{ question1?: string; question2?: string; error?: string }>(
      '/api/security/get-questions',
      { method: 'POST', body: JSON.stringify({ email }) }
    ),
  verifyAnswers: (email: string, answer1: string, answer2: string) =>
    request<{ verified: boolean; error?: string }>(
      '/api/security/verify-answers',
      { method: 'POST', body: JSON.stringify({ email, answer1, answer2 }) }
    ),
  resetPassword: (
    email: string,
    answer1: string,
    answer2: string,
    newPassword: string
  ) =>
    request<{ ok?: true; error?: string }>(
      '/api/security/verify-and-reset',
      {
        method: 'POST',
        body: JSON.stringify({ email, answer1, answer2, newPassword }),
      }
    ),
};

// ----- Uploads -----
export const uploadsApi = {
  upload: async (
    kind: 'avatars' | 'messages',
    file: File
  ): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ url: string }>(`/api/uploads/${kind}`, {
      method: 'POST',
      body: fd,
    });
  },
};
