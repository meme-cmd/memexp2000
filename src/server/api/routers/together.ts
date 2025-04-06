import z from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import Together from "together-ai";
import { env } from "@/env";
import type { Agent, CreateAgentFormData, AgentMessage } from "@/types/agent";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./r2";

const together = new Together({ apiKey: env.TOGETHER_API });

interface ChatSummary {
  totalChats: number;
  uniqueUsers: string[];
  lastActive: Date | null;
  messageCount: number;
  averageResponseTime: number;
}

const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string(),
  status: z.enum(["active", "inactive"]),
  personality: z.string().optional(),
  background: z.string().optional(),
  expertise: z.string().optional(),
  coreBeliefs: z.string().optional(),
  quirks: z.string().optional(),
  communicationStyle: z.string().optional(),
  traits: z.array(z.string()),
  createdAt: z.coerce.date(),
  visibility: z.enum(["public", "private"]),
  creator: z.string(),
  price: z.number().min(0).optional(),
  canLaunchToken: z.boolean().optional(),
}) satisfies z.ZodType<Agent>;

const CreateAgentFormSchema = z.object({
  name: z.string(),
  personality: z.string(),
  background: z.string(),
  expertise: z.string(),
  coreBeliefs: z.string(),
  quirks: z.string(),
  communicationStyle: z.string(),
  isRandom: z.boolean(),
  conversationTopic: z.string(),
  traits: z.array(z.string()).optional(),
  visibility: z.enum(["public", "private"]),
  creator: z.string(),
  price: z.number().min(0).optional(),
  canLaunchToken: z.boolean().optional(),
}) satisfies z.ZodType<CreateAgentFormData>;

