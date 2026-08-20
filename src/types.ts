export interface Tag {
  id: string
  name: string
}

export interface Folder {
  id: string
  name: string
  noteCount: number
}

export interface Note {
  id: string
  title: string
  content: string
  folderId: string | null
  folderName: string | null
  isPinned: boolean
  createdAt: string
  updatedAt: string
  tags: Tag[]
  permission: 'owner' | 'view' | 'edit'
  sharedByUsername: string | null
  shareToken?: string | null
}

export interface PublicNote {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  username: string
}

export type View = 'all' | 'pinned'

export type Permission = 'view' | 'edit'

export interface Friend {
  id: string
  userId: string
  username: string
  since: string
}

export interface FriendSearchResult {
  id: string
  username: string
  friendship: 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends'
}

export interface FriendRequest {
  id: string
  user: { id: string; username: string }
  createdAt: string
}

export interface FriendRequests {
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
}

export interface ShareEntry {
  id: string
  userId: string
  username: string
  permission: Permission
  createdAt: string
}

export interface AdminUser {
  id: string
  username: string
  email: string
  isAdmin: boolean
  bannedAt: string | null
  createdAt: string
  noteCount: number
  friendCount: number
  maxNotes: number | null
  maxNoteChars: number | null
}

export interface AdminLimits {
  maxNotesPerUser: number
  maxNoteContentLength: number
}

export interface AdminNote {
  id: string
  title: string
  content: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  userId: string
  username: string
  userBanned: boolean
  publicShared: boolean
  sharedWith: { username: string; permission: Permission }[]
}

export interface AuthLog {
  id: string
  identifier: string
  success: boolean
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export interface AdminLog extends AuthLog {
  userId: string | null
  username: string | null
  email: string | null
}

export interface AdminUserDetail {
  user: AdminUser
  notes: {
    id: string
    title: string
    content: string
    isPinned: boolean
    createdAt: string
    updatedAt: string
    publicShared: boolean
    sharedWith: { username: string; permission: Permission }[]
  }[]
  friends: { userId: string; username: string; since: string }[]
}