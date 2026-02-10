/**
 * Shared type definitions for Psion cross-system perk data.
 * Used by both server route responses and client UI rendering.
 */

export interface PsionMarketInsight {
  sellerUrgency?: 'Low' | 'Medium' | 'High';
  priceTrend?: 'rising' | 'stable' | 'falling';
}

export interface PsionElectionInsight {
  sincerityScore?: number;
  projection?: Array<{
    candidateId: string;
    candidateName: string;
    votePercentage: number;
    trend: string;
  }>;
}

export interface PsionProfileInsight {
  emotionalState?: string;
}

export interface PsionDiplomacyInsight {
  credibility?: {
    credible: boolean;
    brokenTreaties: number;
    reason?: string;
  };
  tensionIndex?: {
    tensionIndex: number;
    factors: string[];
    assessment: string;
  };
}
