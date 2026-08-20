import { useState } from 'react'
import type { Folder, Tag, View } from '../types'
import { cn } from '../lib/format'
import { ConfirmDialog } from './ConfirmDialog'
import { Logo } from './Logo'
import {
  Check,
  ChevronRight,
  FilePlus2,
  Folder as FolderIcon,
  FolderOpen,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Settings,
  Sun,
  Tag as TagIcon,
  Trash2,
  UserRound,
  ShieldCheck,
  X,
} from 'lucide-react'

interface SidebarProps {
  folders: Folder[]
  tags: Tag[]
  noteCount: number
  view: View
  activeFolder: string | null
  activeTag: string | null
  theme: 'dark' | 'light'
  userName?: string
  userEmail?: string
  onSelectView: (view: View) => void
  onSelectFolder: (id: string | null) => void
  onSelectTag: (id: string | null) => void
  onNewNote: () => void
  onCreateFolder: (name: string) => Promise<Folder>
  onRenameFolder: (id: string, name: string) => Promise<void>
  onDeleteFolder: (id: string) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag>
  onDeleteTag: (id: string) => Promise<void>
  onToggleTheme: () => void
  onLogout?: () => void
  onNavigate: () => void
  onOpenFriends: () => void
  friendReqCount?: number
  onOpenAdmin?: () => void
  onOpenSettings?: () => void
  isAdmin?: boolean
}

export function Sidebar(props: SidebarProps) {
  const {
    folders,
    tags,
    noteCount,
    view,
    activeFolder,
    activeTag,
    theme,
    userName,
    userEmail,
    onSelectView,
    onSelectFolder,
    onSelectTag,
    onNewNote,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    onCreateTag,
    onDeleteTag,
    onToggleTheme,
    onLogout,
    onNavigate,
    onOpenFriends,
    friendReqCount,
    onOpenAdmin,
    onOpenSettings,
    isAdmin,
  } = props

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <Logo className="h-8 w-8" />
        <span className="text-[15px] font-semibold tracking-tight">Notes</span>
        <button
          onClick={onToggleTheme}
          className="ml-auto rounded-lg p-2 text-sub transition-colors hover:bg-surface2 hover:text-ink"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-3 pb-3 pt-2">
        <button
          onClick={onNewNote}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New note
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        <NavItem
          icon={<FilePlus2 className="h-4 w-4" />}
          label="All notes"
          count={noteCount}
          active={view === 'all' && !activeFolder && !activeTag}
          onClick={() => {
            onSelectView('all')
            onSelectFolder(null)
            onSelectTag(null)
            onNavigate()
          }}
        />
        <NavItem
          icon={<ChevronRight className="h-4 w-4" />}
          label="Pinned"
          active={view === 'pinned'}
          onClick={() => {
            onSelectView(view === 'pinned' ? 'all' : 'pinned')
            onNavigate()
          }}
        />
        <NavItem
          icon={<UserRound className="h-4 w-4" />}
          label="Arkadaşlar"
          active={false}
          badge={friendReqCount}
          onClick={onOpenFriends}
        />
        {isAdmin && (
          <NavItem
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Yönetim"
            active={false}
            onClick={() => onOpenAdmin?.()}
          />
        )}

        <SectionLabel label="Folders" />
        {folders.map((folder) => (
          <FolderRow
            key={folder.id}
            folder={folder}
            active={activeFolder === folder.id}
            onSelect={() => {
              onSelectFolder(activeFolder === folder.id ? null : folder.id)
              onSelectView('all')
              onNavigate()
            }}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
          />
        ))}
        <InlineCreate
          placeholder="New folder"
          onSubmit={onCreateFolder}
          icon={<FolderIcon className="h-4 w-4" />}
        />

        <SectionLabel label="Tags" />
        {tags.map((tag) => (
          <TagRow
            key={tag.id}
            tag={tag}
            active={activeTag === tag.id}
            onSelect={() => {
              onSelectTag(activeTag === tag.id ? null : tag.id)
              onSelectView('all')
              onNavigate()
            }}
            onDelete={onDeleteTag}
          />
        ))}
        <InlineCreate placeholder="New tag" onSubmit={onCreateTag} icon={<TagIcon className="h-4 w-4" />} />
      </nav>

      <div className="border-t border-edge px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 text-[11px] text-sub">{noteCount} notes</div>
      {(userName || userEmail) && (
        <div className="flex items-center gap-2 border-t border-edge px-4 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
            {(userName ?? userEmail ?? '').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            {userName && <div className="truncate text-xs font-medium text-ink">{userName}</div>}
            {userEmail && <div className="truncate text-[10px] text-sub/70">{userEmail}</div>}
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
              aria-label="Ayarlar"
              title="Ayarlar"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sub transition-colors hover:bg-surface2 hover:text-ink"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function NavItem({
  icon,
  label,
  count,
  badge,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  badge?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors select-none',
        active ? 'bg-surface2 font-medium text-ink' : 'text-sub hover:bg-surface2/60 hover:text-ink',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-surface2 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-sub">
          {count}
        </span>
      )}
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold tabular-nums text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-2.5 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-sub/70">
      {label}
    </div>
  )
}

