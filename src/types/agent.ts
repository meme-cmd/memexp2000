export interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "active" | "inactive";
  personality?: string;
  background?: string;
  expertise?: string;
  coreBeliefs?: string;
  quirks?: string;
  communicationStyle?: string;
  traits: string[];
  createdAt: Date;
  visibility: "public" | "private";
  creator: string;
  price?: number; // SOL amount to use this agent
  canLaunchToken?: boolean; // Whether this agent can launch tokens after backroom conversations
}

export interface CreateAgentFormData {
  name: string;
  personality: string;
  background: string;
  expertise: string;
  coreBeliefs: string;
  quirks: string;
  communicationStyle: string;
  isRandom: boolean;
  conversationTopic: string;
  traits?: string[];
  visibility: "public" | "private";
  price?: number; // SOL amount to charge for using this agent
  canLaunchToken?: boolean; // Whether this agent can launch tokens after backroom conversations
}

export interface AgentMessage {
  agentId: string;
  content: string;
  response: string;
  timestamp: Date;
  userId?: string;
  conversationId: string;
  messageType: "user" | "agent";
  sequence: number;
}
