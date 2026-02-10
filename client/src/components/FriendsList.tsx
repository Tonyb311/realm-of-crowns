import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  MessageSquare,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import api from '../services/api';
import PlayerSearch from './PlayerSearch';

interface Friend {
  id: string;
  characterId: string;
  characterName: string;
  race: string;
  level: number;
  online: boolean;
}

interface FriendRequest {
  id: string;
  fromCharacterId: string;
  fromCharacterName: string;
  race: string;
  level: number;
  createdAt: string;
}

interface FriendsListProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: (characterId: string, characterName: string) => void;
}

export default function FriendsList({ isOpen, onClose, onOpenChat }: FriendsListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRequests, setShowRequests] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);

  const { data: friends = [], isLoading: friendsLoading } = useQuery<Friend[]>({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await api.get('/friends');
      return res.data;
    },
    enabled: isOpen,
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<FriendRequest[]>({
    queryKey: ['friends', 'requests'],
    queryFn: async () => {
      const res = await api.get('/friends/requests');
      return res.data;
    },
    enabled: isOpen,
  });

  const sendRequest = useMutation({
    mutationFn: (characterId: string) => api.post('/friends/request', { characterId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });

  const acceptRequest = useMutation({
    mutationFn: (id: string) => api.post(`/friends/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
  });

  const declineRequest = useMutation({
    mutationFn: (id: string) => api.post(`/friends/${id}/decline`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] }),
  });

  const removeFriend = useMutation({
    mutationFn: (id: string) => api.delete(`/friends/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });

  if (!isOpen) return null;

  const onlineFriends = friends.filter((f) => f.online);
  const offlineFriends = friends.filter((f) => !f.online);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-80 max-w-full bg-dark-400 border-l border-dark-50 h-full flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-50">
          <h2 className="font-display text-primary-400 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Friends
          </h2>
          <button onClick={onClose} className="text-parchment-500 hover:text-parchment-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add friend */}
        <div className="px-4 py-2 border-b border-dark-50">
          <button
            onClick={() => setShowAddFriend(!showAddFriend)}
            className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
            {showAddFriend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showAddFriend && (
            <div className="mt-2">
              <PlayerSearch
                placeholder="Search player to add..."
                onSelect={(c) => {
                  sendRequest.mutate(c.id);
                  setShowAddFriend(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Friend Requests */}
          {requests.length > 0 && (
            <div className="border-b border-dark-50">
              <button
                onClick={() => setShowRequests(!showRequests)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-parchment-400 hover:bg-dark-300 transition-colors"
              >
                <span>Pending Requests ({requests.length})</span>
                {showRequests ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showRequests && (
                <div>
                  {requestsLoading ? (
                    <div className="flex justify-center py-3">
                      <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                    </div>
                  ) : (
                    requests.map((req) => (
                      <div key={req.id} className="px-4 py-2 flex items-center justify-between hover:bg-dark-300/50">
                        <div>
                          <span className="text-sm text-parchment-200 font-semibold">{req.fromCharacterName}</span>
                          <span className="text-xs text-parchment-500 ml-1 capitalize">{req.race?.toLowerCase()}</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => acceptRequest.mutate(req.id)}
                            className="p-1.5 text-forest-light hover:text-green-400 transition-colors"
                            title="Accept"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => declineRequest.mutate(req.id)}
                            className="p-1.5 text-blood-light hover:text-red-400 transition-colors"
                            title="Decline"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Friends list */}
          {friendsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-parchment-500">
              No friends yet. Use the search above to add some.
            </div>
          ) : (
            <>
              {/* Online */}
              {onlineFriends.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs text-parchment-500 uppercase tracking-wider">
                    Online -- {onlineFriends.length}
                  </div>
                  {onlineFriends.map((friend) => (
                    <FriendRow
                      key={friend.id}
                      friend={friend}
                      onMessage={() => onOpenChat?.(friend.characterId, friend.characterName)}
                      onViewProfile={() => navigate(`/profile/${friend.characterId}`)}
                      onRemove={() => removeFriend.mutate(friend.id)}
                    />
                  ))}
                </div>
              )}

              {/* Offline */}
              {offlineFriends.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs text-parchment-500 uppercase tracking-wider">
                    Offline -- {offlineFriends.length}
                  </div>
                  {offlineFriends.map((friend) => (
                    <FriendRow
                      key={friend.id}
                      friend={friend}
                      onMessage={() => onOpenChat?.(friend.characterId, friend.characterName)}
                      onViewProfile={() => navigate(`/profile/${friend.characterId}`)}
                      onRemove={() => removeFriend.mutate(friend.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FriendRow({
  friend,
  onMessage,
  onViewProfile,
  onRemove,
}: {
  friend: Friend;
  onMessage: () => void;
  onViewProfile: () => void;
  onRemove: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="px-4 py-2 flex items-center justify-between hover:bg-dark-300/50 transition-colors cursor-pointer group"
      onClick={() => setShowActions(!showActions)}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            friend.online ? 'bg-green-500' : 'bg-parchment-500'
          }`}
        />
        <div>
          <span className="text-sm text-parchment-200 font-semibold">{friend.characterName}</span>
          <span className="text-xs text-parchment-500 ml-1">Lv. {friend.level}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onMessage(); }}
          className="p-1 text-parchment-500 hover:text-primary-400 transition-colors"
          title="Message"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onViewProfile(); }}
          className="p-1 text-parchment-500 hover:text-primary-400 transition-colors"
          title="Profile"
        >
          <Users className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1 text-parchment-500 hover:text-blood-light transition-colors"
          title="Remove"
        >
          <UserX className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
