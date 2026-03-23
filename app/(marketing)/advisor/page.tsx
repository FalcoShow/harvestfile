// =============================================================================
// app/(marketing)/advisor/page.tsx
// HarvestFile — Phase 29 Build 1: AI Farm Advisor
//
// FREE TOOL #16 — The ONLY AI farm financial advisor that connects to live
// commodity futures, knows OBBBA farm bill rules, and can estimate ARC/PLC
// payments on demand. No other platform on Earth has this.
//
// CLIENT: Pure React + fetch streaming. ZERO dependency on AI SDK React hooks.
// SERVER: Claude Sonnet via streamText returns plain text stream.
// This is bulletproof — no breaking SDK updates can touch this.
// =============================================================================

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ─── Suggested Questions ─────────────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  {
    icon: '🌽',
    label: 'Corn Marketing',
    question: 'Should I sell my stored corn now or wait for a spring rally? I have 50,000 bushels in on-farm storage with a $4.20/bu cost basis.',
  },
  {
    icon: '📊',
    label: 'ARC vs PLC',
    question: 'For my 2026 corn election, should I choose ARC-CO or PLC? I have 1,200 base acres in central Iowa with a payment yield of 178 bu/acre.',
  },
  {
    icon: '💰',
    label: 'Payment Estimate',
    question: 'Estimate my 2025 PLC payment for wheat. I have 800 base acres with a 52 bu/acre payment yield.',
  },
  {
    icon: '📈',
    label: 'Market Outlook',
    question: 'What are current corn and soybean futures prices, and how do they compare to the OBBBA reference prices?',
  },
  {
    icon: '🛡️',
    label: 'Crop Insurance',
    question: 'Under the new OBBBA rules, can I stack SCO with ARC-CO now? How does that change my coverage strategy?',
  },
  {
    icon: '🗓️',
    label: 'Seasonal Strategy',
    question: 'What does the seasonal price pattern suggest for marketing my soybeans right now? What are the key dates and reports I should watch?',
  },
];

