import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Folder } from '../types'
import { cn } from '../lib/format'
import { Check, Folder as FolderIcon, FolderOpen, X } from 'lucide-react'

interface FolderPickerProps {
  open: boolean
  currentFolderId: string | null
  folders: Folder[]
  onSelect: (folderId: string | null) => void
  onCancel: () => void
}

export function FolderPicker({ open, currentFolderId, folders, onSelect, onCancel }: FolderPickerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const pick = (folderId: string | null) => {
    onSelect(folderId)
    onCancel()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Move to folder"
    >
      <div className="dialog-backdrop-enter absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="dialog-enter relative flex max-h-[70vh] w-full max-w-sm flex-col rounded-2xl border border-edge bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Move to folder</h2>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sub hover:bg-surface2 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex min-h-0 flex-col gap-0.5 overflow-y-auto">
          <button
            onClick={() => pick(null)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm select-none',
              currentFolderId
                ? 'text-sub hover:bg-surface2 hover:text-ink'
                : 'bg-surface2 font-medium text-ink',
            )}
          >
            <FolderIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">No folder</span>
            {!currentFolderId && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" />}
          </button>
          {folders.map((folder) => {
            const isCurrent = folder.id === currentFolderId
            return (
              <button
                key={folder.id}
                onClick={() => pick(folder.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm select-none',
                  isCurrent
                    ? 'bg-surface2 font-medium text-ink'
                    : 'text-sub hover:bg-surface2 hover:text-ink',
                )}
              >
                {isCurrent ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-accent" />
                ) : (
                  <FolderIcon className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-[11px] tabular-nums text-sub/70">{folder.noteCount}</span>
                {isCurrent && <Check className="h-4 w-4 shrink-0 text-accent" />}
              </button>
            )
          })}
          {folders.length === 0 && (
            <p className="px-2.5 py-3 text-center text-xs text-sub/70">
              No folders yet — create one in the sidebar.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}