import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { Check, Copy } from 'lucide-react'
import { copyText } from '../lib/clipboard'
import 'katex/dist/katex.min.css'

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLPreElement>(null)

  const onCopy = async () => {
    const text = ref.current?.textContent ?? ''
    if (!text.trim()) return
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="group/pre relative my-[1em]">
      <button
        onClick={onCopy}
        aria-label="Kodu kopyala"
        title="Kodu kopyala"
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-edge bg-surface text-sub opacity-100 shadow-sm transition-opacity hover:text-ink md:opacity-0 md:group-hover/pre:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre ref={ref} style={{ margin: 0, paddingRight: '2.75rem' }}>
        {children}
      </pre>
    </div>
  )
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeKatex, { throwOnError: false, strict: false }],
          [rehypeHighlight, { detect: true, plainText: ['text', 'txt', 'plain'] }],
        ]}
        components={{
          pre: CodeBlock,
          a: ({ children: linkChildren, node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer">
              {linkChildren}
            </a>
          ),
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}