// ─── Simple markdown formatting ──────────────────────────────────────────────
function FormatText({ text }: { text: string }) {
  if (!text) return null;

  return (
    <>
      {text.split('\n').map((line, i) => {
        // Bold
        let parts: React.ReactNode[] = [line];
        if (line.includes('**')) {
          const segments = line.split(/\*\*(.*?)\*\*/g);
          parts = segments.map((s, j) =>
            j % 2 === 1 ? <strong key={j} className="font-semibold">{s}</strong> : <React.Fragment key={j}>{s}</React.Fragment>
          );
        }

        // Headers
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-[#1B4332]">{line.slice(4)}</h4>;
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold mt-3 mb-1 text-[#1B4332]">{line.slice(3)}</h3>;

        // Bullets
        if (line.startsWith('- ') || line.startsWith('• '))
          return <div key={i} className="flex gap-2 ml-2"><span className="text-[#C9A84C] flex-shrink-0">•</span><span>{parts}</span></div>;

        // Empty
        if (line.trim() === '') return <div key={i} className="h-2" />;

        return <div key={i}>{parts}</div>;
      })}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ─── Send message and stream response ────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    // Create abort controller for stop functionality
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      if (!res.body) {
        throw new Error('No response body');
      }

      // Read the stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingContent(accumulated);
      }

      // Stream complete — add assistant message
      if (accumulated.trim()) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: accumulated,
          },
        ]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User stopped — save what we have
        if (streamingContent.trim()) {
          setMessages(prev => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: streamingContent + '\n\n*(Response stopped)*',
            },
          ]);
        }
      } else {
        console.error('Advisor error:', err);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'I ran into an issue processing that request. Please try again, or rephrase your question.',
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [messages, isLoading, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="min-h-screen bg-[#FDFBF5]">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0C1F17] via-[#122A1E] to-[#1B4332] text-white">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#C9A84C]/20 text-[#E2C366] border border-[#C9A84C]/30">
              ✦ FREE TOOL #16
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AI-POWERED
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              INDUSTRY FIRST
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            AI Farm{' '}
            <span className="bg-gradient-to-r from-[#C9A84C] to-[#E2C366] bg-clip-text text-transparent">
              Advisor
            </span>
          </h1>

          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-2">
            Ask anything about grain marketing, ARC/PLC elections, crop insurance,
            or farm financial planning. Powered by live market data and OBBBA rules.
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-white/50 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live CME futures
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
              2025 OBBBA updated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              No account required
            </span>
          </div>
        </div>
      </section>

      {/* Chat Interface */}
      <div className="max-w-4xl mx-auto px-4 -mt-4 pb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-[#1B4332]/10 overflow-hidden flex flex-col" style={{ minHeight: '600px' }}>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ maxHeight: '60vh' }}>

            {/* Welcome state */}
            {messages.length === 0 && !isLoading && (
              <div className="space-y-8 pt-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1B4332] to-[#0C1F17] mb-4">
                    <span className="text-2xl">🌾</span>
                  </div>
                  <h2 className="text-xl font-semibold text-[#0C1F17] mb-2" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                    How can I help with your farm today?
                  </h2>
                  <p className="text-sm text-[#1B4332]/60 max-w-lg mx-auto">
                    I can pull live commodity prices, estimate your ARC/PLC payments,
                    analyze seasonal marketing patterns, and help with crop insurance decisions
                    — all updated for the 2025 OBBBA farm bill.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {SUGGESTED_QUESTIONS.map((sq, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(sq.question)}
                      className="text-left p-4 rounded-xl border border-[#1B4332]/10 hover:border-[#C9A84C]/40 hover:bg-[#C9A84C]/5 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{sq.icon}</span>
                        <span className="text-sm font-medium text-[#1B4332] group-hover:text-[#C9A84C] transition-colors">
                          {sq.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#1B4332]/50 line-clamp-2 leading-relaxed">
                        {sq.question}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[90%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    message.role === 'user'
                      ? 'bg-[#1B4332] text-white'
                      : 'bg-gradient-to-br from-[#C9A84C] to-[#E2C366] text-[#0C1F17]'
                  }`}>
                    {message.role === 'user' ? '👤' : '🌾'}
                  </div>

                  <div className={`rounded-2xl px-5 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#1B4332] text-white'
                      : 'bg-[#F5F3ED] text-[#0C1F17] border border-[#1B4332]/8'
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                      <FormatText text={message.content} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {isLoading && streamingContent && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[90%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm bg-gradient-to-br from-[#C9A84C] to-[#E2C366] text-[#0C1F17]">
                    🌾
                  </div>
                  <div className="rounded-2xl px-5 py-3 bg-[#F5F3ED] text-[#0C1F17] border border-[#1B4332]/8">
                    <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                      <FormatText text={streamingContent} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading dots (before streaming starts) */}
            {isLoading && !streamingContent && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm bg-gradient-to-br from-[#C9A84C] to-[#E2C366] text-[#0C1F17]">
                    🌾
                  </div>
                  <div className="rounded-2xl px-5 py-4 bg-[#F5F3ED] border border-[#1B4332]/8">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-[#1B4332]/40">Analyzing with live market data...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-[#1B4332]/10 p-4 bg-white">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about grain marketing, ARC/PLC, crop insurance..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-[#1B4332]/15 rounded-xl bg-[#FDFBF5] text-[#0C1F17] placeholder:text-[#1B4332]/30 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C]/40 disabled:opacity-50 transition-all"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-5 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium text-sm"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-[#1B4332] to-[#0C1F17] text-white rounded-xl hover:from-[#234A3B] hover:to-[#1B4332] transition-all font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Ask →
                </button>
              )}
            </form>

            <div className="flex items-center justify-between mt-3 text-[10px] text-[#1B4332]/30">
              <span>Powered by Claude AI × Live USDA data</span>
              <span>Estimates only — not financial advice</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-12 text-center">
        <p className="text-sm text-[#1B4332]/50 mb-4">
          Want county-specific ARC/PLC analysis? Try these free tools:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/check" className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1B4332] text-white hover:bg-[#234A3B] transition-colors">
            ARC/PLC Calculator →
          </Link>
          <Link href="/grain" className="px-4 py-2 rounded-lg text-sm font-medium border border-[#1B4332]/20 text-[#1B4332] hover:bg-[#1B4332]/5 transition-colors">
            Grain Marketing Score →
          </Link>
          <Link href="/markets" className="px-4 py-2 rounded-lg text-sm font-medium border border-[#1B4332]/20 text-[#1B4332] hover:bg-[#1B4332]/5 transition-colors">
            Commodity Markets →
          </Link>
          <Link href="/optimize" className="px-4 py-2 rounded-lg text-sm font-medium border border-[#1B4332]/20 text-[#1B4332] hover:bg-[#1B4332]/5 transition-colors">
            Election Optimizer →
          </Link>
        </div>
      </div>
    </div>
  );
}
