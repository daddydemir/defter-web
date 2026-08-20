import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import type { Folder, Note, Tag, View } from './types'
import { useDebouncedValue } from './lib/useDebouncedValue'
import { useIsMobile } from './lib/useMediaQuery'
import { cn } from './lib/format'
import { clearAuth, getStoredUser, getToken, setAuth } from './lib/auth'
import type { AuthUser } from './lib/auth'
import { Sidebar } from './components/Sidebar'
import { NoteList } from './components/NoteList'
import { Editor } from './components/Editor'
import { EmptyState } from './components/EmptyState'
import { AuthScreen } from './components/AuthScreen'
import { FriendsDialog } from './components/FriendsDialog'
import { AdminPage } from './components/AdminPage'
import { SettingsPage } from './components/SettingsPage'
import { PublicNote } from './components/PublicNote'
import { X } from 'lucide-react'

type Theme = 'dark' | 'light'

type Auth = { token: string; user: AuthUser }

type FriendsTab = 'friends' | 'requests' | 'add'

export default function App() {
  const [auth, setAuthState] = useState<Auth | null>(() => {
    const token = getToken()
    const user = getStoredUser()
    return token && user ? { token, user } : null
  })
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('all')
  const [filterFolder, setFilterFolder] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [friendsTab, setFriendsTab] = useState<FriendsTab>('friends')
  const [friendReqCount, setFriendReqCount] = useState(0)
  const [friendToast, setFriendToast] = useState<{ id: string; username: string } | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  const isMobile = useIsMobile()
  const notesRef = useRef(notes)
  notesRef.current = notes
  const knownIncomingRef = useRef<string[]>([])

  const logout = useCallback(() => {
    clearAuth()
    setAuthState(null)
    setNotes([])
    setFolders([])
    setTags([])
    setSelectedId(null)
    setSidebarOpen(false)
    setFilterFolder(null)
    setFilterTag(null)
    setSearch('')
    setView('all')
    setFriendsOpen(false)
    setFriendReqCount(0)
    setFriendToast(null)
    setSettingsOpen(false)
  }, [])

  // Kayıtlı token'ı arka planda doğrula; geçersizse oturumu kapat
  useEffect(() => {
    if (!auth) return
    let cancelled = false
    api
      .me()
      .then(({ user }) => {
        if (cancelled) return
        if (user.id !== auth.user.id || user.email !== auth.user.email || user.username !== auth.user.username || user.isAdmin !== auth.user.isAdmin) {
          setAuthState({ token: auth.token, user })
        }
      })
      .catch(() => {
        if (!cancelled) logout()
      })
    return () => {
      cancelled = true
    }
  }, [auth, logout])

  const reload = useCallback(async () => {
    const [noteList, folderList, tagList] = await Promise.all([
      api.listNotes(),
      api.listFolders(),
      api.listTags(),
    ])
    setNotes(noteList)
    setFolders(folderList)
    setTags(tagList)
  }, [])

  useEffect(() => {
    if (!auth) return
    reload().catch((err) => {
      if (err instanceof Error && err.message === 'Unauthorized') logout()
      else setError(err.message)
    })
  }, [reload, auth, logout])

  // Arkadaşlık isteklerini periyodik kontrol et; yenisi gelince bildir
  useEffect(() => {
    if (!auth) return
    let cancelled = false
    try {
      const raw = localStorage.getItem('notes-friend-reqs')
      if (raw) {
        const parsed = JSON.parse(raw) as string[]
        knownIncomingRef.current = Array.isArray(parsed) ? parsed : []
      }
    } catch {
      /* ignore */
    }

    const poll = async () => {
      try {
        const r = await api.listFriendRequests()
        if (cancelled) return
        const incoming = r.incoming.map((x) => x.id)
        const known = knownIncomingRef.current
        const fresh = incoming.filter((id) => !known.includes(id))
        if (fresh.length > 0) {
          const first = r.incoming.find((x) => x.id === fresh[0])
          if (first) setFriendToast({ id: first.id, username: first.user.username })
        }
        knownIncomingRef.current = incoming
        try {
          localStorage.setItem('notes-friend-reqs', JSON.stringify(incoming))
        } catch {
          /* ignore */
        }
        setFriendReqCount(incoming.length)
      } catch {
        /* ignore */
      }
    }

    poll()
    const t = setInterval(poll, 15000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [auth])

  // Bildirimi otomatik kapat
  useEffect(() => {
    if (!friendToast) return
    const t = setTimeout(() => setFriendToast(null), 12000)
    return () => clearTimeout(t)
  }, [friendToast])

  const openFriends = useCallback((tab: FriendsTab = 'friends') => {
    setFriendsTab(tab)
    setFriendsOpen(true)
    setFriendToast(null)
  }, [])

  const debouncedSearch = useDebouncedValue(search.trim(), 200)

  const filtered = useMemo(() => {
    let list = notes
    if (view === 'pinned') list = list.filter((n) => n.isPinned)
    if (filterFolder) list = list.filter((n) => n.folderId === filterFolder)
    if (filterTag) list = list.filter((n) => n.tags.some((t) => t.id === filterTag))
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
      )
    }
    return list
  }, [notes, view, filterFolder, filterTag, debouncedSearch])

  const selected = notes.find((n) => n.id === selectedId) ?? null

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      try {
        localStorage.setItem('notes-theme', next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  // Android/iPhone donanım geri butonu: drawer'ı kapatır, mobilde editörden listeye döner
  useEffect(() => {
    const onPop = () => {
      setSidebarOpen(false)
      if (isMobile) setSelectedId(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [isMobile])

  const openSidebar = useCallback(() => {
    setSidebarOpen(true)
    window.history.pushState({ app: 'sidebar' }, '')
  }, [])

  const onSelectNote = useCallback((id: string) => {
    setSelectedId(id)
    setSidebarOpen(false)
    if (isMobile) window.history.pushState({ app: 'note' }, '')
  }, [isMobile])

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    const prev = notesRef.current.find((n) => n.id === id)
    if (!prev) return

    setNotes((list) =>
      list.map((n) => {
        if (n.id !== id) return n
        const next = { ...n, ...patch }
        if (patch.folderId !== undefined) {
          next.folderName = patch.folderId ? folders.find((f) => f.id === patch.folderId)?.name ?? null : null
        }
        return next
      }),
    )

    const serverPatch: {
      title?: string
      content?: string
      folderId?: string | null
      isPinned?: boolean
      tagIds?: string[]
    } = {}
    if (patch.title !== undefined) serverPatch.title = patch.title
    if (patch.content !== undefined) serverPatch.content = patch.content
    if (patch.folderId !== undefined) serverPatch.folderId = patch.folderId
    if (patch.isPinned !== undefined) serverPatch.isPinned = patch.isPinned
    if (patch.tags) serverPatch.tagIds = patch.tags.map((t) => t.id)

    api
      .updateNote(id, serverPatch)
      .then((serverNote) => {
        setNotes((list) =>
          list.map((n) => {
            if (n.id !== id) return n
            return { ...serverNote, title: n.title, content: n.content }
          }),
        )
      })
      .catch((err) => {
        setError((err as Error).message)
        reload()
      })
  }, [reload, folders])

  const createNote = useCallback(async () => {
    try {
      const note = await api.createNote({ folderId: filterFolder })
      setNotes((list) => [note, ...list])
      setSelectedId(note.id)
      setView('all')
      setFilterFolder(null)
      setSidebarOpen(false)
      if (isMobile) window.history.pushState({ app: 'note' }, '')
    } catch (err) {
      setError((err as Error).message)
    }
  }, [filterFolder, isMobile])

  const deleteNote = useCallback(
    async (note: Note) => {
      try {
        await api.deleteNote(note.id)
        setNotes((list) => list.filter((n) => n.id !== note.id))
        setSelectedId((id) => (id === note.id ? null : id))
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [],
  )

  const setNoteShareToken = useCallback((id: string, token: string | null) => {
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, shareToken: token } : n)))
  }, [])

  const createFolder = useCallback(
    async (name: string) => {
      const folder = await api.createFolder(name)
      setFolders((list) => [...list, folder].sort((a, b) => a.name.localeCompare(b.name)))
      return folder
    },
    [],
  )

  const renameFolder = useCallback(async (id: string, name: string) => {
    const folder = await api.renameFolder(id, name)
    setFolders((list) => list.map((f) => (f.id === id ? folder : f)))
    setNotes((list) => list.map((n) => (n.folderId === id ? { ...n, folderName: folder.name } : n)))
  }, [])

  const deleteFolder = useCallback(
    async (id: string) => {
      await api.deleteFolder(id)
      setFolders((list) => list.filter((f) => f.id !== id))
      setNotes((list) => list.map((n) => (n.folderId === id ? { ...n, folderId: null, folderName: null } : n)))
      setFilterFolder((f) => (f === id ? null : f))
    },
    [],
  )

  const createTag = useCallback(async (name: string) => {
    const tag = await api.createTag(name)
    setTags((list) => [...list, tag].sort((a, b) => a.name.localeCompare(b.name)))
    return tag
  }, [])

  const deleteTag = useCallback(
    async (id: string) => {
      await api.deleteTag(id)
      setTags((list) => list.filter((t) => t.id !== id))
      setNotes((list) => list.map((n) => (n.tags.some((t) => t.id === id) ? { ...n, tags: n.tags.filter((t) => t.id !== id) } : n)))
      setFilterTag((t) => (t === id ? null : t))
    },
    [],
  )

  const hasFilters = view === 'pinned' || filterFolder !== null || filterTag !== null || debouncedSearch !== ''

  const clearFilters = useCallback(() => {
    setView('all')
    setFilterFolder(null)
    setFilterTag(null)
    setSearch('')
  }, [])

  const handleAuthed = useCallback((token: string, user: AuthUser) => {
    setAuth(token, user)
    setAuthState({ token, user })
    setError(null)
  }, [])

  const sidebarProps = {
    folders,
    tags,
    noteCount: notes.length,
    view,
    activeFolder: filterFolder,
    activeTag: filterTag,
    theme,
    userName: auth?.user.username,
    userEmail: auth?.user.email,
    onSelectView: setView,
    onSelectFolder: setFilterFolder,
    onSelectTag: setFilterTag,
    onNewNote: createNote,
    onCreateFolder: createFolder,
    onRenameFolder: renameFolder,
    onDeleteFolder: deleteFolder,
    onCreateTag: createTag,
    onDeleteTag: deleteTag,
    onToggleTheme: toggleTheme,
    onLogout: logout,
    onNavigate: () => setSidebarOpen(false),
    onOpenFriends: () => openFriends('friends'),
    friendReqCount,
    onOpenAdmin: () => {
      setSidebarOpen(false)
      setAdminOpen(true)
    },
    onOpenSettings: () => {
      setSidebarOpen(false)
      setSettingsOpen(true)
    },
    isAdmin: auth?.user.isAdmin === true,
  }

  // Herkese açık paylaşım sayfası: /share/:token
  const publicToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    const m = /^\/share\/([A-Za-z0-9_-]+)\/?$/.exec(window.location.pathname)
    return m ? m[1] : null
  }, [])

  if (publicToken) {
    return <PublicNote token={publicToken} />
  }

  if (!auth) {
    return <AuthScreen onAuthed={handleAuthed} />
  }

  if (settingsOpen) {
    return (
      <SettingsPage
        user={auth.user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onClose={() => setSettingsOpen(false)}
      />
    )
  }

  if (adminOpen) {
    return <AdminPage onClose={() => setAdminOpen(false)} meId={auth.user.id} />
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-base text-ink">
      {sidebarOpen && (
        <MobileDrawer onClose={() => setSidebarOpen(false)}>
          <Sidebar {...sidebarProps} />
        </MobileDrawer>
      )}

      <aside className="hidden w-64 shrink-0 flex-col border-r border-edge bg-surface lg:flex">
        <Sidebar {...sidebarProps} />
      </aside>

      <section
        className={cn(
          'relative flex min-w-0 flex-col border-r border-edge',
          selectedId ? 'hidden sm:flex' : 'flex',
          'w-full sm:w-72 lg:w-80 lg:shrink-0',
        )}
      >
        <NoteList
          notes={filtered}
          selectedId={selectedId}
          search={search}
          onSearchChange={setSearch}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          onSelect={onSelectNote}
          onNewNote={createNote}
          onOpenSidebar={openSidebar}
          onOpenFriends={() => openFriends('friends')}
          friendReqCount={friendReqCount}
          folders={folders}
          onMoveToFolder={(id, folderId) => updateNote(id, { folderId })}
        />
      </section>

      <main className={cn('min-w-0 flex-1 flex-col', selectedId ? 'flex' : 'hidden sm:flex')}>
        {selected ? (
          <Editor
            key={selected.id}
            note={selected}
            folders={folders}
            tags={tags}
            onChange={(patch) => updateNote(selected.id, patch)}
            onDelete={deleteNote}
            onBack={() => setSelectedId(null)}
            onCreateTag={createTag}
            onShareTokenChange={(token) => setNoteShareToken(selected.id, token)}
          />
        ) : (
          <EmptyState onCreate={createNote} hasFilters={hasFilters} onClear={clearFilters} />
        )}
      </main>

      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}

      {friendToast && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[55] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
          <div className="bubble-enter flex items-center gap-3 rounded-xl border border-edge bg-surface p-3 shadow-2xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
              {friendToast.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Arkadaşlık isteği</p>
              <p className="truncate text-xs text-sub">
                <span className="font-medium text-ink">{friendToast.username}</span> sana istek gönderdi
              </p>
            </div>
            <button
              onClick={() => openFriends('requests')}
              className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              Görüntüle
            </button>
            <button
              onClick={() => setFriendToast(null)}
              className="shrink-0 rounded-lg p-1.5 text-sub transition-colors hover:bg-surface2 hover:text-ink"
              aria-label="Bildirimi kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <FriendsDialog
        open={friendsOpen}
        initialTab={friendsTab}
        onClose={() => setFriendsOpen(false)}
        onCountChange={setFriendReqCount}
      />
    </div>
  )
}

function MobileDrawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    setDragging(true)
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const d = e.touches[0].clientX - startX.current
    setDx(Math.max(0, Math.min(d, 320)))
  }
  const onTouchEnd = () => {
    if (dx > 90) onClose()
    setDx(0)
    setDragging(false)
  }

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <aside
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{ transform: `translateX(${dx}px)` }}
        className={cn(
          'drawer-enter absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-edge bg-surface shadow-2xl',
          !dragging && 'transition-transform duration-200 ease-out',
        )}
      >
        {children}
      </aside>
    </div>
  )
}

function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-red-500/30 bg-surface px-4 py-2.5 text-sm text-ink shadow-lg">
      <span className="text-red-500">{message}</span>
      <button onClick={onDismiss} className="text-sub hover:text-ink" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}