import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';

const MAX_CONTENT_LENGTH = 2000;

function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

interface ChatSendPayload {
  channelType: string;
  content: string;
  recipientId?: string;
  guildId?: string;
  townId?: string;
}

interface ChatMessageEvent {
  id: string;
  channelType: string;
  content: string;
  sender: { id: string; name: string };
  timestamp: Date;
  recipientId?: string;
  guildId?: string;
  townId?: string;
}

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on('chat:send', async (payload: ChatSendPayload) => {
    try {
      const { channelType, content, recipientId, guildId, townId } = payload;

      // Basic validation
      if (!channelType || !content) {
        socket.emit('chat:error', { error: 'channelType and content are required' });
        return;
      }

      if (content.length > MAX_CONTENT_LENGTH) {
        socket.emit('chat:error', { error: `Message cannot exceed ${MAX_CONTENT_LENGTH} characters` });
        return;
      }

      const validChannels = ['GLOBAL', 'TOWN', 'GUILD', 'PARTY', 'WHISPER', 'TRADE', 'SYSTEM'];
      if (!validChannels.includes(channelType)) {
        socket.emit('chat:error', { error: 'Invalid channel type' });
        return;
      }

      // Get character from socket data (set during auth/join)
      const characterId = socket.data.characterId as string | undefined;
      if (!characterId) {
        socket.emit('chat:error', { error: 'Not authenticated. Join with your character first.' });
        return;
      }

      const character = await prisma.character.findUnique({
        where: { id: characterId },
        select: { id: true, name: true, currentTownId: true },
      });

      if (!character) {
        socket.emit('chat:error', { error: 'Character not found' });
        return;
      }

      // Channel-specific validation
      if (channelType === 'WHISPER') {
        if (!recipientId) {
          socket.emit('chat:error', { error: 'recipientId is required for whisper messages' });
          return;
        }
        if (recipientId === character.id) {
          socket.emit('chat:error', { error: 'You cannot whisper to yourself' });
          return;
        }
      }

      if (channelType === 'GUILD' && !guildId) {
        socket.emit('chat:error', { error: 'guildId is required for guild messages' });
        return;
      }

      if (channelType === 'GUILD' && guildId) {
        const membership = await prisma.guildMember.findUnique({
          where: { guildId_characterId: { guildId, characterId: character.id } },
        });
        if (!membership) {
          socket.emit('chat:error', { error: 'You are not a member of this guild' });
          return;
        }
      }

      // Resolve town for TOWN channel
      let resolvedTownId = townId;
      if (channelType === 'TOWN') {
        resolvedTownId = character.currentTownId ?? undefined;
        if (!resolvedTownId) {
          socket.emit('chat:error', { error: 'You must be in a town to send town messages' });
          return;
        }
      }

      // Sanitize content before saving
      const sanitizedContent = sanitizeText(content);

      // Save to database
      const message = await prisma.message.create({
        data: {
          channelType: channelType as any,
          content: sanitizedContent,
          senderId: character.id,
          recipientId: channelType === 'WHISPER' ? recipientId : null,
          guildId: channelType === 'GUILD' ? guildId : null,
          townId: channelType === 'TOWN' ? resolvedTownId : null,
        },
      });

      const chatMessage: ChatMessageEvent = {
        id: message.id,
        channelType: message.channelType,
        content: message.content,
        sender: { id: character.id, name: character.name },
        timestamp: message.timestamp,
      };

      // Broadcast to appropriate room
      switch (channelType) {
        case 'WHISPER': {
          chatMessage.recipientId = recipientId;
          // Send to recipient via their user room (O(1) instead of O(N) fetchSockets scan)
          io.to(`user:${recipientId}`).emit('chat:message', chatMessage);
          // Echo back to sender
          socket.emit('chat:message', chatMessage);
          break;
        }

        case 'TOWN': {
          chatMessage.townId = resolvedTownId;
          io.to(`town:${resolvedTownId}`).emit('chat:message', chatMessage);
          break;
        }

        case 'GUILD': {
          chatMessage.guildId = guildId;
          io.to(`guild:${guildId}`).emit('chat:message', chatMessage);
          break;
        }

        case 'GLOBAL':
        case 'TRADE':
        case 'SYSTEM': {
          io.emit('chat:message', chatMessage);
          break;
        }

        default: {
          // PARTY and others - echo back for now
          socket.emit('chat:message', chatMessage);
          break;
        }
      }
    } catch (error) {
      console.error('Chat send error:', error);
      socket.emit('chat:error', { error: 'Failed to send message' });
    }
  });

  // Set character identity on socket
  socket.on('chat:identify', async (data: { characterId: string }) => {
    if (data.characterId) {
      const character = await prisma.character.findFirst({
        where: { id: data.characterId, userId: socket.data.userId },
        select: { id: true, name: true },
      });
      if (!character) {
        socket.emit('error', { message: 'Character not found or not owned by you' });
        return;
      }
      socket.data.characterId = character.id;
      socket.data.characterName = character.name;
    }
  });
}
