import type { Agent } from "./agent";

export interface Backroom {
  id: string;
  name: string;
  topic: string;
  description: string;
  agents: string[];
  visibility: "public" | "private";
  creator: string;
  messageLimit: number;
  messages: BackroomMessage[];
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "completed" | "pending";
}

export interface BackroomMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  metadata?: {
    latency?: number;
    tokensUsed?: number;
  };
}

export interface CreateBackroomFormData {
  name: string;
  topic: string;
  description: string;
  agents: string[];
  messageLimit: number;
  visibility: "public" | "private";
}

export interface BackroomCardProps {
  backroom: Backroom;
  agents: Agent[];
  onClick: () => void;
}

export interface BackroomMetadata {
  system: {
    platform: string;
    release: string;
    arch: string;
    cpus: number;
    memory: {
      total: number;
      free: number;
    };
    uptime: number;
    client: {
      platform: string;
      userAgent: string;
      language: string;
      cores: number;
      memory: string;
      connection: string;
      webgl: string;
      renderingEngine: string;
      performanceMode: string;
    };
  };
  request: {
    ip: string;
    userAgent: string;
    timestamp: string;
    protocol: string;
    secure: boolean;
    headers: {
      accept: string;
      language: string;
      encoding: string;
      connection: string;
    };
  };
  services: {
    websocket: {
      protocol: string;
      latency: number;
      connectionId: string;
      status: string;
    };
    api: {
      protocol: string;
      tls: string;
      latency: number;
      status: string;
    };
    openai: {
      model: string;
      version: string;
      contextWindow: string;
      temperature: number;
      status: string;
    };
  };
  performance: {
    startTime: number;
    messageGenerationTimes: number[];
    totalProcessingTime: number;
    metrics: {
      initializationTime: number;
      messageProcessingTime: number;
      averageLatency: number;
    };
  };
}
