import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

interface ClassifyRequest {
  submissionId: string;
  rawDescription: string;
  photoRefs?: string[];
  disposalCostPerUnit: number;
  disposalFrequency: string;
}

interface ClassifyResponse {
  submissionId: string;
  primaryCategory: string;
  subtype?: string;
  estimatedComposition?: Record<string, unknown>;
  confidence: number;
  hazardFlag: boolean;
  needsFollowup: boolean;
  followupQuestion?: string;
}

interface MatchRequest {
  classification: {
    primaryCategory: string;
    subtype?: string;
    estimatedComposition?: Record<string, unknown>;
    confidence: number;
    hazardFlag: boolean;
  };
  sourceBusinessLocation: {
    lat: number;
    lng: number;
  };
  sourceBusinessType: string;
  sourceBusinessId: string;
}

interface MatchResponse {
  targetBusinessId: string;
  matchRationale: string;
  matchConfidence: number;
  distanceKm: number;
  estimatedSourceSavings: number;
  estimatedTargetSavingsPct: number;
  noCandidatesInRadius?: boolean;
}

interface DraftRequest {
  match: {
    sourceBusinessId: string;
    targetBusinessId: string;
    estimatedSourceSavings: number;
    estimatedTargetSavingsPct: number;
  };
  sourceBusiness: {
    name: string;
    type: string;
  };
  targetBusiness: {
    name: string;
    type: string;
  };
}

interface DraftResponse {
  sourceDraft: {
    message: string;
    terms: Record<string, unknown>;
  };
  targetDraft: {
    message: string;
    terms: Record<string, unknown>;
  };
}

interface VerifyRequest {
  matchId: string;
  disposalCostPerUnit: number;
  disposalFrequency: string;
  primaryCategory: string;
  estimatedComposition?: Record<string, unknown>;
}

interface VerifyResponse {
  co2eAvoidedKg: number;
  dollarsSaved: number;
  methodologyReference: string;
}

export class MS2Client {
  private client: AxiosInstance;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
  }

  async classify(request: ClassifyRequest): Promise<ClassifyResponse> {
    const startTime = Date.now();
    try {
      logger.info('MS2 classify request', { submissionId: request.submissionId });
      const response = await this.client.post<ClassifyResponse>('/classify', request);
      const latency = Date.now() - startTime;
      logger.info('MS2 classify response', {
        submissionId: request.submissionId,
        latency,
        confidence: response.data.confidence,
        hazardFlag: response.data.hazardFlag,
      });
      return response.data;
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('MS2 classify failed', {
        submissionId: request.submissionId,
        latency,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async match(request: MatchRequest): Promise<MatchResponse | null> {
    const startTime = Date.now();
    try {
      logger.info('MS2 match request', { sourceBusinessId: request.sourceBusinessId });
      const response = await this.client.post<MatchResponse>('/match', request);
      const latency = Date.now() - startTime;
      logger.info('MS2 match response', {
        sourceBusinessId: request.sourceBusinessId,
        latency,
        matchConfidence: response.data.matchConfidence,
        noCandidatesInRadius: response.data.noCandidatesInRadius,
      });
      return response.data;
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('MS2 match failed', {
        sourceBusinessId: request.sourceBusinessId,
        latency,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async draft(request: DraftRequest): Promise<DraftResponse> {
    const startTime = Date.now();
    try {
      logger.info('MS2 draft request', {
        sourceBusinessId: request.match.sourceBusinessId,
        targetBusinessId: request.match.targetBusinessId,
      });
      const response = await this.client.post<DraftResponse>('/draft', request);
      const latency = Date.now() - startTime;
      logger.info('MS2 draft response', {
        sourceBusinessId: request.match.sourceBusinessId,
        targetBusinessId: request.match.targetBusinessId,
        latency,
      });
      return response.data;
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('MS2 draft failed', {
        sourceBusinessId: request.match.sourceBusinessId,
        targetBusinessId: request.match.targetBusinessId,
        latency,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    const startTime = Date.now();
    try {
      logger.info('MS2 verify request', { matchId: request.matchId });
      const response = await this.client.post<VerifyResponse>('/verify', request);
      const latency = Date.now() - startTime;
      logger.info('MS2 verify response', {
        matchId: request.matchId,
        latency,
        co2eAvoidedKg: response.data.co2eAvoidedKg,
      });
      return response.data;
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error('MS2 verify failed', {
        matchId: request.matchId,
        latency,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default MS2Client;
