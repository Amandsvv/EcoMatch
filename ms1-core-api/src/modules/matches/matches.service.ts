import { v4 as uuidv4 } from 'uuid';
import { MatchesRepository } from './matches.repository';
import { AppError, ErrorCodes } from '../../lib/errors';
import { logger } from '../../lib/logger';
import MS2Client from '../../lib/ms2Client';
import { sendEmail } from '../../lib/mailer';
import { matchProposalEmailHtml } from '../../lib/email-templates';

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
    const logisticsBooking = await this.repository.getLogisticsBookingByMatchId(matchId);

    // Enrich with business names for display purposes
    const sourceBusiness = await this.repository.getBusinessById(match.sourceBusinessId);
    const targetBusiness = await this.repository.getBusinessById(match.targetBusinessId);

    return {
      match: {
        ...match,
        sourceBusinessName: sourceBusiness?.name || 'Source Business',
        sourceBusinessType: sourceBusiness?.type || '',
        targetBusinessName: targetBusiness?.name || 'Target Business',
        targetBusinessType: targetBusiness?.type || '',
      },
      outreachDrafts,
      dealEvents,
      logisticsBooking,
    };
  }

  async getMatchDetailsBySubmissionId(submissionId: string) {
    const match = await this.repository.getMatchBySubmissionId(submissionId);
    if (!match) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found for this submission');
    }

    const outreachDrafts = await this.repository.getOutreachDraftsByMatchId(match.id);
    const dealEvents = await this.repository.getDealEventsByMatchId(match.id);
    const logisticsBooking = await this.repository.getLogisticsBookingByMatchId(match.id);

    // Enrich with business names for display purposes
    const sourceBusiness = await this.repository.getBusinessById(match.sourceBusinessId);
    const targetBusiness = await this.repository.getBusinessById(match.targetBusinessId);

    return {
      match: {
        ...match,
        sourceBusinessName: sourceBusiness?.name || 'Source Business',
        sourceBusinessType: sourceBusiness?.type || '',
        targetBusinessName: targetBusiness?.name || 'Target Business',
        targetBusinessType: targetBusiness?.type || '',
      },
      outreachDrafts,
      dealEvents,
      logisticsBooking,
    };
  }


  async getDealEventsForMatch(matchId: string) {
    return this.repository.getDealEventsByMatchId(matchId);
  }

  async draftProposal(matchId: string, userId: string): Promise<any> {
    const match = await this.repository.getMatchById(matchId);
    if (!match) {
      throw new AppError(ErrorCodes.MATCH_NOT_FOUND, 404, 'Match not found');
    }

    // Verify user owns either the source business or target business
    const sourceBusiness = await this.repository.getBusinessById(match.sourceBusinessId);
    const targetBusiness = await this.repository.getBusinessById(match.targetBusinessId);
    if (!sourceBusiness || !targetBusiness) {
      throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, 404, 'Business not found');
    }

    if (sourceBusiness.userId !== userId && targetBusiness.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 403, 'Not authorized to draft proposal for this match');
    }

    // Load classification details
    const classification = await this.repository.getClassificationBySubmissionId(match.submissionId);
    if (!classification) {
      throw new AppError(ErrorCodes.SUBMISSION_NOT_FOUND, 404, 'Classification not found');
    }

    // Call Negotiator Agent to draft proposals
    const ms2Client = new MS2Client(process.env.MS2_BASE_URL);
    let draftResult;
    try {
      draftResult = await ms2Client.draft({
        match: {
          sourceBusinessId: match.sourceBusinessId,
          targetBusinessId: match.targetBusinessId,
          estimatedSourceSavings: match.estimatedSourceSavings || 0,
          estimatedTargetSavingsPct: match.estimatedTargetSavingsPct || 0,
          classification: {
            primaryCategory: classification.primaryCategory,
            subtype: classification.subtype || undefined,
            estimatedComposition: typeof classification.estimatedComposition === 'string'
              ? JSON.parse(classification.estimatedComposition)
              : classification.estimatedComposition,
            confidence: classification.confidence,
          }
        },
        sourceBusiness: {
          name: sourceBusiness.name,
          type: sourceBusiness.type,
        },
        targetBusiness: {
          name: targetBusiness.name,
          type: targetBusiness.type,
        },
      });
    } catch (error: any) {
      logger.error('Draft service call failed', { error: error.message, response: error.response?.data });
      throw new AppError(
        ErrorCodes.MS2_SERVICE_UNAVAILABLE,
        503,
        'Draft service is currently unavailable'
      );
    }

    const sourceDraftId = uuidv4();
    const targetDraftId = uuidv4();
    const draftsRecords = [
      {
        id: sourceDraftId,
        matchId,
        recipientRole: 'source' as const,
        draftMessage: draftResult.sourceDraft.message,
        proposedTerms: JSON.stringify(draftResult.sourceDraft.terms),
        status: 'pending' as const,
        notifiedAt: null,
      },
      {
        id: targetDraftId,
        matchId,
        recipientRole: 'target' as const,
        draftMessage: draftResult.targetDraft.message,
        proposedTerms: JSON.stringify(draftResult.targetDraft.terms),
        status: 'pending' as const,
        notifiedAt: null,
      },
    ];

    const dealEventRecord = {
      id: uuidv4(),
      matchId,
      eventType: 'match_proposed' as const,
      actorId: userId,
      description: `AI proposal drafted by Negotiator. Price: ${draftResult.sourceDraft.terms.pricePerUnit}`,
    };

    await this.repository.saveDraftsAndLogEvent(draftsRecords, dealEventRecord, match.submissionId);

    // Send real SES notifications
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const dashboardUrl = `${frontendUrl}/dashboard`;

    Promise.all([
      this.repository.getUserById(sourceBusiness.userId),
      this.repository.getUserById(targetBusiness.userId)
    ]).then(([sourceUser, targetUser]) => {
      if (sourceUser?.email) {
        sendEmail(
          sourceUser.email,
          '♻️ New Symbiosis Match Proposed',
          matchProposalEmailHtml({
            businessName: sourceBusiness.name,
            partnerBusinessName: targetBusiness.name,
            matchRationale: match.matchRationale,
            matchConfidence: match.matchConfidence,
            estimatedSavings: match.estimatedSourceSavings,
            proposedTerms: draftResult.sourceDraft.terms,
            draftMessage: draftResult.sourceDraft.message,
            dashboardUrl,
            role: 'source'
          })
        ).catch(err => logger.error('Failed to send source match proposal email', { error: err.message }));
      }

      if (targetUser?.email) {
        sendEmail(
          targetUser.email,
          '♻️ New Symbiosis Match Proposed',
          matchProposalEmailHtml({
            businessName: targetBusiness.name,
            partnerBusinessName: sourceBusiness.name,
            matchRationale: match.matchRationale,
            matchConfidence: match.matchConfidence,
            estimatedSavings: null,
            proposedTerms: draftResult.targetDraft.terms,
            draftMessage: draftResult.targetDraft.message,
            dashboardUrl,
            role: 'target'
          })
        ).catch(err => logger.error('Failed to send target match proposal email', { error: err.message }));
      }
    }).catch(err => {
      logger.error('Failed to resolve users for match email notifications', { error: err.message });
    });

    return {
      matchId,
      outreachDrafts: draftsRecords,
      status: 'proposal_drafted',
    };
  }
}
