import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../db';

export class CertificatesRepository {
  async getMatchById(matchId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, matchId))
      .limit(1);
    return result[0] || null;
  }

  async getVerificationRecords(matchId: string) {
    const db = getDb();
    return db
      .select()
      .from(schema.verificationRecords)
      .where(eq(schema.verificationRecords.matchId, matchId));
  }

  async getSubmissionById(submissionId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, submissionId))
      .limit(1);
    return result[0] || null;
  }

  async getMaterialClassificationBySubmissionId(submissionId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.materialClassifications)
      .where(eq(schema.materialClassifications.submissionId, submissionId))
      .limit(1);
    return result[0] || null;
  }

  async getCertificateById(certificateId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.certificates)
      .where(eq(schema.certificates.id, certificateId))
      .limit(1);
    return result[0] || null;
  }

  async getCertificateByMatchId(matchId: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(schema.certificates)
      .where(eq(schema.certificates.matchId, matchId))
      .limit(1);
    return result[0] || null;
  }

  async createCertificateAndLog(
    certificate: typeof schema.certificates.$inferInsert,
    dealEvent: typeof schema.dealEvents.$inferInsert,
    matchId: string
  ) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(schema.certificates).values(certificate);
      await tx.insert(schema.dealEvents).values(dealEvent);
      await tx
        .update(schema.matches)
        .set({ status: 'verified' })
        .where(eq(schema.matches.id, matchId));
    });
  }
}
