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
  Plus,
  Edit3,
  Trash2,
  MessageCircle,
  Bot,
  User,
  Check,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function AIChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchChats();
  }, [user, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('ai_chats')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chats:', error);
    } else {
      setChats(data || []);
      // Don't auto-select first chat - show intro screen first
    }
  };

  const fetchMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else if (data) {
      setMessages(data.map(m => ({
        ...m,
        role: m.role as 'user' | 'assistant'
      })));
    }
  };

  const createNewChat = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_chats')
      .insert({ user_id: user.id, title: 'New Chat' })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create new chat',
        variant: 'destructive',
      });
    } else {
      setChats([data, ...chats]);
      setActiveChat(data);
      setMessages([]);
    }
  };

  const selectChat = (chat: Chat) => {
    setActiveChat(chat);
    fetchMessages(chat.id);
  };

  const startEditingChat = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const saveEditChat = async () => {
    if (!editingChatId) return;

    const { error } = await supabase
      .from('ai_chats')
      .update({ title: editTitle })
      .eq('id', editingChatId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to rename chat',
        variant: 'destructive',
      });
    } else {
      setChats(chats.map(c => c.id === editingChatId ? { ...c, title: editTitle } : c));
      if (activeChat?.id === editingChatId) {
        setActiveChat({ ...activeChat, title: editTitle });
      }
    }
    setEditingChatId(null);
  };

  const confirmDeleteChat = (chatId: string) => {
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const deleteChat = async () => {
    if (!chatToDelete) return;

    const { error } = await supabase
      .from('ai_chats')
      .delete()
      .eq('id', chatToDelete);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive',
      });
    } else {
      const newChats = chats.filter(c => c.id !== chatToDelete);
      setChats(newChats);
      if (activeChat?.id === chatToDelete) {
        if (newChats.length > 0) {
          setActiveChat(newChats[0]);
          fetchMessages(newChats[0].id);
        } else {
          setActiveChat(null);
          setMessages([]);
        }
      }
      toast({
        title: 'Chat deleted',
        description: 'The conversation has been removed',
      });
    }
    setDeleteDialogOpen(false);
    setChatToDelete(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChat || streaming) return;

    const userMessage = input.trim();
    setInput('');
    setStreaming(true);

    // Add user message to UI
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Save user message to DB
    await supabase.from('ai_chat_messages').insert({
      chat_id: activeChat.id,
      role: 'user',
      content: userMessage,
    });

    // Prepare messages for AI
    const chatMessages = [...messages, tempUserMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: chatMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      // Add empty assistant message
      const tempAssistantMsg: Message = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempAssistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => 
                prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to DB
      await supabase.from('ai_chat_messages').insert({
        chat_id: activeChat.id,
        role: 'assistant',
        content: assistantContent,
      });

      // Update chat title if first message
      if (messages.length === 0) {
        const newTitle = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
        await supabase.from('ai_chats').update({ title: newTitle }).eq('id', activeChat.id);
        setChats(chats.map(c => c.id === activeChat.id ? { ...c, title: newTitle } : c));
        setActiveChat({ ...activeChat, title: newTitle });
      }

    } catch (error) {
      console.error('AI chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive',
      });
    } finally {
      setStreaming(false);
      fetchMessages(activeChat.id);
    }
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-card border-r border-border transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-border">
          <Button onClick={createNewChat} className="w-full" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-colors ${
                activeChat?.id === chat.id ? 'bg-sage-light' : 'hover:bg-sage-light/50'
              }`}
              onClick={() => selectChat(chat)}
            >
              <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {editingChatId === chat.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-7 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button onClick={(e) => { e.stopPropagation(); saveEditChat(); }}>
                    <Check className="w-4 h-4 text-sage" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setEditingChatId(null); }}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm truncate">{chat.title}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditingChat(chat); }}
                      className="p-1 hover:bg-sage-light rounded"
                    >
                      <Edit3 className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); confirmDeleteChat(chat.id); }}
                      className="p-1 hover:bg-destructive/10 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center gap-4 px-6 py-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 hover:bg-sage-light rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeChat ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
                AI Support Chat
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto mb-6">
                Your compassionate AI companion for emotional support, guidance, and a safe space to express yourself.
              </p>
              <Bot className="w-16 h-16 text-ocean/20 mb-6" />
              <p className="text-muted-foreground text-sm mb-4">
                Select a conversation or start a new one
              </p>
              <Button onClick={createNewChat}>
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-16 h-16 text-ocean/30 mb-4" />
              <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
                How can I support you today?
              </h2>
              <p className="text-muted-foreground max-w-md">
                I'm here to listen and provide supportive guidance. Feel free to share what's on your mind.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-ocean/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-ocean" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-sage" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeChat && (
          <div className="p-4 border-t border-border bg-background">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={streaming}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={streaming || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteChat} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}