"use client";

import { useState, useEffect, useRef } from 'react';
import { useUser } from "@/hooks/use-user";
import { formatDistanceToNow } from 'date-fns';
import { WalletRequiredMessage } from './wallet-required-message';

interface ChatMessage {
  id: string;
  address: string;
  text: string;
  timestamp: Date;
}

export function PublicChat() {
  const { publicKey } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Format wallet address as "abcd...1234"
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  // Simulate loading chat history
  useEffect(() => {
    if (!publicKey) return;
    
    // Mock data for demonstration
    const mockMessages = [
      {
        id: '1',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        text: 'Welcome to the Windows XP Public Chat!',
        timestamp: new Date(Date.now() - 360000),
      },
      {
        id: '2',
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        text: 'I remember using Windows XP back in the day!',
        timestamp: new Date(Date.now() - 300000),
      },
      {
        id: '3',
        address: '0x7890abcdef1234567890abcdef1234567890abcd',
        text: 'That notification sound was iconic.',
        timestamp: new Date(Date.now() - 240000),
      },
    ];
    
    setMessages(mockMessages);
  }, [publicKey]);
  
  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = () => {
    if (!inputText.trim() || !publicKey) return;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      address: publicKey,
      text: inputText,
      timestamp: new Date(),
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputText('');
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (!publicKey) {
    return <WalletRequiredMessage featureName="Public Chat" />;
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto bg-white p-4 border border-[#d3d3d3] mb-4 rounded">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`mb-4 ${message.address === publicKey ? 'text-right' : ''}`}
          >
            <div 
              className={`inline-block max-w-[80%] rounded p-3 ${
                message.address === publicKey 
                  ? 'bg-[#e6f3ff] text-left' 
                  : 'bg-[#f0f0f0]'
              }`}
            >
              <div className="flex items-center mb-1">
                <span className="font-bold text-xs text-[#003399]">
                  {shortenAddress(message.address)}
                </span>
                <span className="ml-2 text-xs text-gray-400">
                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="flex border border-[#d3d3d3] bg-white rounded p-2">
        <textarea
          className="flex-1 resize-none border-none outline-none text-sm p-2"
          rows={2}
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button
          className="ml-2 px-4 bg-gradient-to-b from-[#3c8b3d] to-[#277228] text-white rounded self-end"
          onClick={handleSendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
} 