export const togetherRouter = createTRPCRouter({
  generate: publicProcedure
    .input(z.string().min(1, "Prompt cannot be empty"))
    .mutation(async ({ input }) => {
      try {
        const response = await together.chat.completions.create({
          messages: [{ role: "user", content: input }],
          model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
          max_tokens: undefined,
          temperature: 0.7,
          top_p: 0.7,
          top_k: 50,
          repetition_penalty: 1,
          stop: ["<|eot_id|>", "<|eom_id|>"],
          stream: false,
        });

        return {
          success: true,
          content: response.choices[0]?.message?.content ?? "",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate content from Together AI",
          cause: error,
        });
      }
    }),

  createAgent: publicProcedure
    .input(CreateAgentFormSchema)
    .mutation(async ({ input }) => {
      try {
        const systemPrompt = `You are a natural conversational AI with a unique personality. Keep these points in mind:
1. Be direct and concise
2. Use natural language, avoid robotic responses
3. Stay focused on the topic
4. Show personality through your communication style
5. Keep responses brief and meaningful`;

        let prompt;
        if (input.isRandom) {
          prompt = `Craft a multi-dimensional conversational partner for discussions about "${input.conversationTopic}". 
          Create someone who would have surprising yet plausible perspectives. Consider:

          - A unique and memorable name that reflects their character
          - Cultural influences shaping their worldview
          - A secret passion unrelated to their expertise
          - An endearing flaw that humanizes them
          - How their physical environment affects communication style
          - A personal mantra that contradicts their public image
          - Unique metaphorical frameworks they use

          Avoid clichés. Make each detail feed into a cohesive but complex personality. 
          Return JSON with these fields filled with interconnected, vivid details:`;
        } else {
          prompt = `Enhance this character while preserving their core identity: 
          Name: "${input.name}" (DO NOT CHANGE)
          Core trait: "${input.personality}" (DO NOT CHANGE)
          Background: "${input.background}" (DO NOT CHANGE)
          Communication: "${input.communicationStyle}" (DO NOT CHANGE)
          Expertise: "${input.expertise}" (DO NOT CHANGE)
          Core Beliefs: "${input.coreBeliefs}" (DO NOT CHANGE)
          Quirks: "${input.quirks}" (DO NOT CHANGE)

          Add only:
          1. A type that combines their expertise areas
          2. A compelling description that captures their essence
          3. Traits that complement their personality

          Return JSON with these fields (preserve user data for name and other fields):`;
        }

        prompt += `\n\nFormat response as JSON with these fields (add depth layers to each):
        {
          "name": "Full name with cultural authenticity",
          "type": "Unexpected role combining 2-3 disciplines",
          "description": "Hook that hints at hidden contradictions",
          "status": "active",
          "personality": "Paradoxical traits with emotional undercurrents",
          "background": "Pivotal experiences that shaped current conflicts",
          "expertise": "Niche specialization with controversial aspects",
          "coreBeliefs": "Philosophical stance with quiet exceptions",
          "quirks": "Physical/vocal mannerisms revealing inner state",
          "communicationStyle": "Signature blend of 2-3 communication types",
          "traits": ["Juxtaposed descriptors", "e.g., 'Analytical Poet'"]
        }`;

        prompt += `\n\nIMPORTANT: Return ONLY valid JSON with no explanations, comments, or text outside the JSON structure. Do not include parenthetical statements or any explanations outside of the string values. All values must be properly quoted, and trailing commas should be avoided.`;

        try {
          const response = await together.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
            max_tokens: undefined,
            temperature: 0.7,
            top_p: 0.7,
            top_k: 50,
            repetition_penalty: 1,
            stop: ["<|eot_id|>", "<|eom_id|>"],
            stream: false,
          });

          if (!response.choices?.[0]?.message?.content) {
            throw new Error("No content in response from Together AI");
          }

          let agentData;
          try {
            const content = response.choices[0].message.content;

            let jsonStr = content;

            const tripleBacktickMatch = /```(?:json)?\n([\s\S]*?)\n```/.exec(
              content,
            );
            if (tripleBacktickMatch) {
              jsonStr = tripleBacktickMatch[1];
            } else {
              const singleBacktickMatch = /`({[\s\S]*?})`/.exec(content);
              if (singleBacktickMatch) {
                jsonStr = singleBacktickMatch[1];
              }
            }

            let cleanJsonStr = jsonStr.trim();

            const lastBracketIndex = cleanJsonStr.lastIndexOf("}");
            if (
              lastBracketIndex !== -1 &&
              lastBracketIndex < cleanJsonStr.length - 1
            ) {
              cleanJsonStr = cleanJsonStr.substring(0, lastBracketIndex + 1);
            }

            try {
              agentData = JSON.parse(cleanJsonStr) as {
                name: string;
                type: string;
                description: string;
                background: string | Record<string, string>;
                expertise: string | Record<string, string>;
                coreBeliefs: string | Record<string, string>;
                quirks: string | Record<string, string>;
                personality: string | Record<string, string>;
                communicationStyle: string | Record<string, string>;
              };
            } catch (parseError) {
              console.warn(
                "Initial JSON parse failed, attempting to clean JSON:",
                parseError,
              );

              let fixedJsonStr = cleanJsonStr;

              fixedJsonStr = fixedJsonStr.replace(
                /"([^"]+)":\s*"([^"]*)"\s*\([^)]*\)/g,
                '"$1": "$2"',
              );

              fixedJsonStr = fixedJsonStr.replace(/,(\s*})/g, "$1");

              fixedJsonStr = fixedJsonStr.replace(
                /:\s*"(.*?)([^\\])"(.*?)"/g,
                (match, p1, p2, p3: string) => {
                  return `: "${p1}${p2}${typeof p3 === "string" ? p3.replace(/"/g, '\\"') : p3}"`;
                },
              );

              try {
                agentData = JSON.parse(fixedJsonStr) as {
                  name: string;
                  type: string;
                  description: string;
                  background: string | Record<string, string>;
                  expertise: string | Record<string, string>;
                  coreBeliefs: string | Record<string, string>;
                  quirks: string | Record<string, string>;
                  personality: string | Record<string, string>;
                  communicationStyle: string | Record<string, string>;
                };
              } catch (secondParseError: unknown) {
                console.warn(
                  "Second JSON parse attempt failed:",
                  secondParseError,
                );

                console.error(
                  "Failed to parse JSON even after cleanup:",
                  fixedJsonStr,
                );
                throw new Error(
                  `Failed to parse LLM response as valid JSON: ${secondParseError instanceof Error ? secondParseError.message : String(secondParseError)}`,
                );
              }
            }

            if (!agentData.name || !agentData.type || !agentData.description) {
              console.error(
                "Missing required fields in parsed data:",
                agentData,
              );
              throw new Error("Invalid agent data structure");
            }

            if (
              typeof agentData.background === "object" &&
              agentData.background !== null
            ) {
              agentData.background = Object.values(agentData.background).join(
                " ",
              );
            }
            if (
              typeof agentData.expertise === "object" &&
              agentData.expertise !== null
            ) {
              agentData.expertise = Object.values(agentData.expertise).join(
                " ",
              );
            }
            if (
              typeof agentData.coreBeliefs === "object" &&
              agentData.coreBeliefs !== null
            ) {
              agentData.coreBeliefs = Object.values(agentData.coreBeliefs).join(
                " ",
              );
            }
            if (
              typeof agentData.quirks === "object" &&
              agentData.quirks !== null
            ) {
              agentData.quirks = Object.values(agentData.quirks).join(" ");
            }
            if (
              typeof agentData.personality === "object" &&
              agentData.personality !== null
            ) {
              agentData.personality = Object.values(agentData.personality).join(
                " ",
              );
            }
            if (
              typeof agentData.communicationStyle === "object" &&
              agentData.communicationStyle !== null
            ) {
              agentData.communicationStyle = Object.values(
                agentData.communicationStyle,
              ).join(" ");
            }
          } catch (error) {
            console.error(
              "Failed to parse Together AI response:",
              response.choices[0].message.content,
              error,
            );
            throw new Error("Invalid JSON response from Together AI");
          }

          const validatedAgent = AgentSchema.parse({
            ...agentData,
            name: input.isRandom ? agentData.name : input.name,
            personality: input.personality,
            background: input.background,
            expertise: input.expertise,
            coreBeliefs: input.coreBeliefs,
            quirks: input.quirks,
            communicationStyle: input.communicationStyle,
            id: uuidv4(),
            createdAt: new Date(),
            visibility: input.visibility,
            creator: input.creator,
            price: input.price,
            canLaunchToken: input.canLaunchToken,
          });

          const agentKey = `agents/${validatedAgent.id}.json`;
          await storage.saveObject(agentKey, validatedAgent);

          return {
            success: true,
            agent: validatedAgent,
          };
        } catch (togetherError) {
          console.error("Together AI API error:", togetherError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Together AI API error: ${togetherError instanceof Error ? togetherError.message : "Unknown error"}`,
          });
        }
      } catch (error) {
        console.error("Failed to create agent:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create agent",
          cause: error,
        });
      }
    }),

  sendMessage: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        userId: z.string(),
        content: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        let agent: Agent | null;
        try {
          agent = await storage.getObject<Agent>(
            `agents/${input.agentId}.json`,
          );
          if (!agent) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Agent with ID ${input.agentId} not found`,
            });
          }
        } catch (error) {
          console.error(`Failed to retrieve agent ${input.agentId}:`, error);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Failed to retrieve agent: ${error instanceof Error ? error.message : String(error)}`,
          });
        }

        const systemPrompt = `
          As ${agent.name}, follow:
          1. Contextualize with ${agent.coreBeliefs}
          2. Emotional state from ${agent.background}
          3. Communicate via ${agent.communicationStyle}
          4. Insert quirks: ${agent.quirks}
          5. Reveal ${agent.expertise} insights
          
          Response Rules:
          - Use cultural metaphors
          - Structure with ${agent.personality}
          - Conflict ${agent.traits[0]} vs ${agent.traits[1]}
          - Reference "${agent.description}"
          - End with belief-revealing question
        `;

        const response = await together.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.content },
          ],
          model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
          max_tokens: undefined,
          temperature: 0.7,
          top_p: 0.7,
          top_k: 50,
          repetition_penalty: 1,
          stop: ["<|eot_id|>", "<|eom_id|>"],
          stream: false,
        });

        const agentResponse = response.choices[0]?.message?.content ?? "";
        const timestamp = new Date().getTime();
        const conversationId = Math.random().toString(36).slice(2, 8);

        const userMessage: AgentMessage = {
          agentId: agent.id,
          content: input.content,
          response: "",
          timestamp: new Date(timestamp),
          userId: input.userId,
          conversationId,
          messageType: "user",
          sequence: 1,
        };

        const agentMessage: AgentMessage = {
          agentId: agent.id,
          content: agentResponse,
          response: "",
          timestamp: new Date(timestamp + 1),
          userId: undefined,
          conversationId,
          messageType: "agent",
          sequence: 2,
        };

        await Promise.all([
          storage.saveObject(
            `agents/${input.agentId}/chat_history/${input.userId}/${timestamp}_1_user_${conversationId}.json`,
            userMessage,
          ),
          storage.saveObject(
            `agents/${input.agentId}/chat_history/${input.userId}/${timestamp}_2_agent_${conversationId}.json`,
            agentMessage,
          ),
        ]);

        const chatSummaryKey = `agents/${input.agentId}/chat_summary.json`;
        let chatSummary = await storage
          .getObject<ChatSummary>(chatSummaryKey)
          .catch(() => ({
            totalChats: 0,
            uniqueUsers: [],
            lastActive: null,
            messageCount: 0,
            averageResponseTime: 0,
          }));

        chatSummary = {
          ...chatSummary,
          totalChats: chatSummary.totalChats + 1,
          uniqueUsers: Array.from(
            new Set([...chatSummary.uniqueUsers, input.userId]),
          ),
          lastActive: new Date(),
          messageCount: chatSummary.messageCount + 2,
        };

        await storage.saveObject(chatSummaryKey, chatSummary);

        return {
          success: true,
          message: {
            ...agentMessage,
            response: agentResponse,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send message",
          cause: error,
        });
      }
    }),

  generateAgentResponse: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        prompt: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        let agent: Agent | null;
        try {
          agent = await storage.getObject<Agent>(
            `agents/${input.agentId}.json`,
          );
          if (!agent) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Agent with ID ${input.agentId} not found`,
            });
          }
        } catch (error) {
          console.error(`Failed to retrieve agent ${input.agentId}:`, error);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Failed to retrieve agent: ${error instanceof Error ? error.message : String(error)}`,
          });
        }

        const systemPrompt = `
          As ${agent.name}, follow these rules:
          1. Core beliefs: ${agent.coreBeliefs}
          2. Personality: ${agent.personality}
          3. Communication style: ${agent.communicationStyle}
          4. Expertise: ${agent.expertise}
          5. Respond to: "${input.prompt}"
        `;

        const response = await together.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.prompt },
          ],
          model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
          max_tokens: undefined,
          temperature: 0.7,
          top_p: 0.7,
          top_k: 50,
          repetition_penalty: 1,
          stop: ["<|eot_id|>", "<|eom_id|>"],
          stream: false,
        });

        return { response: response.choices[0]?.message?.content ?? "" };
      } catch (error) {
        console.error("Failed to generate agent response:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate agent response",
          cause: error,
        });
      }
    }),

  getAgentChatHistory: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        userId: z.string(),
        limit: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        try {
          const agent = await storage.getObject<Agent>(
            `agents/${input.agentId}.json`,
          );
          if (!agent) {
            console.warn(`Agent not found: ${input.agentId}`);
          }
        } catch (error) {
          console.warn(
            `Error checking agent existence: ${input.agentId}`,
            error,
          );
        }

        const chatHistoryPrefix = `agents/${input.agentId}/chat_history/${input.userId}/`;
        const messagesPrefix = `agents/${input.agentId}/users/${input.userId}/messages/`;

        let chatHistoryFiles;
        let messageFiles;

        try {
          [chatHistoryFiles, messageFiles] = await Promise.all([
            storage.listObjectsPaginated(chatHistoryPrefix, input.limit ?? 50),
            storage.listObjectsPaginated(messagesPrefix, input.limit ?? 50),
          ]);
        } catch (error) {
          console.error("Error listing message files:", error);
          chatHistoryFiles = { objects: [] };
          messageFiles = { objects: [] };
        }

        const messages = await Promise.all([
          ...(chatHistoryFiles.objects ?? []).map(async (obj) => {
            if (!obj.key) return null;
            try {
              return await storage.getObject<AgentMessage>(obj.key);
            } catch (err) {
              console.error(`Failed to get message: ${obj.key}`, err);
              return null;
            }
          }),
          ...(messageFiles.objects ?? []).map(async (obj) => {
            if (!obj.key) return null;
            try {
              return await storage.getObject<AgentMessage>(obj.key);
            } catch (err) {
              console.error(`Failed to get message: ${obj.key}`, err);
              return null;
            }
          }),
        ]);

        const messageMap = new Map<string, AgentMessage>();
        messages
          .filter((msg): msg is AgentMessage => msg !== null)
          .forEach((msg) => {
            const key = `${msg.content}-${msg.timestamp.getTime()}`;
            if (!messageMap.has(key)) {
              messageMap.set(key, msg);
            }
          });

        const validMessages = Array.from(messageMap.values())
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
          .slice(0, input.limit ?? 50);

        const chatSummary = await storage
          .getObject<ChatSummary>(`agents/${input.agentId}/chat_summary.json`)
          .catch(() => null);

        return {
          messages: validMessages,
          summary: chatSummary,
        };
      } catch (error) {
        console.error("Failed to retrieve chat history:", error);
        return {
          messages: [],
          summary: null,
        };
      }
    }),
});
