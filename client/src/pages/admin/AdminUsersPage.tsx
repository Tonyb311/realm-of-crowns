import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ErrorMessage from '../../components/ui/ErrorMessage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  characterCount: number;
  characters?: AdminUserCharacter[];
  createdAt: string;
}

interface AdminUserCharacter {
  id: string;
  name: string;
  race: string;
  level: number;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20;

const ROLE_STYLES: Record<string, string> = {
  admin: 'text-blood-light bg-blood-dark/20 border-blood-dark/40',
  moderator: 'text-realm-teal-300 bg-realm-teal-300/10 border-realm-teal-300/30',
  player: 'text-realm-success bg-realm-success/10 border-realm-success/30',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  // Search & pagination
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Expanded row
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Modals
  const [editRoleUser, setEditRoleUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState('');
  const [resetPwUser, setResetPwUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Query
  const { data, isLoading, isError, error, refetch } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', debouncedSearch, page],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(PAGE_SIZE),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const raw = (await api.get('/admin/users', { params })).data;
      // Backend returns { data: [...], total, page, pageSize, totalPages }
      // Frontend expects { users: [...], total, page, pageSize }
      const rawUsers: any[] = raw?.users ?? raw?.data ?? [];
      return {
        users: rawUsers.map((u: any) => ({
          ...u,
          characterCount: u.characterCount ?? u._count?.characters ?? 0,
          characters: u.characters ?? [],
        })),
        total: raw?.total ?? 0,
        page: raw?.page ?? 1,
        pageSize: raw?.pageSize ?? PAGE_SIZE,
      };
    },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  // Edit Role Mutation
  const editRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return (await api.patch(`/admin/users/${userId}/role`, { role })).data;
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setEditRoleUser(null);
      setNewRole('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update role');
    },
  });

  // Reset Password Mutation
  const resetPwMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return (await api.post(`/admin/users/${userId}/reset-password`, { password })).data;
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      setResetPwUser(null);
      setNewPassword('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    },
  });

  const handleToggleExpand = useCallback((userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  }, []);

  const handleOpenEditRole = useCallback((user: AdminUser) => {
    setEditRoleUser(user);
    setNewRole(user.role);
  }, []);

  const handleSaveRole = useCallback(() => {
    if (!editRoleUser || !newRole) return;
    editRoleMutation.mutate({ userId: editRoleUser.id, role: newRole });
  }, [editRoleUser, newRole, editRoleMutation]);

  const handleResetPassword = useCallback(() => {
    if (!resetPwUser || !newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    resetPwMutation.mutate({ userId: resetPwUser.id, password: newPassword });
  }, [resetPwUser, newPassword, resetPwMutation]);

  return (
    <div>
      <h1 className="text-2xl font-display text-realm-gold-400 mb-6">User Management</h1>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full pl-10 pr-3 py-2 bg-realm-bg-800 border border-realm-border rounded px-3 text-realm-text-secondary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden animate-pulse">
          <div className="border-b border-realm-border px-4 py-3 flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="flex-1 h-3 bg-realm-bg-800 rounded" />))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex gap-4 border-b border-realm-border last:border-0">
              {Array.from({ length: 6 }).map((_, j) => (<div key={j} className="flex-1 h-3 bg-realm-bg-800 rounded" />))}
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorMessage error={error} onRetry={refetch} />
      ) : !data?.users?.length ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
          <p className="text-realm-text-muted">No users found.</p>
        </div>
      ) : (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-realm-border text-left">
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Username</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Role</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display hidden md:table-cell">Characters</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-realm-border/50">
              {data.users.map((user) => {
                const isExpanded = expandedUserId === user.id;
                return (
                  <tr key={user.id} className="group">
                    <td colSpan={6} className="p-0">
                      <div
                        className="flex items-center hover:bg-realm-bg-800/30 transition-colors cursor-pointer"
                        onClick={() => handleToggleExpand(user.id)}
                      >
                        <div className="px-4 py-3 text-sm text-realm-text-primary flex items-center gap-2 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
                          )}
                          <span className="truncate">{user.username}</span>
                        </div>
                        <div className="px-4 py-3 text-sm text-realm-text-secondary hidden sm:block flex-1 min-w-0">
                          <span className="truncate block">{user.email}</span>
                        </div>
                        <div className="px-4 py-3 flex-shrink-0">
                          <span
                            className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                              ROLE_STYLES[user.role] || ROLE_STYLES.player
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                        <div className="px-4 py-3 text-sm text-realm-text-secondary hidden md:block flex-shrink-0 w-24 text-center">
                          {user.characterCount}
                        </div>
                        <div className="px-4 py-3 text-xs text-realm-text-muted hidden lg:block flex-shrink-0 w-28">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                        <div className="px-4 py-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditRole(user)}
                              className="px-2.5 py-1 text-xs border border-realm-gold-500/40 text-realm-gold-400 rounded hover:bg-realm-gold-500/10 transition-colors"
                            >
                              Edit Role
                            </button>
                            <button
                              onClick={() => setResetPwUser(user)}
                              className="px-2.5 py-1 text-xs border border-realm-border/30 text-realm-text-secondary rounded hover:bg-realm-bg-800 transition-colors"
                            >
                              Reset PW
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Characters */}
                      {isExpanded && user.characters && user.characters.length > 0 && (
                        <div className="px-8 pb-3">
                          <div className="bg-realm-bg-800/50 border border-realm-border rounded-lg p-3">
                            <p className="text-realm-text-muted text-xs mb-2 font-display">Characters:</p>
                            <div className="space-y-1.5">
                              {user.characters.map((char) => (
                                <div
                                  key={char.id}
                                  className="flex items-center gap-3 text-sm"
                                >
                                  <span className="text-realm-text-primary">{char.name}</span>
                                  <span className="text-realm-text-muted text-xs">
                                    {char.race} - Lv.{char.level}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {isExpanded && (!user.characters || user.characters.length === 0) && (
                        <div className="px-8 pb-3">
                          <p className="text-realm-text-muted text-xs italic">No characters</p>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded border border-realm-border text-realm-text-secondary hover:bg-realm-bg-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded text-xs font-display transition-colors ${
                    page === pageNum
                      ? 'bg-realm-gold-500/20 text-realm-gold-400 border border-realm-gold-500/40'
                      : 'text-realm-text-secondary hover:bg-realm-bg-700 border border-transparent'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 rounded border border-realm-border text-realm-text-secondary hover:bg-realm-bg-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setEditRoleUser(null)}
        >
          <div
            className="bg-realm-bg-800 border border-realm-border rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-realm-gold-400">Edit Role</h3>
              <button
                onClick={() => setEditRoleUser(null)}
                className="text-realm-text-muted hover:text-realm-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-realm-text-secondary text-sm mb-4">
              Change role for <span className="text-realm-text-primary font-semibold">{editRoleUser.username}</span>
            </p>
            <div className="mb-6">
              <label className="text-realm-text-muted text-xs mb-1 block">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-realm-text-secondary text-sm focus:border-realm-gold-500 focus:outline-none"
              >
                <option value="player">Player</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditRoleUser(null)}
                className="flex-1 py-2 border border-realm-border/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={editRoleMutation.isPending || newRole === editRoleUser.role}
                className="flex-1 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {editRoleMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setResetPwUser(null)}
        >
          <div
            className="bg-realm-bg-800 border border-realm-border rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-realm-gold-400">Reset Password</h3>
              <button
                onClick={() => setResetPwUser(null)}
                className="text-realm-text-muted hover:text-realm-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-realm-text-secondary text-sm mb-4">
              Set a new password for <span className="text-realm-text-primary font-semibold">{resetPwUser.username}</span>
            </p>
            <div className="mb-6">
              <label className="text-realm-text-muted text-xs mb-1 block">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-realm-text-secondary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setResetPwUser(null); setNewPassword(''); }}
                className="flex-1 py-2 border border-realm-border/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetPwMutation.isPending || newPassword.length < 6}
                className="flex-1 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resetPwMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
