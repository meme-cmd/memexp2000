import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { storage } from "./r2";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import type { Backroom } from "@/types/backroom";
import Together from "together-ai";
import type { Agent } from "@/types/agent";
import { env } from "@/env";

const together = new Together({ apiKey: env.TOGETHER_API });

// Define type for token parameters
interface TokenParameters {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  description: string;
}

// Define OpenAI API response types
interface OpenAIMessage {
  role: string;
  content: string;
}

interface OpenAIChoice {
  message: OpenAIMessage;
  index: number;
  finish_reason: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Create Zod schema for token parameters validation
const TokenParametersSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  supply: z.number(),
  description: z.string(),
});

// Add type for PumpFun options
interface PumpFunTokenOptions {
  twitter?: string;
  telegram?: string;
  website?: string;
  initialLiquiditySOL?: number;
  slippageBps?: number;
  priorityFee?: number;
}

export const backroomRouter = createTRPCRouter({
  start: publicProcedure
    .input(z.object({ backroomId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const backroom = await storage.getObject<Backroom>(
          `backrooms/${input.backroomId}.json`,
        );

        if (backroom.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Conversation already started",
          });
        }

        const updatedBackroom: Backroom = {
          ...backroom,
          status: "active",
          updatedAt: new Date(),
        };

        await storage.saveObject(
          `backrooms/${backroom.id}.json`,
          updatedBackroom,
        );
        return { success: true };
      } catch (error) {
        console.error("Failed to start conversation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start conversation",
          cause: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),

  generateNextMessage: publicProcedure
    .input(z.object({ backroomId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const backroom = await storage.getObject<Backroom>(
          `backrooms/${input.backroomId}.json`,
        );

        if (!backroom) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Backroom not found",
          });
        }

        if (
          backroom.status !== "active" ||
          backroom.messages.length >= backroom.messageLimit
        ) {
          // Automatically start the backroom if it's in pending state
          if (backroom.status === "pending") {
            backroom.status = "active";
            await storage.saveObject(`backrooms/${backroom.id}.json`, backroom);
          } else {
            return { success: false };
          }
        }

        const agentIndex = backroom.messages.length % backroom.agents.length;
        const agentId = backroom.agents[agentIndex];
        const agent = await storage.getObject<Agent>(`agents/${agentId}.json`);

        if (!agent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        const history = backroom.messages
          .map((msg) => {
            const speaker =
              msg.agentId === agentId ? agent.name : "Other Agent";
            return `${speaker}: ${msg.content}`;
          })
          .join("\n");

        const systemPrompt = `You are ${agent.name} having a natural conversation about "${backroom.topic}".

YOUR EXACT PERSONALITY (DO NOT DEVIATE):
• Core Personality: ${agent.personality}
• Unique Quirks: ${agent.quirks}
• Communication Style: ${agent.communicationStyle}
• Key Beliefs: ${agent.coreBeliefs}
• Background: ${agent.background}
• Expertise: ${agent.expertise}
• Traits: ${agent.traits.join(", ")}

CONVERSATION RULES:
- Express your personality through your unique quirks and communication style
- Keep your responses casual and human-like, as if chatting with friends
- Stay true to your beliefs and background
- Keep responses under 3 sentences
- Don't prefix responses with your name
- Respond naturally to others while staying on topic: ${backroom.topic}

${
  backroom.messages.length >= backroom.messageLimit - 1
    ? `IMPORTANT: This is your final message in the conversation. Provide a thoughtful conclusion or closing perspective that wraps up your involvement in the discussion.`
    : ""
}

Previous chat:
${history}`;

        const response = await together.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                backroom.messages.length >= backroom.messageLimit - 1
                  ? `Provide your final thoughts on ${backroom.topic}, offering a conclusion that reflects your personality and perspective.`
                  : `Continue the discussion about ${backroom.topic}, responding naturally while expressing your unique personality traits and quirks.`,
            },
          ],
          model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
          max_tokens:
            backroom.messages.length >= backroom.messageLimit - 1 ? 200 : 150,
          temperature: 0.8,
          top_p: 0.7,
          top_k: 50,
          repetition_penalty: 1.1,
          stop: ["\\n", ":", agent.name],
          stream: false,
        });

        let messageContent = response.choices[0]?.message?.content ?? "";

        // Clean up the response while preserving personality quirks
        messageContent = messageContent
          .replace(new RegExp(`^${agent.name}:?\\s*`, "i"), "")
          .replace(/^["']|["']$/g, "")
          .trim();

        // Ensure the message isn't cut off
        if (!/[.!?]$/.exec(messageContent)) {
          messageContent += ".";
        }

        const newMessage = {
          id: uuidv4(),
          agentId: agent.id,
          content: messageContent,
          timestamp: new Date(),
          metadata: {
            tokensUsed: messageContent.length,
            latency: Date.now() - new Date(backroom.updatedAt).getTime(),
            isLastMessage:
              backroom.messages.length >= backroom.messageLimit - 1,
            agentName: agent.name,
            agentType: agent.type,
            messageNumber: backroom.messages.length + 1,
            totalMessages: backroom.messageLimit,
          },
        };

        backroom.messages.push(newMessage);
        backroom.updatedAt = new Date();

        // Handle conversation completion
        if (backroom.messages.length >= backroom.messageLimit) {
          backroom.status = "completed";

          // Store conversation summary
          const conversationSummary = {
            id: backroom.id,
            topic: backroom.topic,
            participants: backroom.agents,
            messageCount: backroom.messages.length,
            duration: Date.now() - new Date(backroom.createdAt).getTime(),
            completedAt: new Date(),
            status: "completed",
          };

          await storage.saveObject(
            `backrooms/${backroom.id}/summary.json`,
            conversationSummary,
          );

          // Store detailed conversation history
          const conversationHistory = {
            ...backroom,
            analytics: {
              averageResponseTime:
                backroom.messages.reduce(
                  (acc, msg) => acc + (msg.metadata?.latency ?? 0),
                  0,
                ) / backroom.messages.length,
              participantStats: backroom.agents.map((agentId) => ({
                agentId,
                messageCount: backroom.messages.filter(
                  (m) => m.agentId === agentId,
                ).length,
                averageResponseLength:
                  backroom.messages
                    .filter((m) => m.agentId === agentId)
                    .reduce((acc, msg) => acc + msg.content.length, 0) /
                  backroom.messages.filter((m) => m.agentId === agentId).length,
              })),
            },
          };

          await storage.saveObject(
            `backrooms/${backroom.id}/history.json`,
            conversationHistory,
          );
        }

        // Save the updated backroom
        await storage.saveObject(`backrooms/${backroom.id}.json`, backroom);

        return {
          success: true,
          message: newMessage,
          isCompleted: backroom.status === "completed",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate message",
          cause: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),

  launchToken: publicProcedure
    .input(
      z.object({
        backroomId: z.string(),
        walletPublicKey: z.string(), // Add user's wallet public key as input
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const backroom = await storage.getObject<Backroom>(
          `backrooms/${input.backroomId}.json`,
        );

        if (!backroom) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Backroom not found",
          });
        }

        if (backroom.status !== "completed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Backroom conversation must be completed before launching a token",
          });
        }

        // Check if a token has already been launched for this backroom
        let existingToken = null;
        try {
          existingToken = await storage.getObject(
            `backrooms/${backroom.id}/token.json`,
          );

          if (existingToken) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A token has already been launched for this backroom",
            });
          }
        } catch (error) {
          // If there's an error finding the token, it likely doesn't exist, which is what we want
          if (
            !(error instanceof Error && error.message.includes("not found"))
          ) {
            console.error(
              `Error checking for existing token in backroom ${backroom.id}:`,
              error,
            );
            throw error;
          }
        }

        // Find the agent with token launching capability
        let tokenLaunchingAgentId: string | undefined;
        let tokenLaunchingAgent: Agent | undefined;

        // Check each agent in the backroom
        for (const agentId of backroom.agents) {
          const agent = await storage.getObject<Agent>(
            `agents/${agentId}.json`,
          );
          if (agent?.canLaunchToken) {
            tokenLaunchingAgentId = agentId;
            tokenLaunchingAgent = agent;
            break;
          }
        }

        if (!tokenLaunchingAgentId || !tokenLaunchingAgent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No agent with token launching capability found in this backroom",
          });
        }

        // Get the creator of the token launching agent
        const creatorPublicKey = tokenLaunchingAgent.creator;

        // Verify that the user's wallet matches the creator's wallet
        if (input.walletPublicKey !== creatorPublicKey) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Only the creator of the token launching agent can launch the token",
          });
        }

        // We'll prepare transaction instructions to be signed by the user client-side
        // We won't use our own private key for token launching anymore

        // Get the complete conversation history
        let history;
        try {
          history = await storage.getObject<Backroom>(
            `backrooms/${backroom.id}/history.json`,
          );

          if (!history?.messages?.length || !Array.isArray(history.messages)) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Invalid conversation history format",
            });
          }
        } catch (error) {
          console.error(
            `Failed to load conversation history for backroom ${backroom.id}:`,
            error,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to load conversation history",
          });
        }

        // Convert the conversation to a format suitable for analysis
        const conversationText = history.messages
          .map((msg) => {
            const agent = history.agents.find((a) => a === msg.agentId);
            return `${agent}: ${msg.content}`;
          })
          .join("\n");

        // Use OpenAI to analyze the conversation and generate token details
        const tokenResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: `You are an AI designed to analyze conversations and suggest appropriate token parameters. 
                Based on the conversation topic and content, suggest a name, symbol, decimals, and supply for a token.
                Return your response as a valid JSON object with the following structure:
                {
                  "name": "Token Name",
                  "symbol": "SYMBOL",
                  "decimals": 9,
                  "supply": 1000000000,
                  "description": "Brief description of what this token represents based on the conversation"
                }
                
                IMPORTANT CONSTRAINTS:
                - Keep the description VERY SHORT (maximum 64 characters)
                - Symbol should be 3-5 characters only and in ALL CAPS
                - Token name should be concise (under 32 characters)
                
                Do not include any markdown formatting, code blocks, or explanations in your response. 
                Your entire response must be a valid JSON object.`,
                },
                {
                  role: "user",
                  content: `Based on the following conversation about "${backroom.topic}", suggest parameters for a token launch:\n\n${conversationText}`,
                },
              ],
              temperature: 0.7,
            }),
          },
        );

        if (!tokenResponse.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to analyze conversation for token parameters",
          });
        }

        const tokenData = (await tokenResponse.json()) as OpenAIResponse;

        if (
          !tokenData.choices ||
          tokenData.choices.length === 0 ||
          !tokenData.choices[0].message?.content
        ) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid response from token analysis",
          });
        }

        // Parse and validate token parameters
        let tokenParams: TokenParameters;
        try {
          let jsonContent = tokenData.choices[0].message.content.trim();

          // Remove any markdown code block formatting if present
          if (jsonContent.startsWith("```")) {
            const startIndex = jsonContent.indexOf("\n") + 1;
            const endIndex = jsonContent.lastIndexOf("```");
            if (endIndex > startIndex) {
              jsonContent = jsonContent.substring(startIndex, endIndex).trim();
            } else {
              // Just remove the first line if we can't find the closing tag
              jsonContent = jsonContent.substring(startIndex).trim();
            }
          }

          // Remove any "json" language marker if present
          jsonContent = jsonContent.replace(/^json\s*/, "");

          const parsedContent = JSON.parse(jsonContent) as Record<
            string,
            unknown
          >;

          // Validate and enforce constraints before validation
          // Truncate description if too long
          if (typeof parsedContent.description === "string") {
            parsedContent.description = parsedContent.description.substring(
              0,
              64,
            );
          }

          // Ensure symbol is valid
          if (typeof parsedContent.symbol === "string") {
            parsedContent.symbol = parsedContent.symbol
              .toUpperCase()
              .substring(0, 5);
          }

          // Ensure name is not too long
          if (typeof parsedContent.name === "string") {
            parsedContent.name = parsedContent.name.substring(0, 32);
          }

          tokenParams = TokenParametersSchema.parse(parsedContent);
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to parse token parameters from AI response",
            cause: error instanceof Error ? error.message : "Unknown error",
          });
        }

        try {
          // Prepare token parameters for client-side token launch
          const pumpFunOptions: PumpFunTokenOptions = {
            twitter: `@${tokenParams.symbol.toLowerCase()}token`,
            telegram: `t.me/${tokenParams.symbol.toLowerCase()}`,
            website: `https://makewithzync.com/tokens/${backroom.id}`,
            initialLiquiditySOL: 0.01, // Reduced liquidity amount (was 0.1)
            slippageBps: 10, // Default slippage
            priorityFee: 0.0001, // Default priority fee
          };

          // Generate a placeholder image URL based on token name
          // Note: This URL is just a fallback; the client should use the user's image when available
          const imageUrl = `https://picsum.photos/seed/${tokenParams.name.replace(/\s+/g, "")}/300/300`;

          // Instead of launching the token directly, we'll return the parameters
          // for the client to handle the token launch with the user's wallet
          const launchParams = {
            tokenName: tokenParams.name,
            tokenSymbol: tokenParams.symbol,
            tokenDescription: tokenParams.description,
            imageUrl, // This will be used as fallback if no user image is provided
            pumpFunOptions,
            decimals: tokenParams.decimals,
            supply: tokenParams.supply,
            backroomId: backroom.id,
          };

          // Store a pending token record
          const pendingTokenInfo = {
            name: tokenParams.name,
            symbol: tokenParams.symbol,
            decimals: tokenParams.decimals,
            supply: tokenParams.supply,
            description: tokenParams.description,
            backroomId: backroom.id,
            topic: backroom.topic,
            createdAt: new Date(),
            status: "pending",
            creator: creatorPublicKey,
          };

          try {
            await storage.saveObject(
              `backrooms/${backroom.id}/pending_token.json`,
              pendingTokenInfo,
            );
          } catch (saveError) {
            // Continue despite error since we can still return the launch params to the client
          }

          return {
            success: true,
            launchParams,
            pendingTokenInfo,
          };
        } catch (deployError) {
          console.error("Token deployment error:", deployError);

          // Check if it's an "insufficient funds" error
          const errorMessage =
            deployError instanceof Error
              ? deployError.message
              : "Unknown error";

          if (
            errorMessage.includes(
              "Attempt to debit an account but found no record of a prior credit",
            )
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Not enough SOL in the account to pay for transaction fees. Please add SOL to your wallet first.",
              cause: errorMessage,
            });
          } else if (errorMessage.includes("Simulation failed")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Transaction simulation failed. This might be due to insufficient funds or an issue with the token parameters.",
              cause: errorMessage,
            });
          } else {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to deploy token. Please try again later.",
              cause: errorMessage,
            });
          }
        }
      } catch (error) {
        console.error("Failed to launch token:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error && error instanceof TRPCError
              ? error.message
              : "Failed to launch token",
          cause: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),

  saveTokenResult: publicProcedure
    .input(
      z.object({
        backroomId: z.string(),
        tokenInfo: z.object({
          mint: z.string(),
          name: z.string(),
          symbol: z.string(),
          description: z.string(),
          pumpfun: z.object({
            signature: z.string(),
            metadataUri: z.string(),
          }),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const backroom = await storage.getObject<Backroom>(
          `backrooms/${input.backroomId}.json`,
        );

        if (!backroom) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Backroom not found",
          });
        }

        // Get pending token info to add additional details
        let pendingTokenInfo: Record<string, unknown> | null = null;
        try {
          pendingTokenInfo = await storage.getObject(
            `backrooms/${backroom.id}/pending_token.json`,
          );
        } catch {
          // It's okay if there's no pending token
        }

        // Create final token record
        const completeTokenInfo = {
          ...input.tokenInfo,
          backroomId: backroom.id,
          topic: backroom.topic,
          launchedAt: new Date(),
          // Add any additional fields from pending token if available
          ...(pendingTokenInfo
            ? {
                decimals: pendingTokenInfo.decimals,
                supply: pendingTokenInfo.supply,
                creator: pendingTokenInfo.creator,
              }
            : {}),
        };

        // Save the final token info
        await storage.saveObject(
          `backrooms/${backroom.id}/token.json`,
          completeTokenInfo,
        );

        // Clean up the pending token info - instead of deleting, we'll mark it as processed
        try {
          // Since we don't have deleteObject, we'll mark it as processed instead
          const processedToken = {
            ...pendingTokenInfo,
            status: "processed",
            processedAt: new Date(),
          };

          await storage.saveObject(
            `backrooms/${backroom.id}/pending_token.json`,
            processedToken,
          );
        } catch (error) {
          // It's okay if this fails
        }

        return {
          success: true,
          tokenInfo: completeTokenInfo,
        };
      } catch (error) {
        console.error("Failed to save token result:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save token result",
          cause: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
});
