export interface ChatAnalytics {
  mainTopics: string[];
  agentBehaviorAnalysis: Record<
    string,
    {
      cognitivePatterns: string;
      emotionalResponses: string;
      biasesObserved: string[];
      adaptabilityScore: number;
      consistencyWithRole: string;
      uniqueCharacteristics: string[];
    }
  >;
  interactionDynamics: {
    powerDynamics: string;
    influencePatterns: string[];
    groupPolarization: string;
    cognitiveAlignment: string;
  };
  experimentMetrics: {
    ideaDiversity: number;
    conversationDepth: number;
    emotionalIntelligence: number;
    logicalConsistency: number;
    creativityScore: number;
  };
  emergentBehaviors: string[];
  researchImplications: string[];
  summary: {
    mainConclusions: string[];
    keyDiscussionPoints: string[];
    agreements: string[];
    disagreements: string[];
    overallTone: string;
    suggestedNextTopics: string[];
  };
}
