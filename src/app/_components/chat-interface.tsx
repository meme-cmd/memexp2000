"use client";
import { useState, useEffect, useRef } from "react";
import { Bot, Send } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { User } from "lucide-react";
import type { AgentMessage } from "@/types/agent";
import Image from "next/image";
import { agentToast } from "./agent-toast";

export function ChatInterface({
  userId,
  agentId,
}: {
  userId: string;
  agentId: string;
}) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { conversations, addMessage, clearConversation } = useChatStore();
  const { mutateAsync: sendMessage } = api.ai.sendMessage.useMutation();
  const historyLoadedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatHistoryQuery = api.ai.getAgentChatHistory.useQuery(
    { agentId, userId, limit: 50 },
    {
      enabled: !!userId && !!agentId,
      refetchOnWindowFocus: false,
    },
  );

  const userProfileQuery = api.r2.getUserProfile.useQuery(
    { publicKey: userId },
    { enabled: !!userId },
  );

  useEffect(() => {
    if (!historyLoadedRef.current && chatHistoryQuery.data?.messages) {
      clearConversation(userId, agentId);

      const messageGroups = new Map<string, AgentMessage[]>();
      chatHistoryQuery.data.messages.forEach((msg) => {
        const group = messageGroups.get(msg.conversationId) ?? [];
        group.push(msg);
        messageGroups.set(msg.conversationId, group);
      });

      Array.from(messageGroups.values())
        .sort((a, b) => {
          const aTime = Math.min(
            ...a.map((m) => new Date(m.timestamp).getTime()),
          );
          const bTime = Math.min(
            ...b.map((m) => new Date(m.timestamp).getTime()),
          );
          return aTime - bTime;
        })
        .forEach((group) => {
          group
            .sort((a, b) => a.sequence - b.sequence)
            .forEach((msg) => {
              addMessage(userId, agentId, {
                content: msg.content,
                sender: msg.messageType,
              });
            });
        });

      historyLoadedRef.current = true;
    }
  }, [chatHistoryQuery.data, userId, agentId, addMessage, clearConversation]);

  useEffect(() => {
    historyLoadedRef.current = false;
  }, [agentId, userId]);

  const messages = conversations.get(`${userId}-${agentId}`) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    addMessage(userId, agentId, {
      content: userMessage,
      sender: "user" as const,
    });

    setIsTyping(true);
    try {
      const { message } = await sendMessage({
        agentId,
        userId,
        content: userMessage,
      });

      addMessage(userId, agentId, {
        content: message.content,
        sender: "agent" as const,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await chatHistoryQuery.refetch();
    } catch (_error) {
      /* eslint-disable-line @typescript-eslint/no-unused-vars */
      agentToast.error("Failed to send message");

      addMessage(userId, agentId, {
        content: "Sorry, I'm having trouble responding right now.",
        sender: "agent" as const,
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-2 flex-1 overflow-y-auto p-2 sm:p-4">
        {messages.map((message) => {
          const isAgent = message.sender === "agent";
          return (
            <div
              key={message.id}
              className={cn(
                "mb-3 flex gap-2",
                isAgent ? "flex-row" : "flex-row-reverse",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
                  isAgent ? "bg-[#c0c0c0]" : "bg-[#d8d8d8]",
                  "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                )}
              >
                {isAgent ? (
                  <Bot className="h-4 w-4" />
                ) : userProfileQuery.data?.profilePicture ? (
                  <Image
                    src={userProfileQuery.data.profilePicture}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    width={16}
                    height={16}
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  "animate-fade-in break-words rounded p-2 sm:p-3",
                  "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                  isAgent
                    ? "max-w-[85%] bg-[#c0c0c0] sm:max-w-[80%]"
                    : "max-w-[85%] bg-[#d8d8d8] sm:max-w-[80%]",
                )}
              >
                <div className="mb-1 text-xs font-semibold text-black">
                  {isAgent
                    ? `Agent`
                    : (userProfileQuery.data?.username ?? "You")}
                </div>
                <div className="whitespace-pre-wrap text-sm text-black">
                  {message.content}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="mb-3 flex gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                "bg-[#c0c0c0]",
              )}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div
              className={cn(
                "animate-fade-in max-w-[85%] rounded p-2 sm:max-w-[80%] sm:p-3",
                "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                "bg-[#c0c0c0]",
              )}
            >
              <div className="mb-1 text-xs font-semibold text-black">Agent</div>
              <div className="flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600"
                  style={{ animationDelay: "0ms", animationDuration: "1s" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600"
                  style={{ animationDelay: "200ms", animationDuration: "1s" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600"
                  style={{ animationDelay: "400ms", animationDuration: "1s" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-gray-200 bg-[#f0f0f0] p-2 sm:p-3"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className={cn(
              "h-8 flex-1 rounded bg-white px-2 py-1 text-xs text-black",
              "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
              "focus:outline-none",
            )}
          />
          <button
            type="submit"
            className={cn(
              "rounded bg-[#c0c0c0] p-1.5",
              "shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff]",
              "active:shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
