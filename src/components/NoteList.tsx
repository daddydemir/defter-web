import { useEffect, useRef, useState } from 'react'
import type { Folder, Note } from '../types'
import { cn, excerpt, timeAgo } from '../lib/format'
import { FilePlus2, Filter, FolderInput, FolderOpen, Menu, Pin, Search, UserRound, X } from 'lucide-react'
import { FolderPicker } from './FolderPicker'

interface NoteListProps {
  notes: Note[]
  selectedId: string | null
  search: string
  onSearchChange: (value: string) => void
  hasFilters: boolean
  onClearFilters: () => void
  onSelect: (id: string) => void
  onNewNote: () => void
  onOpenSidebar: () => void
  onOpenFriends: () => void
  friendReqCount: number
  folders: Folder[]
  onMoveToFolder: (id: string, folderId: string | null) => void
}

export function NoteList(props: NoteListProps) {
  const {
    notes,
    selectedId,
    search,
    onSearchChange,
    hasFilters,
    onClearFilters,
    onSelect,
    onNewNote,
    onOpenSidebar,
    onOpenFriends,
    friendReqCount,
    folders,
    onMoveToFolder,
  } = props
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        onNewNote()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNewNote])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1.5 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={onOpenSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sub active:bg-surface2 hover:bg-surface2 hover:text-ink lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={onOpenFriends}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sub active:bg-surface2 hover:bg-surface2 hover:text-ink lg:hidden"
          aria-label="Arkadaşlar"
          title="Arkadaşlar"
        >
          <UserRound className="h-5 w-5" />
          {friendReqCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
              {friendReqCount}
            </span>
          )}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface px-2.5 py-2 ring-1 ring-edge focus-within:ring-accent">
          <Search className="h-4 w-4 shrink-0 text-sub" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes…"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-sub/60"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="text-sub hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="mx-3 mb-2 flex w-fit items-center gap-1.5 rounded-full bg-surface2 px-2.5 py-1 text-xs text-sub ring-1 ring-edge hover:text-ink"
        >
          <Filter className="h-3 w-3" />
          Filters active
          <X className="h-3 w-3" />
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-4">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <FilePlus2 className="h-8 w-8 text-sub/40" />
            <p className="text-sm text-sub">{search ? 'No notes match your search' : 'No notes here yet'}</p>
            {!search && (
              <button
                onClick={onNewNote}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                Create a note
              </button>
            )}
          </div>
        ) : (
          notes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              active={note.id === selectedId}
              folders={folders}
              onSelect={() => onSelect(note.id)}
              onMoveToFolder={onMoveToFolder}
            />
          ))
        )}
      </div>

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 lg:hidden">
        <button
          onClick={onNewNote}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-black/30 active:scale-95"
          aria-label="New note"
        >
          <FilePlus2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

function NoteListItem({
  note,
  active,
  folders,
  onSelect,
  onMoveToFolder,
}: {
  note: Note
  active: boolean
  folders: Folder[]
  onSelect: () => void
  onMoveToFolder: (id: string, folderId: string | null) => void
}) {
  const [moveOpen, setMoveOpen] = useState(false)

  return (
    <div
      className={cn(
        'group relative flex w-full items-center gap-1 border-b border-edge/70 px-4 py-3 transition-colors',
        active ? 'bg-surface2' : 'hover:bg-surface2/50',
      )}
    >
      <button onClick={onSelect} className="min-w-0 flex-1 select-none text-left">
        <div className="flex items-center gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-sm', active ? 'font-semibold text-ink' : 'font-medium text-ink')}>
            {note.title || 'Untitled'}
          </span>
          {note.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-current text-sub" />}
          {note.permission !== 'owner' && (
            <span
              className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent ring-1 ring-accent/20"
              title={note.permission === 'edit' ? 'Düzenleme izniyle paylaşıldı' : 'Görüntüleme izniyle paylaşıldı'}
            >
              {note.permission === 'edit' ? 'Paylaşılan' : 'Görüntülenen'}
            </span>
          )}
          <span className="shrink-0 text-[11px] tabular-nums text-sub">{timeAgo(note.updatedAt)}</span>
        </div>
        {note.content && <p className="truncate text-xs text-sub">{excerpt(note.content)}</p>}
        {(note.folderName || note.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1">
            {note.folderName && (
              <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-sub ring-1 ring-edge">
                {note.folderName}
              </span>
            )}
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-sub ring-1 ring-edge">
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </button>
      <button
        onClick={() => setMoveOpen(true)}
        className={cn(
          'shrink-0 rounded-lg p-2 text-sub opacity-0 transition-opacity hover:bg-surface2 hover:text-accent group-hover:opacity-100 max-md:opacity-100',
          note.folderName && 'opacity-100',
          note.permission !== 'owner' && 'hidden',
        )}
        aria-label="Move to folder"
        title="Move to folder"
      >
        {note.folderName ? <FolderOpen className="h-4 w-4" /> : <FolderInput className="h-4 w-4" />}
      </button>
      <FolderPicker
        open={moveOpen}
        currentFolderId={note.folderId}
        folders={folders}
        onSelect={(folderId) => onMoveToFolder(note.id, folderId)}
        onCancel={() => setMoveOpen(false)}
      />
    </div>
  )
}