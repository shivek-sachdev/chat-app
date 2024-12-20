'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const suggestions = [
  "What are the best cafes for working in Chiang Mai?",
  "How do I extend my Thai visa in Bangkok?",
  "Recommend some coworking spaces in Koh Phangan",
  "What's the average cost of living in Phuket for digital nomads?",
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ApiResponse {
  response?: string;
  error?: string;
}

const ModernChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: Message['role'], content: string) => {
    setMessages(prev => [...prev, { role, content }]);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    addMessage('user', userMessage);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: 'web-session-' + Date.now(),
        }),
      });

      const data: ApiResponse = await response.json();
      addMessage('assistant', data.response || data.error || 'Sorry, I encountered an error. Please try again.');

    } catch (error) {
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom components for ReactMarkdown
  const MarkdownComponents = {
    p: ({ children }) => <p className="mb-1">{children}</p>,
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className="list-disc ml-4 space-y-0.5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal ml-4 space-y-0.5">{children}</ol>,
    li: ({ children }) => <li className="leading-tight">{children}</li>,
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Thailand Digital Nomad Assistant</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
              }`}
            >
              <ReactMarkdown 
                components={MarkdownComponents}
                className="whitespace-pre-wrap"
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
        {showSuggestions && (
          <div className="mb-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-2 text-sm rounded-full bg-blue-50 dark:bg-blue-900/30 
                         text-blue-700 dark:text-blue-200 hover:bg-blue-100 
                         dark:hover:bg-blue-900/50 transition-colors duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-3 rounded-lg border border-gray-200 dark:border-gray-700
                     bg-gray-50 dark:bg-gray-900
                     text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 rounded-lg bg-blue-500 text-white
                     disabled:bg-blue-300 dark:disabled:bg-blue-800
                     hover:bg-blue-600 transition-colors duration-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModernChatInterface;