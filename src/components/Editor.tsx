import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Folder, Note, Tag } from '../types'
import { cn } from '../lib/format'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Folder as FolderIcon,
  Pin,
  Printer,
  Share2,
  SplitSquareHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { Markdown } from './Markdown'
import { ConfirmDialog } from './ConfirmDialog'
import { RichEditor } from './RichEditor'
import { ShareDialog } from './ShareDialog'

type Mode = 'edit' | 'split' | 'preview'

// Otomatik kaydetme zamanlaması:
// - SAVE_IDLE_MS: kullanıcı yazmayı bıraktıktan sonra beklenen süre
// - SAVE_MAX_WAIT_MS: kesintisiz yazmada güvenlik üst sınırı (normal yazım temposunda
//   hiç devreye girmez; yalnızca dakikalarca duraksız yazışta bir kez tetiklenir)
const SAVE_IDLE_MS = 2000
const SAVE_MAX_WAIT_MS = 30000

interface EditorProps {
  note: Note
  folders: Folder[]
  tags: Tag[]
  onChange: (patch: Partial<Note>) => void
  onDelete: (note: Note) => void
  onBack: () => void
  onCreateTag: (name: string) => Promise<Tag>
  onShareTokenChange?: (token: string | null) => void
}

function defaultMode(note: Note): Mode {
  if (note.permission === 'view') return 'preview'
  const empty = note.title.trim() === '' && note.content.trim() === ''
  return empty ? 'edit' : 'preview'
}

