import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, Coins, Clock, User, Tag, ShoppingCart,
  Target, CheckCircle, XCircle, Plus, ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router';
import api from '../services/api';
import { RealmPanel, RealmButton, RealmBadge, RealmInput, PageHeader } from '../components/ui/realm-index';
import {
  NOTICE_BOARD_CONFIG,
  calculatePostingFee,
  type NoticeBoardPostType,
  type BountyStatus,
} from '@shared/data/notice-board-config';

// ── Types ────────────────────────────────────────────────────

interface Author {
  id: string;
  name: string;
  level: number;
}

interface Claimant {
  id: string;
  name: string;
}

interface NoticePost {
  id: string;
  townId: string;
  authorId: string;
  type: NoticeBoardPostType;
  title: string;
  body: string;
  itemName: string | null;
  quantity: number | null;
  pricePerUnit: number | null;
  tradeDirection: string | null;
  bountyReward: number | null;
  bountyClaimantId: string | null;
  bountyStatus: BountyStatus | null;
  claimedAt: string | null;
  completedAt: string | null;
  postingFee: number;
  isResident: boolean;
  expiresAt: string;
  createdAt: string;
  author?: Author;
  claimant?: Claimant | null;
  town?: { id: string; name: string };
}

type TabKey = 'ALL' | 'TRADE_REQUEST' | 'BOUNTY' | 'MINE';

// ── Helpers ──────────────────────────────────────────────────

function timeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `${days}d ${remainingHours}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(ms / (1000 * 60));
  return `${minutes}m`;
}

// ── Component ────────────────────────────────────────────────

export default function NoticeBoardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [page, setPage] = useState(1);

  // ── Data Queries ─────────────────────────────────────────

  const { data: charData } = useQuery({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });
  const character = charData?.character ?? charData;
  const townId = character?.currentTownId;

  const { data: townData } = useQuery({
    queryKey: ['town', townId],
    queryFn: async () => (await api.get(`/towns/${townId}`)).data,
    enabled: !!townId,
  });
  const townName = townData?.town?.name ?? 'Town';

  // Board posts (for ALL / TRADE_REQUEST / BOUNTY tabs)
  const typeFilter = activeTab === 'ALL' || activeTab === 'MINE' ? '' : `&type=${activeTab}`;
  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ['notice-board', townId, activeTab, page],
    queryFn: async () => (await api.get(`/notice-board/town/${townId}?page=${page}&limit=20${typeFilter}`)).data,
    enabled: !!townId && activeTab !== 'MINE',
    refetchInterval: 30_000,
  });

  // My posts (for MINE tab)
  const { data: myPostsData, isLoading: myPostsLoading } = useQuery({
    queryKey: ['notice-board', 'mine'],
    queryFn: async () => (await api.get('/notice-board/mine')).data,
    enabled: activeTab === 'MINE',
  });

  const posts: NoticePost[] = activeTab === 'MINE' ? (myPostsData?.posts ?? []) : (boardData?.posts ?? []);
  const totalCount = boardData?.totalCount ?? 0;
  const isLoading = activeTab === 'MINE' ? myPostsLoading : boardLoading;

  // ── Mutations ────────────────────────────────────────────

  const claimMutation = useMutation({
    mutationFn: async (postId: string) => (await api.post(`/notice-board/${postId}/claim`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notice-board'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (postId: string) => (await api.post(`/notice-board/${postId}/complete`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notice-board'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (postId: string) => (await api.post(`/notice-board/${postId}/release`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notice-board'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => (await api.delete(`/notice-board/${postId}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notice-board'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  // ── Tab Bar ──────────────────────────────────────────────

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'TRADE_REQUEST', label: 'Trade Requests' },
    { key: 'BOUNTY', label: 'Bounties' },
    { key: 'MINE', label: 'My Posts' },
  ];

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/town" className="text-realm-text-muted hover:text-realm-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader title={`Notice Board — ${townName}`} icon={<ClipboardList className="w-8 h-8 text-realm-gold-400" />} />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-realm-gold-500/20 text-realm-gold-400 border border-realm-gold-500/40'
                : 'bg-realm-bg-800 text-realm-text-muted hover:text-realm-text-secondary border border-realm-bg-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <RealmButton variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Post
        </RealmButton>
      </div>

      {/* Error displays */}
      {claimMutation.error && <ErrorBanner error={claimMutation.error} />}
      {completeMutation.error && <ErrorBanner error={completeMutation.error} />}
      {deleteMutation.error && <ErrorBanner error={deleteMutation.error} />}

      {/* Create Form */}
      {showCreateForm && (
        <CreatePostForm
          character={character}
          townId={townId}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({ queryKey: ['notice-board'] });
            queryClient.invalidateQueries({ queryKey: ['character'] });
          }}
        />
      )}

      {/* Post List */}
      {isLoading ? (
        <div className="text-center text-realm-text-muted py-8">Loading...</div>
      ) : posts.length === 0 ? (
        <RealmPanel>
          <div className="text-center text-realm-text-muted py-8">
            {activeTab === 'MINE' ? 'You have no active posts.' : 'No posts on this notice board yet.'}
          </div>
        </RealmPanel>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              characterId={character?.id}
              onClaim={() => claimMutation.mutate(post.id)}
              onComplete={() => completeMutation.mutate(post.id)}
              onRelease={() => releaseMutation.mutate(post.id)}
              onDelete={() => deleteMutation.mutate(post.id)}
              isMineTab={activeTab === 'MINE'}
              isPending={
                claimMutation.isPending || completeMutation.isPending ||
                releaseMutation.isPending || deleteMutation.isPending
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {activeTab !== 'MINE' && totalCount > 20 && (
        <div className="flex justify-center gap-2 pt-2">
          <RealmButton size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </RealmButton>
          <span className="text-realm-text-muted text-sm self-center">
            Page {page} of {Math.ceil(totalCount / 20)}
          </span>
          <RealmButton size="sm" disabled={page * 20 >= totalCount} onClick={() => setPage(p => p + 1)}>
            Next
          </RealmButton>
        </div>
      )}
    </div>
  );
}

// ── PostCard Component ───────────────────────────────────────

function PostCard({
  post,
  characterId,
  onClaim,
  onComplete,
  onRelease,
  onDelete,
  isMineTab,
  isPending,
}: {
  post: NoticePost;
  characterId?: string;
  onClaim: () => void;
  onComplete: () => void;
  onRelease: () => void;
  onDelete: () => void;
  isMineTab: boolean;
  isPending: boolean;
}) {
  const isAuthor = characterId === post.authorId;
  const isBounty = post.type === 'BOUNTY';
  const isTradeRequest = post.type === 'TRADE_REQUEST';

  return (
    <div className="bg-realm-bg-800 border border-realm-bg-600 hover:border-realm-gold-500/30 rounded-lg p-4 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-realm-text-primary truncate">{post.title}</h3>
            {isBounty && (
              <RealmBadge variant="uncommon">
                <Target className="w-3 h-3 mr-1" /> Bounty
              </RealmBadge>
            )}
            {isTradeRequest && post.tradeDirection && (
              <RealmBadge variant={post.tradeDirection === 'BUYING' ? 'default' : 'uncommon'}>
                <ShoppingCart className="w-3 h-3 mr-1" />
                {post.tradeDirection === 'BUYING' ? 'Buying' : 'Selling'}
              </RealmBadge>
            )}
            {isBounty && post.bountyStatus && (
              <BountyStatusBadge status={post.bountyStatus} />
            )}
          </div>
          <p className="text-sm text-realm-text-secondary mt-1">{post.body}</p>
        </div>
      </div>

      {/* Trade details */}
      {isTradeRequest && (post.itemName || post.quantity || post.pricePerUnit) && (
        <div className="flex items-center gap-4 text-sm text-realm-text-muted mt-2 mb-2">
          {post.itemName && (
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> {post.itemName}
            </span>
          )}
          {post.quantity && <span>Qty: {post.quantity}</span>}
          {post.pricePerUnit && (
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-realm-gold-400" /> {post.pricePerUnit}g ea
            </span>
          )}
        </div>
      )}

      {/* Bounty reward */}
      {isBounty && post.bountyReward && (
        <div className="flex items-center gap-2 text-sm mt-2 mb-2">
          <Coins className="w-4 h-4 text-realm-gold-400" />
          <span className="text-realm-gold-400 font-semibold">{post.bountyReward}g reward</span>
          {post.claimant && (
            <span className="text-realm-text-muted">
              — Claimed by <span className="text-realm-teal-300">{post.claimant.name}</span>
            </span>
          )}
        </div>
      )}

      {/* Footer: author, time, town (mine tab) */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-realm-bg-600">
        <div className="flex items-center gap-3 text-xs text-realm-text-muted">
          {post.author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {post.author.name} (Lv{post.author.level})
            </span>
          )}
          {isMineTab && post.town && (
            <span>{post.town.name}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeRemaining(post.expiresAt)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Claim bounty (not author, OPEN) */}
          {isBounty && !isAuthor && post.bountyStatus === 'OPEN' && (
            <RealmButton size="sm" variant="primary" onClick={onClaim} disabled={isPending}>
              Claim Bounty
            </RealmButton>
          )}
          {/* Author actions on CLAIMED bounty */}
          {isBounty && isAuthor && post.bountyStatus === 'CLAIMED' && (
            <>
              <RealmButton size="sm" variant="primary" onClick={onComplete} disabled={isPending}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete
              </RealmButton>
              <RealmButton size="sm" onClick={onRelease} disabled={isPending}>
                Release
              </RealmButton>
            </>
          )}
          {/* Author delete/cancel */}
          {isAuthor && post.bountyStatus !== 'COMPLETED' && (
            <RealmButton size="sm" onClick={onDelete} disabled={isPending}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
            </RealmButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ── BountyStatusBadge ────────────────────────────────────────

function BountyStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; label: string }> = {
    OPEN: { color: 'bg-realm-success/20 text-realm-success', label: 'Open' },
    CLAIMED: { color: 'bg-realm-warning/20 text-realm-warning', label: 'Claimed' },
    COMPLETED: { color: 'bg-realm-teal-300/20 text-realm-teal-300', label: 'Completed' },
    EXPIRED: { color: 'bg-realm-text-muted/20 text-realm-text-muted', label: 'Expired' },
    REFUNDED: { color: 'bg-realm-text-muted/20 text-realm-text-muted', label: 'Refunded' },
  };
  const v = variants[status] ?? { color: 'bg-realm-bg-600 text-realm-text-muted', label: status };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.color}`}>{v.label}</span>;
}

// ── ErrorBanner ──────────────────────────────────────────────

function ErrorBanner({ error }: { error: unknown }) {
  const msg = (error as any)?.response?.data?.error ?? 'An error occurred.';
  return (
    <div className="bg-realm-danger/10 border border-realm-danger/30 rounded-lg px-4 py-2 text-sm text-realm-danger">
      {msg}
    </div>
  );
}

// ── CreatePostForm ───────────────────────────────────────────

function CreatePostForm({
  character,
  townId,
  onClose,
  onCreated,
}: {
  character: any;
  townId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<NoticeBoardPostType>('TRADE_REQUEST');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  // Trade request fields
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [tradeDirection, setTradeDirection] = useState<'BUYING' | 'SELLING'>('BUYING');
  // Bounty fields
  const [bountyReward, setBountyReward] = useState('');

  const isResident = character?.homeTownId === townId;
  const postingFee = calculatePostingFee(type, isResident, durationDays);
  const escrow = type === 'BOUNTY' ? (parseInt(bountyReward) || 0) : 0;
  const totalCost = postingFee + escrow;
  const canAfford = (character?.gold ?? 0) >= totalCost;

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post('/notice-board/post', payload)).data,
    onSuccess: () => onCreated(),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      townId,
      type,
      title: title.trim(),
      body: body.trim(),
      durationDays,
    };
    if (type === 'TRADE_REQUEST') {
      if (itemName.trim()) payload.itemName = itemName.trim();
      if (quantity) payload.quantity = parseInt(quantity);
      if (pricePerUnit) payload.pricePerUnit = parseInt(pricePerUnit);
      payload.tradeDirection = tradeDirection;
    }
    if (type === 'BOUNTY') {
      payload.bountyReward = parseInt(bountyReward) || 0;
    }
    createMutation.mutate(payload);
  }

  const isValid = title.trim().length > 0 && body.trim().length > 0 && canAfford &&
    (type !== 'BOUNTY' || (parseInt(bountyReward) >= NOTICE_BOARD_CONFIG.minBountyReward));

  return (
    <RealmPanel title="Create Post">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector */}
        <div>
          <label className="block text-sm text-realm-text-secondary mb-1">Post Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('TRADE_REQUEST')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                type === 'TRADE_REQUEST'
                  ? 'bg-realm-gold-500/20 text-realm-gold-400 border border-realm-gold-500/40'
                  : 'bg-realm-bg-700 text-realm-text-muted border border-realm-bg-600'
              }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-1" /> Trade Request
            </button>
            <button
              type="button"
              onClick={() => setType('BOUNTY')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                type === 'BOUNTY'
                  ? 'bg-realm-gold-500/20 text-realm-gold-400 border border-realm-gold-500/40'
                  : 'bg-realm-bg-700 text-realm-text-muted border border-realm-bg-600'
              }`}
            >
              <Target className="w-4 h-4 inline mr-1" /> Bounty
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm text-realm-text-secondary mb-1">
            Title ({title.length}/{NOTICE_BOARD_CONFIG.maxTitleLength})
          </label>
          <RealmInput
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, NOTICE_BOARD_CONFIG.maxTitleLength))}
            placeholder="Short summary of your post"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm text-realm-text-secondary mb-1">
            Description ({body.length}/{NOTICE_BOARD_CONFIG.maxBodyLength})
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, NOTICE_BOARD_CONFIG.maxBodyLength))}
            placeholder="Details about what you need or offer..."
            rows={3}
            className="w-full bg-realm-bg-700 border border-realm-bg-600 rounded px-3 py-2 text-sm text-realm-text-primary placeholder-realm-text-muted focus:outline-none focus:border-realm-gold-500/50"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm text-realm-text-secondary mb-1">
            Duration: {durationDays} day{durationDays > 1 ? 's' : ''}
          </label>
          <input
            type="range"
            min={NOTICE_BOARD_CONFIG.minDurationDays}
            max={NOTICE_BOARD_CONFIG.maxDurationDays}
            value={durationDays}
            onChange={e => setDurationDays(parseInt(e.target.value))}
            className="w-full accent-realm-gold-400"
          />
          <div className="flex justify-between text-xs text-realm-text-muted">
            <span>1 day</span><span>7 days</span>
          </div>
        </div>

        {/* Trade Request Fields */}
        {type === 'TRADE_REQUEST' && (
          <div className="space-y-3 p-3 bg-realm-bg-700/50 rounded-lg border border-realm-bg-600">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTradeDirection('BUYING')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium ${
                  tradeDirection === 'BUYING'
                    ? 'bg-realm-teal-300/20 text-realm-teal-300 border border-realm-teal-300/40'
                    : 'bg-realm-bg-700 text-realm-text-muted border border-realm-bg-600'
                }`}
              >
                Buying
              </button>
              <button
                type="button"
                onClick={() => setTradeDirection('SELLING')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium ${
                  tradeDirection === 'SELLING'
                    ? 'bg-realm-bronze-400/20 text-realm-bronze-400 border border-realm-bronze-400/40'
                    : 'bg-realm-bg-700 text-realm-text-muted border border-realm-bg-600'
                }`}
              >
                Selling
              </button>
            </div>
            <RealmInput
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="Item name (e.g. Iron Ore)"
            />
            <div className="flex gap-2">
              <RealmInput
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Quantity"
              />
              <RealmInput
                type="number"
                value={pricePerUnit}
                onChange={e => setPricePerUnit(e.target.value)}
                placeholder="Price per unit (gold)"
              />
            </div>
          </div>
        )}

        {/* Bounty Fields */}
        {type === 'BOUNTY' && (
          <div className="p-3 bg-realm-bg-700/50 rounded-lg border border-realm-bg-600">
            <label className="block text-sm text-realm-text-secondary mb-1">
              Bounty Reward (min {NOTICE_BOARD_CONFIG.minBountyReward}g, held in escrow)
            </label>
            <RealmInput
              type="number"
              value={bountyReward}
              onChange={e => setBountyReward(e.target.value)}
              placeholder={`${NOTICE_BOARD_CONFIG.minBountyReward}`}
              min={NOTICE_BOARD_CONFIG.minBountyReward}
            />
          </div>
        )}

        {/* Cost Preview */}
        <div className="p-3 bg-realm-bg-700/50 rounded-lg border border-realm-bg-600">
          <h4 className="text-sm font-medium text-realm-text-secondary mb-2">Cost Preview</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-realm-text-muted">
                Posting fee ({isResident ? 'resident' : 'visitor'})
              </span>
              <span className="text-realm-text-primary">{postingFee}g</span>
            </div>
            {type === 'BOUNTY' && escrow > 0 && (
              <div className="flex justify-between">
                <span className="text-realm-text-muted">Bounty escrow</span>
                <span className="text-realm-gold-400">{escrow}g</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-realm-bg-600 font-medium">
              <span className="text-realm-text-secondary">Total</span>
              <span className={canAfford ? 'text-realm-gold-400' : 'text-realm-danger'}>
                {totalCost}g
              </span>
            </div>
            {!canAfford && (
              <p className="text-xs text-realm-danger mt-1">
                Not enough gold (you have {character?.gold ?? 0}g)
              </p>
            )}
            {type === 'BOUNTY' && escrow > 0 && (
              <p className="text-xs text-realm-text-muted mt-1">
                Escrow is refunded if the bounty expires unclaimed or you cancel it.
                Posting fee is not refundable.
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {createMutation.error && <ErrorBanner error={createMutation.error} />}

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <RealmButton type="button" onClick={onClose}>Cancel</RealmButton>
          <RealmButton
            type="submit"
            variant="primary"
            disabled={!isValid || createMutation.isPending}
          >
            {createMutation.isPending ? 'Posting...' : `Post (${totalCost}g)`}
          </RealmButton>
        </div>
      </form>
    </RealmPanel>
  );
}