function FolderRow({
  folder,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: Folder
  active: boolean
  onSelect: () => void
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(folder.name)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onRename(folder.id, value.trim() || folder.name).then(() => setEditing(false))
        }}
        className="flex items-center gap-1 px-1.5 py-1"
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          className="w-full rounded-md border border-accent bg-surface2 px-2 py-1.5 text-sm text-ink outline-none"
        />
        <button type="submit" onMouseDown={(e) => e.preventDefault()} className="rounded p-1 text-sub hover:text-ink" aria-label="Save">
          <Check className="h-3.5 w-3.5" />
        </button>
      </form>
    )
  }

  return (
    <div
      className={cn(
        'group flex items-center rounded-lg transition-colors',
        active ? 'bg-surface2' : 'hover:bg-surface2/60',
      )}
    >
      <button
        onClick={onSelect}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-sm select-none',
          active ? 'font-medium text-ink' : 'text-sub hover:text-ink',
        )}
      >
        {active ? <FolderOpen className="h-4 w-4 shrink-0" /> : <FolderIcon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto text-[11px] tabular-nums text-sub/70">{folder.noteCount}</span>
      </button>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
        <button
          onClick={() => {
            setValue(folder.name)
            setEditing(true)
          }}
          className="rounded p-1.5 text-sub hover:text-ink"
          aria-label="Rename folder"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          className="rounded p-1.5 text-sub hover:text-red-500"
          aria-label="Delete folder"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete folder?"
        message={`Delete folder "${folder.name}"? Notes inside will be kept.`}
        onConfirm={() => {
          setConfirmOpen(false)
          onDelete(folder.id)
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

function TagRow({
  tag,
  active,
  onSelect,
  onDelete,
}: {
  tag: Tag
  active: boolean
  onSelect: () => void
  onDelete: (id: string) => Promise<void>
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div
      className={cn(
        'group flex items-center rounded-lg transition-colors',
        active ? 'bg-surface2' : 'hover:bg-surface2/60',
      )}
    >
      <button
        onClick={onSelect}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-sm select-none',
          active ? 'font-medium text-ink' : 'text-sub hover:text-ink',
        )}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
          style={{ opacity: active ? 1 : 0.6 }}
        />
        <span className="truncate">#{tag.name}</span>
      </button>
      <button
        onClick={() => setConfirmOpen(true)}
        className="mr-1 rounded p-1.5 text-sub opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 max-md:opacity-100"
        aria-label="Delete tag"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete tag?"
        message={`Delete tag "#${tag.name}"? It will be removed from notes.`}
        onConfirm={() => {
          setConfirmOpen(false)
          onDelete(tag.id)
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

function InlineCreate({
  placeholder,
  onSubmit,
  icon,
}: {
  placeholder: string
  onSubmit: (name: string) => Promise<unknown>
  icon: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (open) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const name = value.trim()
          if (!name) {
            setOpen(false)
            return
          }
          setError(null)
          try {
            await onSubmit(name)
            setValue('')
            setOpen(false)
          } catch (err) {
            setError((err as Error).message || 'Failed to create')
          }
        }}
        className="flex items-center gap-1 px-1.5 py-1"
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder={placeholder}
          className="w-full rounded-md border border-edge bg-surface2 px-2 py-1.5 text-sm text-ink outline-none placeholder:text-sub/50 focus:border-accent"
        />
        <button type="submit" onMouseDown={(e) => e.preventDefault()} className="rounded p-1 text-sub hover:text-ink" aria-label="Create">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 text-sub hover:text-ink"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        {error && <span className="ml-1 text-[11px] text-red-500">{error}</span>}
      </form>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-sub/80 opacity-70 transition-all hover:bg-surface2/60 hover:text-ink hover:opacity-100"
    >
      {icon}
      <span>{placeholder}</span>
    </button>
  )
}