'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Document } from '../app/page';

interface Props {
  document: Document;
  apiBase: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'What is this document about?',
  'Summarize the key points.',
  'What are the main conclusions?',
  'List any important data or statistics.',
];

export default function ChatInterface({ document, apiBase }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); } catch {}
  };
  const handleClear = () => setMessages([]);
  const handleStop = () => { abortRef.current?.abort(); setIsStreaming(false); };

  // Reset chat when document changes
  useEffect(() => {
    setMessages([]);
    setInput('');
    setIsStreaming(false);
    if (abortRef.current) abortRef.current.abort();
  }, [document._id]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || isStreaming) return;

    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    // Placeholder assistant message
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document._id, question: q }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.token) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + payload.token }
                  : m
              ));
            }
            if (payload.done || payload.error) {
              if (payload.error) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: `Error: ${payload.error}`, streaming: false }
                    : m
                ));
              }
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err.message}`, streaming: false }
            : m
        ));
      }
    } finally {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ));
      setIsStreaming(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [document._id, apiBase, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Document header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-border bg-panel">
        <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 16" fill="none">
            <path d="M2 1h7l3 3v11H2V1z" stroke="#5b8dee" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M8.5 1v3.5H12" stroke="#5b8dee" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M4 7h6M4 9.5h4" stroke="#5b8dee" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-text truncate" title={document.originalName}>{document.originalName}</h2>
          <p className="text-xs text-muted">
            {document.pageCount ? `${document.pageCount} pages · ` : ''}
            {document.chunksCreated ? `${document.chunksCreated} chunks indexed` : 'indexed'}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {isStreaming ? (
            <>
              <span className="hidden sm:flex items-center gap-2 text-xs text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Generating…
              </span>
              <button onClick={handleStop} className="text-xs px-2.5 py-1 rounded-md border border-red-400/30 text-red-300 hover:bg-red-500/10 transition-colors" aria-label="Stop generating">Stop</button>
            </>
          ) : messages.length > 0 ? (
            <button onClick={handleClear} className="text-xs px-2.5 py-1 rounded-md border border-border text-muted hover:text-text hover:border-accent/30 transition-colors" aria-label="Clear chat">Clear</button>
          ) : null}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6" aria-live="polite">
        {messages.length === 0 ? (
          <WelcomeScreen
            docName={document.originalName}
            onQuestion={sendMessage}
          />
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} copiedId={copiedId} onCopy={handleCopy} onRetry={() => sendMessage(msg.role === 'user' ? msg.content : messages.filter(m=>m.role==='user').slice(-1)[0]?.content || '')} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 sm:px-6 py-4 border-t border-border bg-panel">
        <div className={`
          flex items-end gap-3 rounded-xl border px-4 py-3 transition-colors
          ${isStreaming ? 'border-border bg-surface/50' : 'border-border bg-surface hover:border-accent/40 focus-within:border-accent/60'}
        `}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Ask a question about this document…"
            aria-label="Ask a question about this document"
            className="flex-1 bg-transparent text-sm text-text placeholder-muted resize-none outline-none leading-relaxed disabled:opacity-50"
            style={{ minHeight: '24px', maxHeight: '160px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            aria-label="Send message"
            className={`
              flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all
              ${input.trim() && !isStreaming
                ? 'bg-accent hover:bg-accent-dim text-white'
                : 'bg-border text-muted cursor-not-allowed'}
            `}
          >
            {isStreaming ? (
              <div className="w-3.5 h-3.5 border-2 border-muted border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted">
            <kbd className="px-1 py-0.5 bg-border rounded text-xs font-mono">Enter</kbd> send · <kbd className="px-1 py-0.5 bg-border rounded text-xs font-mono">Shift+Enter</kbd> new line
          </p>
          <span className="text-xs text-muted">{input.length > 0 ? `${input.length} chars` : ''}</span>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ docName, onQuestion }: { docName: string; onQuestion: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-panel border border-border flex items-center justify-center mb-5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M8 12h8M8 8h5M8 16h3" stroke="#5b8dee" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#5b8dee" strokeWidth="1.5"/>
        </svg>
      </div>
      <h3 className="text-text font-semibold text-lg mb-1">Ready to answer questions</h3>
      <p className="text-muted text-sm mb-8 max-w-sm">
        Ask anything about <span className="text-text font-medium">{docName}</span>
      </p>
      <div className="grid grid-cols-2 gap-2 max-w-md w-full">
        {SUGGESTED_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => onQuestion(q)}
            className="text-left px-3.5 py-2.5 rounded-lg border border-border bg-panel hover:border-accent/50 hover:bg-accent/5 transition-colors group"
          >
            <p className="text-xs text-muted group-hover:text-text transition-colors leading-snug">{q}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, copiedId, onCopy, onRetry }: { message: Message; copiedId: string | null; onCopy: (t: string, id: string) => void; onRetry: () => void }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
        ${isUser ? 'bg-accent/20 text-accent' : 'bg-panel border border-border text-muted'}
      `}>
        {isUser ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M1.5 10.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 6h4M4 4h2M4 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Bubble */}
      <div className={`
        relative group max-w-[75%] rounded-2xl px-4 py-3 text-sm
        ${isUser
          ? 'bg-accent text-white rounded-tr-sm'
          : 'bg-panel border border-border text-text rounded-tl-sm'}
      `}>
        {isUser ? (
          <p className="leading-relaxed break-words">{message.content}</p>
        ) : (
          <div className="prose-chat break-words">
            {message.content ? (
              <>
                <ReactMarkdown>{message.content}</ReactMarkdown>
                {message.streaming && <span className="cursor-blink" />}
              </>
            ) : message.streaming ? (
              <span className="cursor-blink" />
            ) : (
              <span className="text-muted italic">No response received.</span>
            )}
          </div>
        )}
        {!isUser && message.content && !message.streaming && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
            <button onClick={() => onCopy(message.content, message.id)} className="text-xs px-2 py-1 rounded-md hover:bg-white/5 text-muted hover:text-text transition-colors flex items-center gap-1" aria-label="Copy response">
              {copiedId === message.id ? '✓ Copied' : 'Copy'}
            </button>
            {message.content.startsWith('Error:') && (
              <button onClick={onRetry} className="text-xs px-2 py-1 rounded-md hover:bg-white/5 text-muted hover:text-text transition-colors" aria-label="Retry">Retry</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
