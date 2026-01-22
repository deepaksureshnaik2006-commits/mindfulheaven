import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  Search,
  User,
  MessageCircle,
  Plus,
  Trash2,
  Image,
  X,
  MoreVertical,
  Video,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Profile {
  user_id: string;
  anonymous_alias: string;
  avatar_url: string | null;
}

interface Chat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  other_user?: Profile;
  last_message?: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  image_url?: string | null;
  video_url?: string | null;
  created_at: string;
  deleted_for_sender?: boolean;
  deleted_for_everyone?: boolean;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [deletedChatIds, setDeletedChatIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDeletedConversations();
    fetchChats();
    fetchAllProfiles();
  }, [user, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allProfiles.filter(profile => 
        profile.anonymous_alias.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, allProfiles]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDeletedConversations = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('deleted_conversations')
      .select('chat_id')
      .eq('user_id', user.id);

    if (data) {
      setDeletedChatIds(data.map(d => d.chat_id));
    }
  };

  const fetchAllProfiles = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, anonymous_alias, avatar_url')
      .neq('user_id', user.id)
      .order('anonymous_alias');

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setAllProfiles(data || []);
    }
  };

  const fetchChats = async () => {
    if (!user) return;

    // Get deleted conversation IDs first
    const { data: deletedData } = await supabase
      .from('deleted_conversations')
      .select('chat_id')
      .eq('user_id', user.id);

    const deletedIds = deletedData?.map(d => d.chat_id) || [];

    const { data: chatsData, error } = await supabase
      .from('peer_chats')
      .select('*')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chats:', error);
      setLoading(false);
      return;
    }

    // Filter out deleted conversations
    const filteredChats = chatsData?.filter(chat => !deletedIds.includes(chat.id)) || [];

    // Get other participants' profiles
    const otherUserIds = filteredChats.map(c => 
      c.participant1_id === user.id ? c.participant2_id : c.participant1_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, anonymous_alias, avatar_url')
      .in('user_id', otherUserIds);

    const profileMap: Record<string, Profile> = {};
    profiles?.forEach(p => {
      profileMap[p.user_id] = p;
    });

    // Get last messages
    const { data: lastMessages } = await supabase
      .from('peer_messages')
      .select('chat_id, content, image_url, video_url')
      .in('chat_id', filteredChats.map(c => c.id))
      .order('created_at', { ascending: false });

    const lastMessageMap: Record<string, string> = {};
    lastMessages?.forEach(m => {
      if (!lastMessageMap[m.chat_id]) {
        if (m.video_url) {
          lastMessageMap[m.chat_id] = '🎥 Video';
        } else if (m.image_url) {
          lastMessageMap[m.chat_id] = '📷 Image';
        } else {
          lastMessageMap[m.chat_id] = m.content;
        }
      }
    });

    const chatsWithUsers = filteredChats.map(chat => ({
      ...chat,
      other_user: profileMap[chat.participant1_id === user.id ? chat.participant2_id : chat.participant1_id],
      last_message: lastMessageMap[chat.id],
    }));

    setChats(chatsWithUsers);
    setLoading(false);
  };

  const fetchMessages = async (chatId: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('peer_messages')
      .select('*')
      .eq('chat_id', chatId)
      .eq('deleted_for_everyone', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      const filteredMessages = (data || []).filter(msg => {
        if (msg.sender_id === user.id && msg.deleted_for_sender) {
          return false;
        }
        return true;
      });
      setMessages(filteredMessages);
    }
  };

  const deleteMessageForMe = async (messageId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('peer_messages')
      .update({ deleted_for_sender: true })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast({
        title: 'Message deleted',
        description: 'Message removed from your view',
      });
    }
  };

  const deleteMessageForEveryone = async (messageId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('peer_messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast({
        title: 'Message deleted',
        description: 'Message deleted for everyone',
      });
    }
  };

  const startChatWithUser = async (otherUserId: string) => {
    if (!user) return;

    // Check if chat already exists (and not deleted)
    const existingChat = chats.find(c => 
      c.participant1_id === otherUserId || c.participant2_id === otherUserId
    );

    if (existingChat) {
      setActiveChat(existingChat);
      fetchMessages(existingChat.id);
      setSearchDialogOpen(false);
      setSearchQuery('');
      return;
    }

    // Check if there's a deleted chat we can restore
    const { data: existingDeletedChat } = await supabase
      .from('peer_chats')
      .select('*')
      .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`)
      .maybeSingle();

    if (existingDeletedChat) {
      // Remove from deleted conversations to restore it
      await supabase
        .from('deleted_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('chat_id', existingDeletedChat.id);

      const otherProfile = allProfiles.find(p => p.user_id === otherUserId);
      const restoredChat = { ...existingDeletedChat, other_user: otherProfile };
      setChats([restoredChat, ...chats]);
      setActiveChat(restoredChat);
      fetchMessages(existingDeletedChat.id);
      setSearchDialogOpen(false);
      setSearchQuery('');
      return;
    }

    // Create new chat
    const { data, error } = await supabase
      .from('peer_chats')
      .insert({
        participant1_id: user.id,
        participant2_id: otherUserId,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    } else {
      const otherProfile = allProfiles.find(p => p.user_id === otherUserId);
      const newChat = { ...data, other_user: otherProfile };
      setChats([newChat, ...chats]);
      setActiveChat(newChat);
      setMessages([]);
      setSearchDialogOpen(false);
    }
    setSearchQuery('');
  };

  const selectChat = (chat: Chat) => {
    setActiveChat(chat);
    fetchMessages(chat.id);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB',
          variant: 'destructive',
        });
        return;
      }
      clearSelectedVideo();
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a video under 50MB',
          variant: 'destructive',
        });
        return;
      }
      clearSelectedImage();
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearSelectedVideo = () => {
    setSelectedVideo(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('message_images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('message_images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const uploadVideo = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('message_images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('message_images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const sendMessage = async () => {
    if (!user || !activeChat || (!input.trim() && !selectedImage && !selectedVideo)) return;

    const content = input.trim();
    setInput('');
    setUploadingMedia(true);

    let imageUrl: string | null = null;
    let videoUrl: string | null = null;

    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) {
        toast({
          title: 'Error',
          description: 'Failed to upload image',
          variant: 'destructive',
        });
        setUploadingMedia(false);
        return;
      }
      clearSelectedImage();
    }

    if (selectedVideo) {
      videoUrl = await uploadVideo(selectedVideo);
      if (!videoUrl) {
        toast({
          title: 'Error',
          description: 'Failed to upload video',
          variant: 'destructive',
        });
        setUploadingMedia(false);
        return;
      }
      clearSelectedVideo();
    }

    // Optimistic update
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      chat_id: activeChat.id,
      sender_id: user.id,
      content: content || '',
      image_url: imageUrl,
      video_url: videoUrl,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setUploadingMedia(false);

    const { error } = await supabase.from('peer_messages').insert({
      chat_id: activeChat.id,
      sender_id: user.id,
      content: content || '',
      image_url: imageUrl,
      video_url: videoUrl,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } else {
      fetchMessages(activeChat.id);
      // Update chat's last message in the list
      let lastMsg = content;
      if (videoUrl) lastMsg = '🎥 Video';
      else if (imageUrl) lastMsg = '📷 Image';
      setChats(prev => prev.map(c => 
        c.id === activeChat.id ? { ...c, last_message: lastMsg } : c
      ));
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;

    // Mark conversation as deleted for this user (permanent)
    const { error } = await supabase
      .from('deleted_conversations')
      .insert({
        user_id: user.id,
        chat_id: chatId,
      });

    if (error && !error.message.includes('duplicate')) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
      return;
    }

    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChat?.id === chatId) {
      setActiveChat(null);
      setMessages([]);
    }
    toast({
      title: 'Conversation deleted',
      description: 'This conversation has been permanently removed',
    });
  };

  const clearAllChats = async () => {
    if (!user) return;

    // Mark all conversations as deleted
    const chatIds = chats.map(c => c.id);
    
    for (const chatId of chatIds) {
      await supabase
        .from('deleted_conversations')
        .insert({
          user_id: user.id,
          chat_id: chatId,
        })
        .single();
    }

    setChats([]);
    setActiveChat(null);
    setMessages([]);
    setClearAllDialogOpen(false);
    toast({
      title: 'All conversations cleared',
      description: 'Your conversation list has been cleared permanently',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 hover:bg-sage-light rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>
            <div className="flex gap-1">
              {chats.length > 0 && (
                <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove all conversations from your list. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllChats} className="bg-destructive text-destructive-foreground">
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button size="icon" variant="ghost" onClick={() => setSearchDialogOpen(true)}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No conversations yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchDialogOpen(true)}>
                Start a conversation
              </Button>
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`group relative p-4 cursor-pointer border-b border-border hover:bg-sage-light/50 transition-colors ${
                  activeChat?.id === chat.id ? 'bg-sage-light' : ''
                }`}
              >
                <div className="flex items-center gap-3" onClick={() => selectChat(chat)}>
                  <div className="w-10 h-10 rounded-full bg-ocean/10 flex items-center justify-center">
                    {chat.other_user?.avatar_url ? (
                      <img src={chat.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-ocean" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {chat.other_user?.anonymous_alias || 'Anonymous'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.last_message || 'No messages yet'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
              Peer Messages
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto mb-6">
              Connect privately with others in the community. Share experiences and 
              support each other anonymously.
            </p>
            <MessageCircle className="w-16 h-16 text-muted-foreground/20 mb-6" />
            <p className="text-muted-foreground text-sm mb-4">
              Select a conversation or start a new one
            </p>
            <Button onClick={() => setSearchDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="bg-background/80 backdrop-blur-lg border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ocean/10 flex items-center justify-center">
                  {activeChat.other_user?.avatar_url ? (
                    <img src={activeChat.other_user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-ocean" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{activeChat.other_user?.anonymous_alias || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground">Anonymous peer support</p>
                </div>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group flex items-start gap-1 ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender_id === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all self-center">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => deleteMessageForMe(msg.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete for me
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMessageForEveryone(msg.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete for everyone
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-card border border-border rounded-bl-md'
                      }`}
                    >
                      {msg.video_url && (
                        <video 
                          src={msg.video_url} 
                          controls
                          className="rounded-lg max-w-full mb-2"
                          style={{ maxHeight: '300px' }}
                        />
                      )}
                      {msg.image_url && (
                        <img 
                          src={msg.image_url} 
                          alt="Shared image" 
                          className="rounded-lg max-w-full mb-2 cursor-pointer hover:opacity-90"
                          onClick={() => window.open(msg.image_url!, '_blank')}
                        />
                      )}
                      {msg.content && <p>{msg.content}</p>}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Media Preview */}
            {(imagePreview || videoPreview) && (
              <div className="px-4 py-2 bg-sage-light/50 border-t border-border">
                <div className="relative inline-block">
                  {imagePreview && (
                    <>
                      <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
                      <button
                        onClick={clearSelectedImage}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  {videoPreview && (
                    <>
                      <video src={videoPreview} className="h-20 rounded-lg" />
                      <button
                        onClick={clearSelectedVideo}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  title="Send image"
                >
                  <Image className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingMedia}
                  title="Send video"
                >
                  <Video className="w-4 h-4" />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                  disabled={uploadingMedia}
                />
                <Button onClick={sendMessage} disabled={(!input.trim() && !selectedImage && !selectedVideo) || uploadingMedia}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search Users Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={(open) => {
        setSearchDialogOpen(open);
        if (!open) setSearchQuery('');
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type an alias to search..."
                className="pl-10"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {!searchQuery.trim() ? (
                <p className="text-center text-muted-foreground py-4">
                  Start typing to search for users
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No users found matching "{searchQuery}"
                </p>
              ) : (
                searchResults.map(profile => (
                  <div
                    key={profile.user_id}
                    onClick={() => startChatWithUser(profile.user_id)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-sage-light cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-ocean/10 flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-ocean" />
                      )}
                    </div>
                    <span className="font-medium">{profile.anonymous_alias}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
