import { MatchesRepository } from './matches.repository';
import { AppError, ErrorCodes } from '../../lib/errors';

export class MatchesService {
  private repository: MatchesRepository;

  constructor(repository: MatchesRepository) {
    this.repository = repository;
  }

  async getMatchesForBusiness(businessId: string, userId: string) {
    const business = await this.repository.getBusinessByIdAndUserId(businessId, userId);
    if (!business) {
      throw new AppError(ErrorCodes.FORBIDDEN, 403, 'Not authorized to view these matches');
    }
    return this.repository.getMatchesByBusinessId(businessId);
  }

  async getMatchDetails(matchId: string) {
    const match = await this.repository.getMatchById(matchId);
    if (!match) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    const outreachDrafts = await this.repository.getOutreachDraftsByMatchId(matchId);
    const dealEvents = await this.repository.getDealEventsByMatchId(matchId);

    return {
      match,
      outreachDrafts,
      dealEvents,
    };
  }

  async getMatchDetailsBySubmissionId(submissionId: string) {
    const match = await this.repository.getMatchBySubmissionId(submissionId);
    if (!match) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found for this submission');
    }

    const outreachDrafts = await this.repository.getOutreachDraftsByMatchId(match.id);
    const dealEvents = await this.repository.getDealEventsByMatchId(match.id);

    return {
      match,
      outreachDrafts,
      dealEvents,
    };
  }

  async getDealEventsForMatch(matchId: string) {
    return this.repository.getDealEventsByMatchId(matchId);
  }
}
