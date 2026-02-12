import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  X,
  Minus,
  ChevronUp,
  Send,
  Loader2,
  Users,
  Globe,
  Shield,
  Mail,
} from 'lucide-react';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ChannelType = 'town' | 'kingdom' | 'guild' | 'private';

interface ChatMessage {
  id: string;
  channelType: string;
  content: string;
  sender: { id: string; name: string };
  timestamp: string;
  recipientId?: string;
}

interface Conversation {
  characterId: string;
  characterName: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
}

interface CharacterInfo {
  id: string;
  currentTownId: string | null;
  guildId: string | null;
}

const CHANNEL_TABS: { key: ChannelType; label: string; icon: typeof Globe }[] = [
  { key: 'town', label: 'Town', icon: Users },
  { key: 'kingdom', label: 'Kingdom', icon: Globe },
  { key: 'guild', label: 'Guild', icon: Shield },
  { key: 'private', label: 'DMs', icon: Mail },
];

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ChatPanel() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<ChannelType>('town');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [privateTarget, setPrivateTarget] = useState<{ id: string; name: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: character } = useQuery<CharacterInfo>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      try { return (await api.get('/characters/me')).data; }
      catch (e: any) { if (e.response?.status === 404) return null; throw e; }
    },
    enabled: isAuthenticated,
  });

  // Load channel messages
  const { data: channelMessages, isLoading: channelLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat', activeTab, privateTarget?.id],
    queryFn: async () => {
      if (activeTab === 'private' && privateTarget) {
        const res = await api.get(`/messages/conversation/${privateTarget.id}`, { params: { limit: 50 } });
        return res.data.messages ?? res.data;
      }
      const params: Record<string, string> = {};
      if (activeTab === 'town' && character?.currentTownId) params.townId = character.currentTownId;
      if (activeTab === 'guild' && character?.guildId) params.guildId = character.guildId;
      const res = await api.get(`/messages/channel/${activeTab}`, { params: { ...params, limit: 50 } });
      return res.data.messages ?? res.data;
    },
    enabled: isAuthenticated && isOpen && !isMinimized && (activeTab !== 'private' || !!privateTarget),
  });

  // Load DM conversations list
  const { data: inbox } = useQuery<Conversation[]>({
    queryKey: ['chat', 'inbox'],
    queryFn: async () => {
      const res = await api.get('/messages/inbox', { params: { limit: 20 } });
      return res.data.conversations ?? res.data;
    },
    enabled: isAuthenticated && isOpen && !isMinimized && activeTab === 'private' && !privateTarget,
  });

  // Sync loaded messages
  useEffect(() => {
    if (channelMessages) {
      setMessages(channelMessages);
    }
  }, [channelMessages]);

  // Listen for real-time messages
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    const handleMessage = (msg: ChatMessage) => {
      // If chat is closed or minimized, increment unread
      if (!isOpen || isMinimized) {
        setUnreadCount((c) => c + 1);
        return;
      }

      // Add message to current view if it matches the active tab
      const msgChannel = msg.channelType as ChannelType;
      if (msgChannel === activeTab) {
        if (activeTab === 'private') {
          // Only add if we're viewing this conversation
          if (privateTarget && (msg.sender.id === privateTarget.id || msg.recipientId === privateTarget.id)) {
            setMessages((prev) => [...prev, msg]);
          }
        } else {
          setMessages((prev) => [...prev, msg]);
        }
      }

      // Invalidate inbox on private messages
      if (msgChannel === 'private') {
        queryClient.invalidateQueries({ queryKey: ['chat', 'inbox'] });
      }
    };

    socket.on('chat:message', handleMessage);
    return () => { socket.off('chat:message', handleMessage); };
  }, [isAuthenticated, isOpen, isMinimized, activeTab, privateTarget, queryClient]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = useCallback(() => {
    const content = inputValue.trim();
    if (!content || !character) return;

    const socket = getSocket();
    const payload: Record<string, string> = {
      channelType: activeTab,
      content,
    };

    if (activeTab === 'private' && privateTarget) {
      payload.recipientId = privateTarget.id;
    }
    if (activeTab === 'town' && character.currentTownId) {
      payload.townId = character.currentTownId;
    }
    if (activeTab === 'guild' && character.guildId) {
      payload.guildId = character.guildId;
    }

    // MAJ-13: Send via socket only — server persists on receipt.
    // Removed duplicate REST call that caused double messages.
    socket?.emit('chat:send', payload);

    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, activeTab, privateTarget, character]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Open a private conversation
  const openDM = useCallback((characterId: string, characterName: string) => {
    setActiveTab('private');
    setPrivateTarget({ id: characterId, name: characterName });
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  // Expose openDM on window for other components
  useEffect(() => {
    (window as any).__chatOpenDM = openDM;
    return () => { delete (window as any).__chatOpenDM; };
  }, [openDM]);

  if (!isAuthenticated) return null;

  // Collapsed button
  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-16 md:bottom-16 right-4 z-30 bg-realm-bg-700 border border-realm-gold-500/60 text-realm-gold-400 p-3 rounded-full shadow-lg hover:bg-realm-bg-600 transition-colors"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blood-light text-realm-text-primary text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Minimized bar
  if (isMinimized) {
    return (
      <div className="fixed bottom-12 md:bottom-12 right-4 z-30 w-80 bg-realm-bg-700 border border-realm-border border-b-0 rounded-t-lg shadow-xl">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 text-realm-gold-400 font-display text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Chat
            {unreadCount > 0 && (
              <span className="bg-blood-light text-realm-text-primary text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="flex gap-1">
            <button onClick={() => setIsMinimized(false)} className="p-1 text-realm-text-muted hover:text-realm-text-primary">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1 text-realm-text-muted hover:text-realm-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full panel
  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-12 md:right-4 z-30 md:w-96 md:h-[28rem] bg-realm-bg-800 border border-realm-border md:rounded-t-lg shadow-xl flex flex-col pt-12 md:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-realm-border bg-realm-bg-700 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-realm-gold-400" />
          <span className="font-display text-realm-gold-400 text-sm">Chat</span>
          {activeTab === 'private' && privateTarget && (
            <span className="text-xs text-realm-text-secondary">
              - {privateTarget.name}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsMinimized(true)} className="p-1 text-realm-text-muted hover:text-realm-text-primary">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 text-realm-text-muted hover:text-realm-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-realm-border">
        {CHANNEL_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key !== 'private') setPrivateTarget(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
                activeTab === tab.key
                  ? 'text-realm-gold-400 border-b-2 border-realm-gold-500 bg-realm-bg-700/50'
                  : 'text-realm-text-muted hover:text-realm-text-secondary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {/* DM inbox view */}
        {activeTab === 'private' && !privateTarget ? (
          inbox && inbox.length > 0 ? (
            inbox.map((conv) => (
              <button
                key={conv.characterId}
                onClick={() => setPrivateTarget({ id: conv.characterId, name: conv.characterName })}
                className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-realm-bg-700 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm text-realm-text-primary font-semibold truncate">{conv.characterName}</p>
                  <p className="text-xs text-realm-text-muted truncate">{conv.lastMessage}</p>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <span className="text-[10px] text-realm-text-muted">{formatTime(conv.timestamp)}</span>
                  {conv.unread && conv.unread > 0 && (
                    <span className="ml-1 bg-realm-gold-500 text-realm-bg-900 text-[10px] font-bold rounded-full min-w-[16px] h-4 inline-flex items-center justify-center px-1">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-realm-text-muted">
              No conversations yet.
            </div>
          )
        ) : channelLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-realm-gold-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-realm-text-muted">
            No messages yet. Be the first to speak.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="group">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold text-realm-gold-400 cursor-pointer hover:underline">
                  {msg.sender.name}
                </span>
                <span className="text-[10px] text-realm-text-muted">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-sm text-realm-text-secondary pl-0 leading-snug break-words">{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Back button for DM thread */}
      {activeTab === 'private' && privateTarget && (
        <button
          onClick={() => setPrivateTarget(null)}
          className="px-3 py-1 text-xs text-realm-gold-400 hover:text-realm-gold-400 border-t border-realm-border text-left"
        >
          Back to conversations
        </button>
      )}

      {/* Input */}
      {(activeTab !== 'private' || privateTarget) && (
        <div className="border-t border-realm-border px-3 py-2">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activeTab === 'private' && privateTarget ? privateTarget.name : activeTab} chat...`}
              rows={1}
              className="flex-1 bg-realm-bg-700 border border-realm-border rounded px-3 py-1.5 text-sm text-realm-text-primary placeholder-realm-text-muted resize-none focus:outline-none focus:border-realm-gold-500 max-h-20"
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim()}
              className="p-2 text-realm-gold-400 hover:text-realm-gold-400 disabled:text-realm-text-muted disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
