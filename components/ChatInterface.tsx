// components/ChatInterface.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ApiResponse {
  response?: string;
  error?: string;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    const userMessageObj: Message = {
      role: 'user',
      content: userMessage,
    };
    
    setMessages((prev) => [...prev, userMessageObj]);

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

      // Add assistant message
      const assistantMessageObj: Message = {
        role: 'assistant',
        content: data.error || data.response || 'Sorry, I encountered an error. Please try again.',
      };
      
      setMessages((prev) => [...prev, assistantMessageObj]);

    } catch (error) {
      // Add error message
      const errorMessageObj: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      
      setMessages((prev) => [...prev, errorMessageObj]);
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg shadow-sm ${
              message.role === 'user'
                ? 'bg-blue-100 dark:bg-blue-900 ml-auto max-w-[80%] text-blue-900 dark:text-blue-100'
                : 'bg-gray-100 dark:bg-gray-800 mr-auto max-w-[80%] text-gray-900 dark:text-gray-100'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mr-auto max-w-[80%] text-gray-900 dark:text-gray-100">
            <p>Thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg 
                   bg-white dark:bg-gray-800 
                   text-gray-900 dark:text-gray-100
                   focus:outline-none focus:ring-2 focus:ring-blue-500 
                   placeholder-gray-500 dark:placeholder-gray-400"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                   disabled:bg-blue-300 dark:disabled:bg-blue-800
                   transition-colors duration-200"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;