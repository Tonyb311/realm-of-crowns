# Social Systems

> Updated from implementation code. Last updated: 2026-02-10.

## Overview

Realm of Crowns includes a full suite of social features: **guilds**, **multi-channel messaging**, **friends lists**, and **notifications**. All social interactions support real-time updates via Socket.io.

---

## Guilds

**Source:** `server/src/routes/guilds.ts`

### Creating a Guild

- Endpoint: `POST /guilds`
- **Cost**: 500 gold (`GUILD_CREATION_COST = 500`), deducted from character's balance.
- Creator automatically becomes the **Leader** and is added as a guild member with `leader` rank.
- Guild name and tag must be unique. Tag is 2-4 alphanumeric characters, auto-uppercased.
- A character cannot create a guild if they already lead one.

### Guild Ranks

| Rank | Hierarchy | Permissions |
|------|:-:|-------------|
| `leader` | 3 | All permissions, transfer leadership, disband |
| `co-leader` | 2 | Same as officer + higher rank access |
| `officer` | 1 | Invite, kick (lower ranks only), update guild info |
| `member` | 0 | Basic access, donate, leave |

Rank hierarchy is enforced numerically: a member cannot kick someone of equal or higher rank.

### Guild Operations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/guilds` | Create a guild (500g) |
| `GET` | `/guilds` | List/search guilds (paginated, searchable by name or tag) |
| `GET` | `/guilds/:id` | Get guild details (leader, members with ranks, treasury, level) |
| `PATCH` | `/guilds/:id` | Update guild info -- name and/or description (officer+) |
| `DELETE` | `/guilds/:id` | Disband guild (leader only, returns treasury) |
| `POST` | `/guilds/:id/invite` | Invite a player (officer+), body: `{ characterId }` |
| `POST` | `/guilds/:id/join` | Join an open guild (self-service) |
| `POST` | `/guilds/:id/kick` | Kick a member (officer+, rank hierarchy enforced), body: `{ characterId }` |
| `POST` | `/guilds/:id/leave` | Leave the guild (leader must transfer first) |
| `POST` | `/guilds/:id/promote` | Change member rank (leader only), body: `{ characterId, newRank }` |
| `POST` | `/guilds/:id/donate` | Donate gold to guild treasury, body: `{ amount }` |
| `GET` | `/guilds/:id/quests` | Guild quests (placeholder, returns empty array) |
| `POST` | `/guilds/:id/transfer` | Transfer leadership to another member, body: `{ characterId }` |

### Disband Behavior

When a guild is disbanded:
- Only the **leader** can disband.
- All remaining **treasury gold** is returned to the leader's character.
- All members are removed.
- A `guild:dissolved` Socket.io event is emitted to all guild members.

### Leadership Transfer

When leadership is transferred:
- The new leader's rank is set to `leader`.
- The old leader is demoted to `co-leader`.
- Guild's `leaderId` is updated in the database.

---

## Messaging

**Source:** `server/src/routes/messages.ts`

### Channel Types

| Channel | Scope | Validation |
|---------|-------|------------|
| `GLOBAL` | All players server-wide | Admin-only (user role check) |
| `TOWN` | All players in the same town | Must currently be in a town (uses `currentTownId`) |
| `GUILD` | Guild members only | Must be a member of the specified guild |
| `PARTY` | Party members only | Must be in a party |
| `WHISPER` | Private, 1-to-1 | Must specify valid `recipientId` (cannot whisper self) |
| `TRADE` | Trade-focused channel | No special validation |
| `SYSTEM` | System announcements | Server-generated only |

Maximum message content length: **2000 characters** (`MAX_CONTENT_LENGTH = 2000`).

### Psion Nomad Far Whisper

When a **Psion Nomad** sends a whisper message, the system checks via `getPsionSpec()` and flags the response with `farWhisper: true`. This provides a UI indicator that the whisper was sent using psionic Far Whisper abilities.

### Message Operations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/messages/send` | Send a message (channel + content + optional recipientId/guildId/townId) |
| `GET` | `/messages/inbox` | Get whisper history (sent and received, paginated) |
| `GET` | `/messages/conversation/:characterId` | Get conversation thread with a specific player |
| `GET` | `/messages/channel/:channelType` | Get channel message history (with optional `?townId=` or `?guildId=`) |
| `PATCH` | `/messages/:id/read` | Mark a message as read (recipient only) |
| `DELETE` | `/messages/:id` | Delete your own message (sender only) |

### Validation

- Each channel type has specific validation rules enforced server-side.
- For `WHISPER`, a valid `recipientId` is required and cannot be the sender.
- For `GUILD`, the sender must belong to the specified guild (membership check).
- For `TOWN`, the sender must currently be located in a town (auto-resolved from `currentTownId`).
- For `GLOBAL`, the sender must be an admin.

---

## Friends

**Source:** `server/src/routes/friends.ts`

### Friendship States

| Status | Description |
|--------|-------------|
| `PENDING` | Request sent, awaiting response |
| `ACCEPTED` | Mutual friendship established |
| `DECLINED` | Request was declined (can re-request after deletion) |
| `BLOCKED` | One player has blocked the other (cannot send new requests) |

### Friend Operations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/friends/request` | Send a friend request (body: `{ characterId }`). Creates notification + Socket.io event. |
| `POST` | `/friends/:id/accept` | Accept a friend request (recipient only). Notifies requester. |
| `POST` | `/friends/:id/decline` | Decline a friend request (recipient only) |
| `DELETE` | `/friends/:id` | Remove a friend or cancel a pending request (either party) |
| `GET` | `/friends` | List all accepted friends (includes online status, level, race, location) |
| `GET` | `/friends/requests` | View pending requests (incoming + outgoing, separate arrays) |

### Re-requesting After Decline

If a friend request was previously declined, the old record is deleted and a fresh request can be sent. Blocked relationships cannot be overridden.

### Online Status

- The friend list endpoint returns each friend's **online/offline status**.
- Status is tracked via Socket.io connection state using `isOnline()` from `server/src/socket/presence.ts`.

### Friend Request Notifications

When a friend request is sent:
1. A `Notification` record is created in the database for the recipient.
2. A `friend:request` Socket.io event is emitted to the recipient.
3. A `notification` Socket.io event is also emitted.

When a friend request is accepted:
1. A `Notification` record is created for the original requester.
2. A `friend:accepted` Socket.io event is emitted.
3. A `notification` Socket.io event is also emitted.

---

## Notifications

**Source:** `server/src/routes/notifications.ts`

### Notification Types

Notifications are generated by various systems:
- Friend requests and acceptances
- Guild events (joins, leaves, dissolution)
- Quest completion alerts
- Combat results
- Election events
- Level-up events
- System announcements

### Notification Operations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notifications` | List notifications (paginated, optional `?unreadOnly=true` filter) |
| `PATCH` | `/notifications/:id/read` | Mark a single notification as read |
| `PATCH` | `/notifications/read-all` | Mark all notifications as read (returns count updated) |
| `DELETE` | `/notifications/:id` | Delete a notification (owner only) |

### Pagination

All list endpoints support pagination:
- Default page size: 20 (notifications), 50 (messages)
- Maximum page size: 50 (notifications), 100 (messages)
- Query params: `?page=1&limit=20`
- Response includes: `total`, `page`, `limit`, `totalPages`

---

## Real-Time Events

All social systems emit Socket.io events for real-time client updates:

| Event | Source | Description |
|-------|--------|-------------|
| `friend:request` | Friends | Friend request sent to recipient |
| `friend:accepted` | Friends | Friend request accepted |
| `notification` | All systems | Generic notification push |
| `guild:member-joined` | Guilds | New member joined the guild |
| `guild:member-left` | Guilds | Member left or was kicked |
| `guild:dissolved` | Guilds | Guild was disbanded |

The client subscribes to relevant channels on connection and receives events without polling.
