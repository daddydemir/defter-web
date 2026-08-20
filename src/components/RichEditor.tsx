import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { prosemirrorToYXmlFragment } from 'y-prosemirror'
import { Markdown } from 'tiptap-markdown'
import type { MarkdownSerializerState } from 'prosemirror-markdown'
import type { Node as ProseMirrorNode } from 'prosemirror-model'
import { cn } from '../lib/format'
import { getStoredUser, getToken } from '../lib/auth'
import { ImageDialog } from './ImageDialog'
import { LinkDialog } from './LinkDialog'
import {
  Bold,
  Check,
  Code,
  Copy,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  SquareCode,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { copyText } from '../lib/clipboard'

const lowlight = createLowlight(common)
const CODE_LANGUAGES = lowlight.listLanguages().sort()

interface SlashItem {
  title: string
  hint: string
  keywords: string[]
  icon: ReactNode
  run: (editor: Editor) => void
}

let openImageDialog: (() => void) | null = null
let openLinkDialog: (() => void) | null = null

const CARET_COLORS = [
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#06b6d4',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#84cc16',
]

function caretColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return CARET_COLORS[h % CARET_COLORS.length]
}

function mdOf(editor: Editor): string {
  return (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown()
}

function escAttr(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const ResizableImage = Image.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: ProseMirrorNode) {
          const { src, alt, title, width, height } = node.attrs as Record<string, unknown>
          if (width || height) {
            const w = width ? ` width="${escAttr(width as number)}"` : ''
            const h = height ? ` height="${escAttr(height as number)}"` : ''
            const a = alt ? ` alt="${escAttr(alt as string)}"` : ''
            const t = title ? ` title="${escAttr(title as string)}"` : ''
            state.write(`<img src="${escAttr(src as string)}"${a}${t}${w}${h}>`)
          } else {
            state.write(
              `![${state.esc(String(alt ?? ''))}](${state.esc(String(src ?? ''))}${
                title ? ` "${state.esc(String(title))}"` : ''
              })`,
            )
          }
          if (node.isBlock) state.closeBlock(node)
        },
        parse: {},
      },
    }
  },
})

const SLASH_ITEMS: SlashItem[] = [
  {
    title: 'Paragraf',
    hint: 'Düz metin',
    keywords: ['paragraf', 'metin', 'text'],
    icon: <Pilcrow className="h-4 w-4" />,
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    title: 'Başlık 1',
    hint: 'Büyük başlık',
    keywords: ['baslik', 'h1', 'heading'],
    icon: <Heading1 className="h-4 w-4" />,
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Başlık 2',
    hint: 'Orta başlık',
    keywords: ['baslik', 'h2', 'heading'],
    icon: <Heading2 className="h-4 w-4" />,
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Başlık 3',
    hint: 'Alt başlık',
    keywords: ['baslik', 'h3', 'heading'],
    icon: <Heading3 className="h-4 w-4" />,
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Madde listesi',
    hint: 'Maddeli liste',
    keywords: ['madde', 'liste', 'bullet', 'list'],
    icon: <List className="h-4 w-4" />,
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numaralı liste',
    hint: 'Numaralı liste',
    keywords: ['numarali', 'liste', 'ordered', 'list'],
    icon: <ListOrdered className="h-4 w-4" />,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Görev listesi',
    hint: 'İşaretli görev listesi',
    keywords: ['gorev', 'yapilacak', 'todo', 'task', 'checkbox'],
    icon: <ListChecks className="h-4 w-4" />,
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Alıntı',
    hint: 'Blok alıntı',
    keywords: ['alinti', 'quote', 'blockquote'],
    icon: <Quote className="h-4 w-4" />,
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Kod bloğu',
    hint: 'Kod parçacığı',
    keywords: ['kod', 'code', 'block', 'snippet'],
    icon: <SquareCode className="h-4 w-4" />,
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Yatay çizgi',
    hint: 'Bölüm ayracı',
    keywords: ['cizgi', 'ayrac', 'hr', 'divider', 'line'],
    icon: <Minus className="h-4 w-4" />,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Bağlantı',
    hint: 'Seçili metne link ekle',
    keywords: ['baglanti', 'link', 'url', 'href'],
    icon: <Link2 className="h-4 w-4" />,
    run: () => openLinkDialog?.(),
  },
  {
    title: 'Görsel',
    hint: 'Resim ekle',
    keywords: ['gorsel', 'resim', 'image', 'img', 'foto'],
    icon: <ImageIcon className="h-4 w-4" />,
    run: () => openImageDialog?.(),
  },
]

function BubbleButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        active ? 'bg-surface2 text-ink' : 'text-sub hover:bg-surface2 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-surface2 text-ink' : 'text-sub active:bg-surface2 active:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function baseExtensions(collab: boolean) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
      underline: false,
      codeBlock: false,
      ...(collab ? { undoRedo: false } : {}),
    }),
    CodeBlockLowlight.configure({ lowlight, languageClassPrefix: 'language-' }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
    TaskList,
    TaskItem.configure({ nested: true }),
    ResizableImage.configure({ resize: { enabled: true, alwaysPreserveAspectRatio: true } }),
    Placeholder.configure({ placeholder: 'Notunuzu yazmaya başlayın…' }),
    Markdown.configure({ html: true }),
  ]
}

function RichEditorInner({
  value,
  onChange,
  editable,
  collabNoteId,
}: {
  value: string
  onChange: (md: string) => void
  editable?: boolean
  collabNoteId?: string | null
}) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [slash, setSlash] = useState<{ text: string; x: number; y: number; top: number } | null>(null)
  const [slashPos, setSlashPos] = useState<{ x: number; y: number } | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkInitialUrl, setLinkInitialUrl] = useState('')
  const [linkCanRemove, setLinkCanRemove] = useState(false)
  const [codeLangPos, setCodeLangPos] = useState<{ x: number; y: number } | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [, setTick] = useState(0)
  const slashMenuRef = useRef<HTMLDivElement | null>(null)
  const codeLangMenuRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef(value)
  contentRef.current = value
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const slashRef = useRef(slash)
  slashRef.current = slash
  const codeLangRef = useRef(codeLangPos)
  codeLangRef.current = codeLangPos
  const editorRef = useRef<Editor | null>(null)
  editorRef.current = editor
  const canEdit = editable ?? true
  const collabMode = collabNoteId != null && collabNoteId.length > 0
  openImageDialog = () => setImageDialogOpen(true)
  openLinkDialog = () => {
    setLinkInitialUrl('')
    setLinkCanRemove(false)
    setLinkDialogOpen(true)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateSlash = (ed: Editor) => {
      const { state } = ed
      const { from, empty } = state.selection
      if (!empty) {
        setSlash(null)
        return
      }
      const $from = state.selection.$from
      const textBefore = state.doc.textBetween($from.start(), from, '\n')
      const m = /^\/[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]*$/.exec(textBefore)
      if (!m) {
        setSlash(null)
        return
      }
      const coords = ed.view.coordsAtPos(from)
      const width = Math.min(280, window.innerWidth - 16)
      const x = Math.max(8, Math.min(coords.left, window.innerWidth - width - 8))
      setSlashIndex(0)
      setSlash({ text: m[0].slice(1), x, y: coords.bottom + 6, top: coords.top })
    }

    const updateCodeLang = (ed: Editor) => {
      if (!ed.isActive('codeBlock') || typeof window === 'undefined') {
        setCodeLangPos(null)
        return
      }
      const coords = ed.view.coordsAtPos(ed.state.selection.from)
      const width = 180
      const height = 42
      const x = Math.max(8, Math.min(coords.left, window.innerWidth - width - 8))
      let y = coords.top - height
      if (y < 8) y = coords.bottom + 6
      setCodeLangPos({ x, y })
    }

    const editorProps = {
      attributes: {
        class: 'tiptap mx-auto min-h-full w-full max-w-[46rem] px-5 py-6 md:px-8 md:py-8',
      },
      handleKeyDown(_view: unknown, event: KeyboardEvent) {
        const s = slashRef.current
        if (event.key === 'Escape' && (s || codeLangRef.current)) {
          setSlash(null)
          setCodeLangPos(null)
          return true
        }
        if (!s) return false
        const items = SLASH_ITEMS.filter((i) =>
          (i.title + ' ' + i.keywords.join(' ')).toLowerCase().includes(s.text.toLowerCase()),
        )
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSlashIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)))
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSlashIndex((i) => Math.max(i - 1, 0))
          return true
        }
        if (event.key === 'Enter') {
          if (items.length > 0) {
            event.preventDefault()
            runItem(items[Math.min(slashIndex, items.length - 1)], editorRef.current!)
            return true
          }
          setSlash(null)
          return false
        }
        return false
      },
    }

    let ydoc: Y.Doc | null = null
    let provider: WebsocketProvider | null = null
    let ed: Editor

    if (collabMode) {
      ydoc = new Y.Doc()
      const fragment = ydoc.getXmlFragment('default')
      const token = getToken() ?? ''
      const user = getStoredUser()
      provider = new WebsocketProvider('/api/collab', collabNoteId!, ydoc, {
        params: { token, note: collabNoteId! },
        connect: false,
      })

      let seeded = false
      const trySeed = () => {
        if (seeded || fragment.length > 0) return
        seeded = true
        const md = contentRef.current
        if (!md.trim()) return
        const temp = new Editor({ extensions: baseExtensions(true), content: md })
        try {
          prosemirrorToYXmlFragment(temp.state.doc, fragment)
        } finally {
          temp.destroy()
        }
      }
      provider.on('sync', (isSynced: boolean) => {
        if (isSynced) trySeed()
      })

      ed = new Editor({
        editable: canEdit,
        extensions: [
          ...baseExtensions(true),
          Collaboration.configure({ document: ydoc }),
          CollaborationCaret.configure({
            provider,
            user: { name: user?.username ?? 'Misafir', color: caretColor(user?.id ?? 'anon') },
          }),
        ],
        editorProps,
        onUpdate: ({ editor }) => {
          if (canEdit) onChangeRef.current(mdOf(editor))
          updateSlash(editor)
          updateCodeLang(editor)
          setTick((t) => t + 1)
        },
        onSelectionUpdate: ({ editor }) => {
          updateSlash(editor)
          updateCodeLang(editor)
          setTick((t) => t + 1)
        },
      })

      setEditor(ed)
      provider.connect()
    } else {
      ed = new Editor({
        extensions: baseExtensions(false),
        content: contentRef.current,
        editorProps,
        onUpdate: ({ editor }) => {
          onChangeRef.current(mdOf(editor))
          updateSlash(editor)
          updateCodeLang(editor)
          setTick((t) => t + 1)
        },
        onSelectionUpdate: ({ editor }) => {
          updateSlash(editor)
          updateCodeLang(editor)
          setTick((t) => t + 1)
        },
      })

      setEditor(ed)
    }

    return () => {
      provider?.destroy()
      ed.destroy()
      ydoc?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabMode])

  const runItem = (item: SlashItem, ed: Editor) => {
    const { state } = ed
    const { from } = state.selection
    const len = state.doc.textBetween(state.selection.$from.start(), from, '\n').length
    ed.chain().focus().deleteRange({ from: from - len, to: from }).run()
    item.run(ed)
    setSlash(null)
  }

  useEffect(() => {
    if (!editor || typeof window === 'undefined') return
    if (collabMode) return
    const current = mdOf(editor)
    if (current !== value) {
      editor.commands.setContent(value)
    }
  }, [editor, value, collabMode])

  useEffect(() => {
    if (!codeLangPos || typeof window === 'undefined') return
    const onDown = (e: MouseEvent) => {
      if (codeLangMenuRef.current && !codeLangMenuRef.current.contains(e.target as Node)) {
        setCodeLangPos(null)
      }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [codeLangPos])

  useEffect(() => {
    if (!codeLangPos) setCodeCopied(false)
  }, [codeLangPos])

  const filtered = slash
    ? SLASH_ITEMS.filter((i) =>
        (i.title + ' ' + i.keywords.join(' ')).toLowerCase().includes(slash.text.toLowerCase()),
      )
    : []

  useLayoutEffect(() => {
    const el = slashMenuRef.current
    if (!slash || !el) {
      setSlashPos(null)
      return
    }
    const w = el.offsetWidth
    const h = el.offsetHeight
    let y = slash.y
    if (y + h + 8 > window.innerHeight) {
      y = Math.max(8, slash.top - h - 6)
    }
    const x = Math.max(8, Math.min(slash.x, window.innerWidth - w - 8))
    setSlashPos({ x, y })
  }, [slash, filtered.length])

  if (!editor) return null

  return (
    <div className="h-full overflow-y-auto">
      {canEdit && (
        <div className="no-scrollbar sticky top-0 z-10 flex items-center gap-0.5 overflow-x-auto border-b border-edge/60 bg-base/95 px-2 py-1.5 backdrop-blur lg:hidden">
          <ToolbarBtn title="Kalın" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="İtalik" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Altı çizili" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Üstü çizili" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Satır içi kod" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code className="h-4 w-4" />
          </ToolbarBtn>
          <span className="mx-0.5 h-5 w-px shrink-0 bg-edge" />
          <ToolbarBtn title="Başlık 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <span className="text-[11px] font-bold">H1</span>
          </ToolbarBtn>
          <ToolbarBtn title="Başlık 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <span className="text-[11px] font-bold">H2</span>
          </ToolbarBtn>
          <ToolbarBtn title="Başlık 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <span className="text-[11px] font-bold">H3</span>
          </ToolbarBtn>
          <span className="mx-0.5 h-5 w-px shrink-0 bg-edge" />
          <ToolbarBtn title="Madde listesi" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Numaralı liste" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Görev listesi" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <ListChecks className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Alıntı" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Kod bloğu" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <SquareCode className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Bağlantı"
            active={editor.isActive('link')}
            onClick={() => {
              setLinkInitialUrl(String(editor.getAttributes('link').href ?? ''))
              setLinkCanRemove(editor.isActive('link'))
              setLinkDialogOpen(true)
            }}
          >
            <Link2 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Görsel" active={false} onClick={() => setImageDialogOpen(true)}>
            <ImageIcon className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Yatay çizgi" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="h-4 w-4" />
          </ToolbarBtn>
        </div>
      )}
      <EditorContent editor={editor} />

      {slash && filtered.length > 0 && (
        <div
          ref={slashMenuRef}
          onMouseDown={(e) => e.preventDefault()}
          className="bubble-enter fixed z-50 w-64 max-h-[min(60vh,24rem)] overflow-hidden overflow-y-auto rounded-xl border border-edge bg-surface shadow-xl"
          style={{ top: slashPos?.y ?? slash.y, left: slashPos?.x ?? slash.x }}
          role="menu"
          aria-label="Slash komutları"
        >
          {filtered.map((item, i) => (
            <button
              key={item.title}
              onMouseEnter={() => setSlashIndex(i)}
              onClick={() => runItem(item, editor)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                i === slashIndex ? 'bg-surface2' : 'hover:bg-surface2',
              )}
              role="menuitem"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface text-sub">
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{item.title}</span>
                <span className="block truncate text-[11px] text-sub">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <BubbleMenu
        editor={editor}
        options={{ placement: 'top', offset: 8 }}
        shouldShow={({ editor }) =>
          canEdit && editor.isEditable && !editor.state.selection.empty && !editor.isActive('codeBlock')
        }
      >
        <div className="flex items-center gap-0.5 rounded-xl border border-edge bg-surface p-1 shadow-xl">
          <BubbleButton
            title="Kalın"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </BubbleButton>
          <BubbleButton
            title="İtalik"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </BubbleButton>
          <BubbleButton
            title="Altı çizili"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </BubbleButton>
          <BubbleButton
            title="Üstü çizili"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </BubbleButton>
          <BubbleButton
            title="Kod"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code className="h-4 w-4" />
          </BubbleButton>
          <BubbleButton
            title="Bağlantı"
            active={editor.isActive('link')}
            onClick={() => {
              setLinkInitialUrl(String(editor.getAttributes('link').href ?? ''))
              setLinkCanRemove(editor.isActive('link'))
              setLinkDialogOpen(true)
            }}
          >
            <Link2 className="h-4 w-4" />
          </BubbleButton>
        </div>
      </BubbleMenu>

      {codeLangPos && (
        <div
          ref={codeLangMenuRef}
          className="code-lang-menu fixed z-50 flex items-center gap-1.5 rounded-xl border border-edge bg-surface p-1.5 shadow-xl"
          style={{ left: codeLangPos.x, top: codeLangPos.y, width: 180 }}
        >
          <span className="shrink-0 pl-1.5 text-[11px] font-medium text-sub">Dil</span>
          <select
            value={editor.getAttributes('codeBlock').language ?? ''}
            onChange={(e) => {
              const lang = e.target.value || null
              editor.chain().focus().updateAttributes('codeBlock', { language: lang }).run()
            }}
            className="min-w-0 flex-1 rounded-md border border-edge bg-surface2 px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
          >
            <option value="">Otomatik / yok</option>
            {CODE_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              const { $from } = editor.state.selection
              const node = $from.parent
              if (node.type.name !== 'codeBlock') return
              if (await copyText(node.textContent)) {
                setCodeCopied(true)
                setTimeout(() => setCodeCopied(false), 1500)
              }
            }}
            aria-label="Kodu kopyala"
            title="Kodu kopyala"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sub transition-colors hover:bg-surface2 hover:text-ink"
          >
            {codeCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      <ImageDialog
        open={imageDialogOpen}
        onInsert={({ src, alt, width }) => {
          setImageDialogOpen(false)
          editorRef.current?.chain().focus().setImage({ src, alt: alt || undefined, width }).run()
        }}
        onCancel={() => setImageDialogOpen(false)}
      />

      <LinkDialog
        open={linkDialogOpen}
        initialUrl={linkInitialUrl}
        canRemove={linkCanRemove}
        onApply={(url, text) => {
          setLinkDialogOpen(false)
          const ed = editorRef.current
          if (!ed) return
          const href = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) ? url : `https://${url}`
          if (text) {
            ed.chain()
              .focus()
              .insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] })
              .run()
          } else if (!ed.state.selection.empty) {
            ed.chain().focus().extendMarkRange('link').setLink({ href }).run()
          } else {
            ed.chain().focus().setLink({ href }).run()
          }
        }}
        onRemove={() => {
          setLinkDialogOpen(false)
          editorRef.current?.chain().focus().extendMarkRange('link').unsetLink().run()
        }}
        onCancel={() => setLinkDialogOpen(false)}
      />
    </div>
  )
}

export function RichEditor({
  value,
  onChange,
  editable,
  collabNoteId,
}: {
  value: string
  onChange: (md: string) => void
  editable?: boolean
  collabNoteId?: string | null
}) {
  return <RichEditorInner value={value} onChange={onChange} editable={editable} collabNoteId={collabNoteId} />
}