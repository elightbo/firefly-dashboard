import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChatMutation } from '@/store/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
}

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
  const [chat, { isLoading }] = useChatMutation()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(question: string) {
    if (!question.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: question.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')

    try {
      const result = await chat(question.trim()).unwrap()
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: result.answer, toolsUsed: result.toolsUsed },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    handleSubmit(input)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ask</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask questions about your finances in plain English.
        </p>
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
                      {msg.content}
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
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
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
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              {isLoading ? (
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
