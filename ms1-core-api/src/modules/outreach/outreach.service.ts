import { v4 as uuidv4 } from 'uuid';
import { OutreachRepository } from './outreach.repository';
import { AppError, ErrorCodes } from '../../lib/errors';
import { logger } from '../../lib/logger';

export class OutreachService {
  private repository: OutreachRepository;

  constructor(repository: OutreachRepository) {
    this.repository = repository;
  }

  async acceptOutreachDraft(outreachDraftId: string, userId: string) {
    const draft = await this.repository.getOutreachDraftById(outreachDraftId);
    if (!draft) {
      throw new AppError(ErrorCodes.OUTREACH_DRAFT_NOT_FOUND, 404, 'Outreach draft not found');
    }

    const match = await this.repository.getMatchById(draft.matchId);
    if (!match) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    let businessId: string = draft.recipientRole === 'source' 
      ? match.sourceBusinessId 
      : match.targetBusinessId;

    const business = await this.repository.getBusinessByIdAndUserId(businessId, userId);
    if (!business) {
      throw new AppError(
        ErrorCodes.OUTREACH_UNAUTHORIZED,
        403,
        'Not authorized to accept this outreach draft'
      );
    }

    const acceptEvent = {
      id: uuidv4(),
      matchId: draft.matchId,
      eventType: `${draft.recipientRole}_accepted`,
      actorId: userId,
      description: `${draft.recipientRole} business accepted the proposal`,
    };

    // Check if both sides accepted
    const allDrafts = await this.repository.getOutreachDraftsByMatchId(draft.matchId);
    const bothAccepted = allDrafts.every(d => d.status === 'accepted' || d.id === outreachDraftId);
    
    let shouldUpdateMatch = false;
    let matchBothAcceptedEvent = undefined;

    if (bothAccepted && allDrafts.filter(d => d.id !== outreachDraftId).every(d => d.status === 'accepted')) {
      shouldUpdateMatch = true;
      matchBothAcceptedEvent = {
        id: uuidv4(),
        matchId: draft.matchId,
        eventType: 'both_accepted',
        actorId: userId,
        description: 'Both businesses have accepted the proposal',
      };
    }

    await this.repository.acceptDraftAndCheckDual(
      outreachDraftId,
      userId,
      draft.matchId,
      acceptEvent,
      shouldUpdateMatch,
      matchBothAcceptedEvent
    );

    if (shouldUpdateMatch) {
      logger.info('Both sides accepted - match status updated', {
        matchId: draft.matchId,
      });
      // Stub: Logistics scheduling
      logger.info('Logistics scheduling stub - would assign hauler and schedule pickup', {
        matchId: draft.matchId,
      });
    }

    return { success: true, outreachDraftId, draftStatus: 'accepted' };
  }

  async rejectOutreachDraft(outreachDraftId: string, userId: string) {
    const draft = await this.repository.getOutreachDraftById(outreachDraftId);
    if (!draft) {
      throw new AppError(ErrorCodes.OUTREACH_DRAFT_NOT_FOUND, 404, 'Outreach draft not found');
    }

    const match = await this.repository.getMatchById(draft.matchId);
    if (!match) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    let businessId: string = draft.recipientRole === 'source' 
      ? match.sourceBusinessId 
      : match.targetBusinessId;

    const business = await this.repository.getBusinessByIdAndUserId(businessId, userId);
    if (!business) {
      throw new AppError(
        ErrorCodes.OUTREACH_UNAUTHORIZED,
        403,
        'Not authorized to reject this outreach draft'
      );
    }

    const rejectEvent = {
      id: uuidv4(),
      matchId: draft.matchId,
      eventType: `${draft.recipientRole}_rejected`,
      actorId: userId,
      description: `${draft.recipientRole} business rejected the proposal`,
    };

    await this.repository.rejectDraftAndMatch(
      outreachDraftId,
      userId,
      draft.matchId,
      rejectEvent
    );

    return { success: true, outreachDraftId, draftStatus: 'rejected', matchStatus: 'rejected' };
  }

  async getOutreachDraft(outreachDraftId: string) {
    const draft = await this.repository.getOutreachDraftById(outreachDraftId);
    if (!draft) {
      throw new AppError(ErrorCodes.OUTREACH_DRAFT_NOT_FOUND, 404, 'Outreach draft not found');
    }
    return draft;
  }
}
