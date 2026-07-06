'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Send, Bot, MessageSquare, Plus, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'What should I learn next?',
  'Am I ready for backend roles?',
  'Which projects would strengthen my profile?',
  'What skills am I missing for an AI Engineer?',
  'How can I improve my career readiness?',
  "What's my strongest skill area?",
];

const bounceDotVariants = {
  initial: { y: 0, opacity: 0.5 },
  animate: { y: -6, opacity: 1 },
};

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-start gap-3 max-w-3xl"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 mt-1">
        <Bot className="size-4 text-emerald-400" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-2 rounded-full bg-emerald-500"
              variants={bounceDotVariants}
              initial="initial"
              animate="animate"
              transition={{
                duration: 0.4,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (q: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center flex-1 px-4 py-8"
    >
      <div className="flex flex-col items-center gap-4 mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative"
        >
          <div className="size-20 rounded-2xl bg-emerald-600/15 flex items-center justify-center">
            <Brain className="size-10 text-emerald-400" />
          </div>
          <motion.div
            className="absolute -top-1 -right-1 size-6 rounded-full bg-amber-500/20 flex items-center justify-center"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles className="size-3 text-amber-400" />
          </motion.div>
        </motion.div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Your AI Career Coach
          </h2>
          <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
            I know your skills, projects, and experience. Ask me anything to get
            personalized career advice.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTED_QUESTIONS.map((question, index) => (
          <motion.button
            key={question}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + index * 0.06 }}
            onClick={() => onSuggestionClick(question)}
            className="bg-card border border-border rounded-xl p-4 card-hover cursor-pointer text-left flex items-start gap-3 group"
          >
            <MessageSquare className="size-4 text-emerald-400 mt-0.5 shrink-0 group-hover:text-emerald-300 transition-colors" />
            <span className="text-sm text-foreground/90 group-hover:text-foreground transition-colors leading-snug">
              {question}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export function AICoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: Message = { role: 'user', content: text.trim() };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      try {
        const res = await fetch('/api/ai/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            conversationId,
          }),
        });

        if (!res.ok) throw new Error('Failed to get response');

        const data = await res.json();
        const aiMessage: Message = { role: 'assistant', content: data.response };
        setMessages((prev) => [...prev, aiMessage]);

        // Store conversation ID if returned
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      } catch {
        const errorMessage: Message = {
          role: 'assistant',
          content:
            'Sorry, I encountered an error. Please try again.',
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, conversationId]
  );

  const handleNewChat = useCallback(async () => {
    setMessages([]);
    setConversationId(undefined);
    setInput('');
    setIsLoading(false);

    try {
      await fetch('/api/ai/coach', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
    } catch {
      // Silently handle clear error
    }
  }, [conversationId]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      // Auto-grow textarea, max 4 rows
      const target = e.target;
      target.style.height = 'auto';
      const maxHeight = 4 * 24; // ~4 rows
      target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
    },
    []
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <Sparkles className="size-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              AI Career Coach
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Ask me anything about your career, skills, or next steps
            </p>
          </div>
        </div>
        {hasMessages && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4 mr-1.5" />
            New Chat
          </Button>
        )}
      </div>

      {/* Messages Area */}
      {hasMessages ? (
        <ScrollArea ref={scrollRef} className="flex-1 px-4 sm:px-6 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 mt-0.5">
                      <Bot className="size-4 text-emerald-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-card border border-border text-foreground rounded-bl-none'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_strong]:text-emerald-300 [&_code]:bg-emerald-600/20 [&_code]:text-emerald-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code:before]:content-none [&_code:after]:content-none [&_pre]:bg-black/40 [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:text-foreground [&_pre_code]:p-0 [&_pre_code]:rounded-none [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-emerald-400 [&_a]:underline">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && <TypingIndicator />}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <EmptyState onSuggestionClick={sendMessage} />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border px-4 sm:px-6 py-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-3"
        >
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask your career coach..."
              disabled={isLoading}
              rows={1}
              className="min-h-[44px] max-h-[96px] resize-none rounded-xl bg-card border-border pr-3 text-sm py-3 placeholder:text-muted-foreground/60 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
            className="size-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-40"
          >
            <Send className="size-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground/50 mt-2.5">
          AI Career Coach uses your profile data to provide personalized advice
        </p>
      </div>
    </div>
  );
}