function ModeButton({
  label,
  icon,
  active,
  onClick,
  className,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-surface text-ink shadow-sm' : 'text-sub hover:text-ink',
        className,
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function PreviewPane({ content }: { content: string }) {
  return (
    <div className="h-full overflow-y-auto px-5 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:py-6">
      <div className="mx-auto w-full max-w-[68rem]">
        {content.trim() ? (
          <Markdown>{content}</Markdown>
        ) : (
          <p className="text-sm text-sub/60">Önizleme için bir şey yazın...</p>
        )}
      </div>
    </div>
  )
}

function FolderSelect({
  folders,
  value,
  onChange,
}: {
  folders: Folder[]
  value: string | null
  onChange: (folderId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedFolder = folders.find((folder) => folder.id === value)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const select = (folderId: string | null) => {
    onChange(folderId)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-9 max-w-52 items-center gap-2 rounded-lg border bg-surface px-2.5 text-xs font-medium text-ink shadow-sm transition-colors hover:bg-surface2 focus:outline-none focus:ring-2 focus:ring-accent/25',
          open ? 'border-accent/60 bg-surface2' : 'border-edge',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Klasör seç"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
          <FolderIcon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate">{selectedFolder?.name ?? 'Klasör yok'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-sub transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="bubble-enter absolute left-0 top-full z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-edge bg-surface p-1.5 shadow-xl"
          role="listbox"
          aria-label="Klasör seç"
        >
          <button
            type="button"
            onClick={() => select(null)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-surface2',
              value === null ? 'font-medium text-accent' : 'text-ink',
            )}
            role="option"
            aria-selected={value === null}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface2 text-sub">
              <FolderIcon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate">Klasör yok</span>
            {value === null && <Check className="h-3.5 w-3.5 shrink-0" />}
          </button>
          {folders.length > 0 && <div className="my-1 border-t border-edge/70" />}
          <div className="max-h-56 overflow-y-auto">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => select(folder.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-surface2',
                  value === folder.id ? 'font-medium text-accent' : 'text-ink',
                )}
                role="option"
                aria-selected={value === folder.id}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <FolderIcon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                {value === folder.id && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Editor({ note, folders, tags, onChange, onDelete, onBack, onCreateTag, onShareTokenChange }: EditorProps) {
  const [draft, setDraft] = useState({ title: note.title, content: note.content })
  const [mode, setMode] = useState<Mode>(() => defaultMode(note))
  const [tagInput, setTagInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const readOnly = note.permission === 'view'
  const isOwner = note.permission === 'owner'

  useEffect(() => {
    setDraft({ title: note.title, content: note.content })
  }, [note.id])

  // Boş not açıldığında başlığa odaklan (mobilde hızlı not alma)
  useEffect(() => {
    if (readOnly) return
    if (note.title.trim() === '' && note.content.trim() === '') {
      const t = setTimeout(() => titleRef.current?.focus(), 300)
      return () => clearTimeout(t)
    }
  }, [note.id, readOnly])

  const dirty = draft.title !== note.title || draft.content !== note.content

  const draftRef = useRef(draft)
  draftRef.current = draft
  const noteRef = useRef(note)
  noteRef.current = note
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly
  const timersRef = useRef<{ idle: number | null; max: number | null }>({ idle: null, max: null })
  // En son Editor'den gönderilen içerik; prop gecikmesinden bağımsız olarak
  // aynı payload'un ikinci kez gönderilmesini engeller (duplicate istek koruması)
  const lastSentRef = useRef<{ title: string; content: string } | null>(null)

  const clearSaveTimers = useCallback(() => {
    const t = timersRef.current
    if (t.idle !== null) window.clearTimeout(t.idle)
    if (t.max !== null) window.clearTimeout(t.max)
    t.idle = null
    t.max = null
  }, [])

  // Bekleyen değişikliği hemen kaydet; sunucuda zaten kayıtlıysa ya da az önce
  // birebir aynı içerik gönderilmişse istek atma
  const flushPendingSave = useCallback(() => {
    clearSaveTimers()
    if (readOnlyRef.current) return
    const cur = draftRef.current
    const saved = noteRef.current
    if (cur.title === saved.title && cur.content === saved.content) return
    if (
      lastSentRef.current &&
      lastSentRef.current.title === cur.title &&
      lastSentRef.current.content === cur.content
    ) {
      return
    }
    lastSentRef.current = { title: cur.title, content: cur.content }
    onChangeRef.current({ title: cur.title, content: cur.content })
  }, [clearSaveTimers])

  useEffect(() => {
    if (readOnly || !dirty) return

    // Her tuş vuruşu boştaki kaydı öteler (debounce)...
    if (timersRef.current.idle !== null) window.clearTimeout(timersRef.current.idle)
    timersRef.current.idle = window.setTimeout(flushPendingSave, SAVE_IDLE_MS)

    // ...ama kesintisiz yazmada en fazla SAVE_MAX_WAIT_MS sonra bir kez daha kaydeder.
    if (timersRef.current.max === null) {
      timersRef.current.max = window.setTimeout(flushPendingSave, SAVE_MAX_WAIT_MS)
    }
  }, [draft.title, draft.content, note.title, note.content, dirty, readOnly, flushPendingSave])

  // Sekme arka plana geçince / kapanırken bekleyen değişiklikleri hemen kaydet
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPendingSave()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flushPendingSave)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', flushPendingSave)
      flushPendingSave()
    }
  }, [flushPendingSave])

  const addTag = async (raw: string) => {
    const name = raw.trim().replace(/^#/, '')
    setTagInput('')
    if (!name || note.tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) return
    let tag = tags.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (!tag) {
      try {
        tag = await onCreateTag(name)
      } catch {
        return
      }
    }
    onChange({ tags: [...note.tags, tag] })
  }

  const words = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0
  const chars = draft.content.length

  const printNote = useCallback(() => {
    flushPendingSave()
    const previousTitle = document.title
    const printTitle = draftRef.current.title.trim() || 'Başlıksız not'
    document.title = printTitle

    const restoreTitle = () => {
      document.title = previousTitle
      window.removeEventListener('afterprint', restoreTitle)
    }
    window.addEventListener('afterprint', restoreTitle)
    window.print()
  }, [flushPendingSave])

  return (
    <div className="editor-shell screen-enter-right flex h-full min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-1.5 border-b border-edge px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-3">
        <button
          onClick={onBack}
          className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sub active:bg-surface2 hover:bg-surface2 hover:text-ink sm:hidden"
          aria-label="Back to notes"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <input
          ref={titleRef}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Başlık"
          disabled={readOnly}
          className="min-h-10 min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-tight text-ink outline-none placeholder:text-sub/40 disabled:text-sub sm:text-2xl"
        />
        <div className="flex shrink-0 items-center gap-0.5 pt-0.5 sm:gap-1">
          {readOnly ? (
            <span className="mr-0.5 flex items-center gap-1.5 rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-medium text-sub ring-1 ring-edge">
              <Eye className="h-3 w-3" />
              Görüntüleme
            </span>
          ) : (
            <span
              className={cn(
                'mr-0.5 flex items-center gap-1.5 text-[11px] tabular-nums',
                dirty ? 'text-sub' : 'text-emerald-500',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', dirty ? 'animate-pulse bg-sub' : 'bg-emerald-500')} />
              <span className="hidden sm:inline">{dirty ? 'Kaydediliyor…' : 'Kaydedildi'}</span>
            </span>
          )}
          {isOwner && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sub transition-colors active:bg-surface2 hover:bg-surface2 hover:text-ink"
              aria-label="Paylaş"
              title="Paylaş"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          {!isOwner && note.sharedByUsername && (
            <span
              className="mr-0.5 hidden items-center gap-1 text-[11px] text-sub sm:flex"
              title={`Sahibi: ${note.sharedByUsername}`}
            >
              {note.permission === 'edit' ? 'Düzenle' : 'Görüntüle'} · {note.sharedByUsername}
            </span>
          )}
          <button
            onClick={printNote}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-sub transition-colors active:bg-surface2 hover:bg-surface2 hover:text-ink"
            aria-label="PDF olarak yazdır"
            title="PDF olarak yazdır"
          >
            <Printer className="h-4 w-4" />
          </button>
          {isOwner && (
            <button
              onClick={() => onChange({ isPinned: !note.isPinned })}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors active:bg-surface2 hover:bg-surface2',
                note.isPinned ? 'text-accent' : 'text-sub hover:text-ink',
              )}
              aria-label={note.isPinned ? 'İğne kaldır' : 'İğnele'}
              title={note.isPinned ? 'İğne kaldır' : 'İğnele'}
            >
              <Pin className={cn('h-4 w-4', note.isPinned && 'fill-current')} />
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sub transition-colors active:bg-surface2 hover:bg-surface2 hover:text-red-500"
              aria-label="Sil"
              title="Sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {isOwner && (
        <div className="flex flex-wrap items-center gap-2 border-b border-edge/60 px-3 py-2 sm:px-6">
        <FolderSelect
          folders={folders}
          value={note.folderId}
          onChange={(folderId) => onChange({ folderId })}
        />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag.id}
              className="flex items-center gap-1 rounded-full bg-surface2 px-2 py-1 text-xs text-sub ring-1 ring-edge"
            >
              #{tag.name}
              <button
                onClick={() => onChange({ tags: note.tags.filter((t) => t.id !== tag.id) })}
                className="text-sub/60 hover:text-ink"
                aria-label={`Etiket kaldır ${tag.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(tagInput)
              }
            }}
            onBlur={() => tagInput && addTag(tagInput)}
            placeholder="Etiket ekle…"
            className="w-24 min-w-0 flex-1 basis-24 bg-transparent text-xs text-ink outline-none placeholder:text-sub/50"
          />
        </div>
      </div>
      )}

      <div className="min-h-0 flex-1">
        {mode === 'edit' && (
          <RichEditor
            value={draft.content}
            onChange={(md) => setDraft((d) => ({ ...d, content: md }))}
            editable={!readOnly}
            collabNoteId={note.id}
          />
        )}
        {mode === 'preview' && <PreviewPane content={draft.content} />}
        {mode === 'split' && (
          <div className="grid h-full grid-cols-2 divide-x divide-edge">
            <RichEditor
              value={draft.content}
              onChange={(md) => setDraft((d) => ({ ...d, content: md }))}
              editable={!readOnly}
              collabNoteId={note.id}
            />
            <PreviewPane content={draft.content} />
          </div>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-edge/60 px-3 py-1.5 sm:px-4">
        <span className="whitespace-nowrap text-[11px] tabular-nums text-sub/70">
          {words} kelime · {chars} karakter
        </span>
        <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-surface2 p-0.5 ring-1 ring-edge">
          <ModeButton
            label="Düzenle"
            icon={<span className="text-[10px] font-semibold">Aa</span>}
            active={mode === 'edit'}
            onClick={() => setMode('edit')}
          />
          <ModeButton
            label="Bölünmüş"
            icon={<SplitSquareHorizontal className="h-3.5 w-3.5" />}
            active={mode === 'split'}
            onClick={() => setMode('split')}
            className="hidden sm:inline-flex"
          />
          <ModeButton
            label="Önizleme"
            icon={<Eye className="h-3.5 w-3.5" />}
            active={mode === 'preview'}
            onClick={() => setMode('preview')}
          />
        </div>
      </footer>

      <article className="print-note" aria-hidden="true">
        <h1>{draft.title.trim() || 'Başlıksız not'}</h1>
        {draft.content.trim() ? <Markdown>{draft.content}</Markdown> : null}
      </article>

      <ConfirmDialog
        open={confirmDelete}
        title="Sil onaylı?"
        message={`Bu notu kalıcı olarak sileceksiniz. "${note.title || 'Başlıksız'}"`}
        onConfirm={() => {
          setConfirmDelete(false)
          onDelete(note)
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <ShareDialog
        open={shareOpen}
        noteId={note.id}
        shareToken={note.shareToken ?? null}
        onShareTokenChange={onShareTokenChange ?? (() => {})}
        onClose={() => setShareOpen(false)}
      />
    </div>
  )
}
