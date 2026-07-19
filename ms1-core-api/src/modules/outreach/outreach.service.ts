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

    const businessId: string = draft.recipientRole === 'source'
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
      eventType: `${draft.recipientRole}_accepted` as const,
      actorId: userId,
      description: `${draft.recipientRole} business accepted the proposal`,
    };

    // Load all drafts to check if the other side is already accepted
    const allDrafts = await this.repository.getOutreachDraftsByMatchId(draft.matchId);
    const otherDrafts = allDrafts.filter(d => d.id !== outreachDraftId);
    
    // Both sides are accepted if there is at least one other draft and all other drafts are accepted.
    const otherAllAccepted = otherDrafts.length > 0 && otherDrafts.every(d => d.status === 'accepted');

    const shouldUpdateMatch = otherAllAccepted;

    let matchBothAcceptedEvent = undefined;
    if (shouldUpdateMatch) {
      matchBothAcceptedEvent = {
        id: uuidv4(),
        matchId: draft.matchId,
        eventType: 'both_accepted' as const,
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
      logger.info('Both sides accepted — match status updated to both_accepted', {
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

    const businessId: string = draft.recipientRole === 'source'
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
      eventType: `${draft.recipientRole}_rejected` as const,
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
