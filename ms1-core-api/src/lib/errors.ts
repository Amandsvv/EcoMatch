export interface ApiErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    if (statusCode < 500) {
      delete this.stack;
    }
  }

  toResponse(): ApiErrorResponse {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export const ErrorCodes = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Business errors
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  INVALID_BUSINESS_DATA: 'INVALID_BUSINESS_DATA',

  // Submission errors
  SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
  HAZARD_FLAG_DETECTED: 'HAZARD_FLAG_DETECTED',

  // Match errors
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  MATCH_CONFIDENCE_TOO_LOW: 'MATCH_CONFIDENCE_TOO_LOW',
  INVALID_MATCH_STATE: 'INVALID_MATCH_STATE',

  // Outreach errors
  OUTREACH_DRAFT_NOT_FOUND: 'OUTREACH_DRAFT_NOT_FOUND',
  OUTREACH_UNAUTHORIZED: 'OUTREACH_UNAUTHORIZED',
  OUTREACH_INVALID_STATE: 'OUTREACH_INVALID_STATE',

  // Verification errors
  VERIFICATION_RECORD_NOT_FOUND: 'VERIFICATION_RECORD_NOT_FOUND',
  VERIFICATION_INCOMPLETE: 'VERIFICATION_INCOMPLETE',

  // Certificate errors
  CERTIFICATE_NOT_FOUND: 'CERTIFICATE_NOT_FOUND',
  CERTIFICATE_CREATION_FAILED: 'CERTIFICATE_CREATION_FAILED',

  // MS2 errors
  MS2_SERVICE_UNAVAILABLE: 'MS2_SERVICE_UNAVAILABLE',
  MS2_INVALID_RESPONSE: 'MS2_INVALID_RESPONSE',

  // General errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  DATABASE_ERROR: 'DATABASE_ERROR',
};
