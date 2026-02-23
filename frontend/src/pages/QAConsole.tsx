import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import { Send, Bot, User, Loader2, SquarePen } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
  streaming?: boolean
}

type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'done'; toolsUsed: string[] }
  | { type: 'error'; message: string }

const SUGGESTIONS = [
  'What is my net worth?',
  'How much did I spend on groceries last month?',
  'What are my biggest spending categories this year?',
  'How are my savings goals progressing?',
  'What is my savings rate this month?',
]

export function QAConsole() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID())
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(async (question: string) => {
    if (!question.trim() || isStreaming) return

    setMessages(prev => [
      ...prev,
      { role: 'user', content: question.trim() },
      { role: 'assistant', content: '', toolsUsed: [], streaming: true },
    ])
    setInput('')
    setIsStreaming(true)

    const ac = new AbortController()
    abortRef.current = ac

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), conversationId }),
        signal: ac.signal,
      })

      if (!response.ok || !response.body) throw new Error('Request failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const block of parts) {
          for (const line of block.split('\n')) {
            if (!line.startsWith('data: ')) continue
            try {
              const event: StreamEvent = JSON.parse(line.slice(6))
              handleEvent(event)
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (!last || last.role !== 'assistant') return prev
          return [
            ...prev.slice(0, -1),
            { ...last, content: 'Sorry, something went wrong. Please try again.', streaming: false },
          ]
        })
      }
    } finally {
      setIsStreaming(false)
      setMessages(prev =>
        prev.map(m => (m.streaming ? { ...m, streaming: false } : m))
      )
      abortRef.current = null
    }
  }, [isStreaming])

  function handleEvent(event: StreamEvent) {
    switch (event.type) {
      case 'text':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (!last || last.role !== 'assistant') return prev
          return [...prev.slice(0, -1), { ...last, content: last.content + event.text }]
        })
        break
      case 'tool':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (!last || last.role !== 'assistant') return prev
          return [...prev.slice(0, -1), { ...last, toolsUsed: [...(last.toolsUsed ?? []), event.name] }]
        })
        break
      case 'done':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (!last || last.role !== 'assistant') return prev
          return [...prev.slice(0, -1), { ...last, toolsUsed: event.toolsUsed, streaming: false }]
        })
        break
      case 'error':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (!last || last.role !== 'assistant') return prev
          return [...prev.slice(0, -1), { ...last, content: `Error: ${event.message}`, streaming: false }]
        })
        break
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    handleSubmit(input)
  }

  function handleNewChat() {
    abortRef.current?.abort()
    // Best-effort clear of server-side history; don't await
    fetch(`/api/chat/history/${conversationId}`, { method: 'DELETE' }).catch(() => {})
    setConversationId(crypto.randomUUID())
    setMessages([])
    setInput('')
    setIsStreaming(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ask</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ask questions about your finances in plain English.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleNewChat} disabled={isStreaming}>
            <SquarePen className="h-4 w-4 mr-1.5" />
            New Chat
          </Button>
        )}
      </div>

      <Card className="flex flex-col h-[calc(100vh-240px)] min-h-[400px]">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-12">
              <Bot className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm max-w-xs">
                Ask me anything about your budget, spending, savings, or net worth.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSubmit(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] space-y-1.5 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-tl-sm'
                      }`}
                    >
                      {msg.role === 'assistant' && msg.streaming && msg.content === '' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          {msg.content}
                          {msg.streaming && (
                            <span className="inline-block w-[2px] h-[14px] bg-current ml-0.5 align-middle animate-pulse" />
                          )}
                        </>
                      )}
                    </div>
                    {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <div className="flex flex-wrap gap-1 px-1">
                        {msg.toolsUsed.map(tool => (
                          <Badge key={tool} variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-3">
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your finances…"
              disabled={isStreaming}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isStreaming}>
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
