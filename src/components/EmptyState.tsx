import { BookOpen, Plus, SlidersHorizontal } from 'lucide-react'

export function EmptyState({
  onCreate,
  hasFilters,
  onClear,
}: {
  onCreate: () => void
  hasFilters: boolean
  onClear: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface ring-1 ring-edge">
        <BookOpen className="h-6 w-6 text-sub" />
      </div>
      <div>
        <p className="text-base font-semibold tracking-tight">Your notes, in one place</p>
        <p className="mx-auto mt-1.5 max-w-60 text-sm leading-6 text-sub">
          {hasFilters ? 'No notes match the current filters.' : 'Select a note from the list, or create a new one.'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New note
        </button>
        {hasFilters && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-lg bg-surface2 px-3.5 py-2 text-sm font-medium text-ink ring-1 ring-edge transition-colors hover:bg-surface"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}