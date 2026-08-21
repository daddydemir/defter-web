import type {
  AdminLimits,
  AdminLog,
  AdminNote,
  AdminShareView,
  AdminUser,
  AdminUserDetail,
  AuthLog,
  DailyViewsPoint,
  Folder,
  Friend,
  FriendRequests,
  FriendSearchResult,
  Note,
  Permission,
  PublicNote,
  ShareAnalytics,
  ShareEntry,
  Tag,
} from './types'
import type { AuthUser } from './lib/auth'
import { getToken } from './lib/auth'
import { canEncrypt, encryptPayload } from './lib/crypto'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined
  const headers: Record<string, string> = {}
  if (hasBody) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.error ?? message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

type NotePatch = {
  title?: string
  content?: string
  folderId?: string | null
  isPinned?: boolean
  tagIds?: string[]
}

type AuthResponse = {
  token: string
  user: AuthUser
}

// Giriş/kayıt bilgilerini mümkünse şifreleyerek gönderir (MITM koruması).
// Şifreleme desteklenmiyorsa eski davranış (düz metin) kullanılır.
async function secureBody(payload: Record<string, unknown>): Promise<string> {
  if (canEncrypt()) {
    try {
      return JSON.stringify(await encryptPayload(payload))
    } catch {
      /* crypto başarısız olursa düz metne düş */
    }
  }
  return JSON.stringify(payload)
}

export const api = {
  register: async (username: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: await secureBody({ username, email, password }),
    }),
  login: async (emailOrUsername: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: await secureBody({ email: emailOrUsername, password }),
    }),
  me: () => request<{ user: AuthUser }>('/auth/me'),
  myLogs: () => request<AuthLog[]>('/auth/me/logs'),

  listNotes: () => request<Note[]>('/notes'),
  createNote: (data: { title?: string; content?: string; folderId?: string | null; isPinned?: boolean }) =>
    request<Note>('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, data: NotePatch) =>
    request<Note>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNote: (id: string) => request<void>(`/notes/${id}`, { method: 'DELETE' }),

  listFolders: () => request<Folder[]>('/folders'),
  createFolder: (name: string) => request<Folder>('/folders', { method: 'POST', body: JSON.stringify({ name }) }),
  renameFolder: (id: string, name: string) =>
    request<Folder>(`/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteFolder: (id: string) => request<void>(`/folders/${id}`, { method: 'DELETE' }),

  listTags: () => request<Tag[]>('/tags'),
  createTag: (name: string) => request<Tag>('/tags', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteTag: (id: string) => request<void>(`/tags/${id}`, { method: 'DELETE' }),

  searchUsers: (q: string) => request<FriendSearchResult[]>(`/friends/search?q=${encodeURIComponent(q)}`),
  listFriends: () => request<Friend[]>('/friends'),
  listFriendRequests: () => request<FriendRequests>('/friends/requests'),
  sendFriendRequest: (userId: string) =>
    request<{ id: string; accepted: boolean }>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  acceptFriendRequest: (id: string) => request<{ id: string }>(`/friends/${id}/accept`, { method: 'POST' }),
  declineFriendRequest: (id: string) => request<void>(`/friends/${id}/decline`, { method: 'POST' }),
  removeFriend: (id: string) => request<void>(`/friends/${id}`, { method: 'DELETE' }),

  listShares: (noteId: string) => request<ShareEntry[]>(`/notes/${noteId}/shares`),
  addShare: (noteId: string, userId: string, permission: Permission) =>
    request<{ id: string; permission: Permission }>(`/notes/${noteId}/shares`, {
      method: 'POST',
      body: JSON.stringify({ userId, permission }),
    }),
  updateShare: (noteId: string, shareId: string, permission: Permission) =>
    request<{ id: string; permission: Permission }>(`/notes/${noteId}/shares/${shareId}`, {
      method: 'PATCH',
      body: JSON.stringify({ permission }),
    }),
  removeShare: (noteId: string, shareId: string) =>
    request<void>(`/notes/${noteId}/shares/${shareId}`, { method: 'DELETE' }),

  enableNoteShare: (noteId: string) =>
    request<{ shareToken: string }>(`/notes/${noteId}/share`, { method: 'POST' }),
  disableNoteShare: (noteId: string) => request<void>(`/notes/${noteId}/share`, { method: 'DELETE' }),
  fetchPublicNote: (token: string) => request<PublicNote>(`/share/${encodeURIComponent(token)}`),

  analytics: () => request<ShareAnalytics>('/analytics'),
  analyticsNoteDaily: (noteId: string, days: number) =>
    request<DailyViewsPoint[]>(`/analytics/notes/${encodeURIComponent(noteId)}/daily?days=${days}`),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ updated: boolean }>('/auth/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  adminResetPassword: (id: string, newPassword: string) =>
    request<{ reset: boolean }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  adminUsers: () => request<AdminUser[]>('/admin/users'),
  adminNotes: (q: string) => request<AdminNote[]>(`/admin/notes?q=${encodeURIComponent(q)}`),
  adminUserDetail: (id: string) => request<AdminUserDetail>(`/admin/users/${id}`),
  adminNoteViews: (noteId: string) => request<AdminShareView[]>(`/admin/notes/${noteId}/views`),
  adminBan: (id: string) => request<{ banned: boolean }>(`/admin/users/${id}/ban`, { method: 'PATCH' }),
  adminUnban: (id: string) => request<{ banned: boolean }>(`/admin/users/${id}/unban`, { method: 'PATCH' }),
  adminSetRole: (id: string, isAdmin: boolean) =>
    request<{ isAdmin: boolean }>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ isAdmin }) }),
  adminLogs: (params: { q?: string; success?: boolean | null; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.success !== undefined && params.success !== null) sp.set('success', String(params.success))
    if (params.limit) sp.set('limit', String(params.limit))
    if (params.offset) sp.set('offset', String(params.offset))
    const qs = sp.toString()
    return request<AdminLog[]>(`/admin/logs?${qs}`)
  },
  adminDeleteUserNote: (userId: string, noteId: string) =>
    request<void>(`/admin/users/${userId}/notes/${noteId}`, { method: 'DELETE' }),
  adminDeleteNote: (noteId: string) => request<void>(`/admin/notes/${noteId}`, { method: 'DELETE' }),
  adminSettings: () => request<AdminLimits>('/admin/settings'),
  adminUpdateSettings: (patch: { maxNotesPerUser?: number; maxNoteContentLength?: number }) =>
    request<AdminLimits>('/admin/settings', { method: 'PATCH', body: JSON.stringify(patch) }),
  adminSetUserLimits: (
    id: string,
    patch: { maxNotes?: number | null; maxNoteChars?: number | null },
  ) => request<{ maxNotes: number | null; maxNoteChars: number | null }>(`/admin/users/${id}/limits`, { method: 'PATCH', body: JSON.stringify(patch) }),
}