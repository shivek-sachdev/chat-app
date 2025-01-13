'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, ExternalLink } from 'lucide-react';
import Linkify from 'linkify-react';
import Image from 'next/image';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ApiResponse {
  response?: string;
  error?: string;
  status?: number;
}

const SUGGESTIONS = [
  "วิธีการรับประทาน BioBlend+ ที่ถูกต้อง?",
  "BioBlend+ มีประโยชน์อย่างไร?",
  "BioBlend+ ประกอบด้วยอะไรบ้าง?",
  "ควรทานBioBlend+ เมื่อไหร่?",
] as const;

const linkifyOptions = {
  target: '_blank',
  className: 'text-[#57c1a9] hover:text-[#57c1a9]/80 underline',
  rel: 'noopener noreferrer',
  validate: {
    url: (value: string) => /^(http|https):\/\/[^ "]+$/.test(value),
  },
  format: (value: string, type: string) => {
    if (type === 'url' && value.length > 50) {
      return `${value.slice(0, 50)}...`;
    }
    return value;
  },
};

const handleApiError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};

const MessageContent: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => (
  <Linkify 
    options={{
      ...linkifyOptions,
      className: `${linkifyOptions.className} ${
        isUser ? 'text-white hover:text-white/90' : 'text-[#57c1a9] hover:text-[#57c1a9]/80'
      }`,
    }}
  >
    {content}
  </Linkify>
);

const ModernChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const behavior = messages.length > 1 ? 'smooth' : 'auto';
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = (role: Message['role'], content: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setInput('');
    setIsLoading(true);
    setError(null);

    addMessage('user', trimmedInput);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedInput,
          sessionId: `web-session-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      addMessage('assistant', data.response || 'No response received');

    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      addMessage('assistant', 'ขออภัย เกิดข้อผิดพลาด โปรดลองอีกครั้ง');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center justify-between p-4 border-b border-[#283178]/10 bg-white">
        <div className="flex items-center space-x-4">
          {/* Logo container */}
          <div className="flex items-center">
            <div className="w-10 h-10 relative">
              <Image
                src="/logo_bioblend.jpg" // Replace with your actual logo path
                alt="BioBlend+ Logo"
                className="object-contain"
                width={40}
                height={40}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-6 h-6 text-[#283178]" />
            <h1 className="text-xl font-semibold text-[#283178]">
              BioBlend Buddy
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-[#283178] text-white'
                  : 'bg-[#57c1a9]/10 text-[#283178]'
              }`}
            >
              <div className="whitespace-pre-wrap">
                <MessageContent 
                  content={message.content} 
                  isUser={message.role === 'user'} 
                />
              </div>
              {message.content.match(/https?:\/\/[^\s]+/) && (
                <div className="mt-1 text-xs opacity-70 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  มีลิงก์
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-2xl bg-[#57c1a9]/10">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[#283178] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#283178] rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-[#283178] rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#283178]/10 bg-white">
        {showSuggestions && (
          <div className="mb-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-2 text-sm rounded-full bg-[#57c1a9]/10 
                         text-[#283178] hover:bg-[#57c1a9]/20 
                         transition-colors duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์ข้อความของคุณ..."
            className="flex-1 p-3 rounded-lg border border-[#283178]/20
                     bg-white text-[#283178]
                     focus:outline-none focus:ring-2 focus:ring-[#57c1a9]
                     placeholder-[#283178]/50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 rounded-lg bg-[#283178] text-white
                     disabled:bg-[#283178]/50
                     hover:bg-[#283178]/90 transition-colors duration-200"
            aria-label="ส่งข้อความ"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModernChatInterface;