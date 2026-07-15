import { v4 as uuidv4 } from 'uuid';
import { AdminRepository } from './admin.repository';
import { AppError, ErrorCodes } from '../../lib/errors';

export class AdminService {
  private repository: AdminRepository;

  constructor(repository: AdminRepository) {
    this.repository = repository;
  }

  async getVerificationQueue() {
    return this.repository.getUnconfirmedVerificationRecords();
  }

  async getLowConfidenceMatches() {
    const matches = await this.repository.getProposedMatches();
    return matches.filter((m) => m.matchConfidence < 0.75);
  }

  async getMonitoringEvents() {
    return this.repository.getDealEventsOrdered();
  }

  async getHaulers() {
    return this.repository.getHaulers();
  }

  async createHauler(name: string, contact: string, serviceArea: string) {
    if (!name || !contact || !serviceArea) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Missing required fields');
    }

    const haulerId = uuidv4();
    const hauler = {
      id: haulerId,
      name,
      contact,
      serviceArea,
    };

    await this.repository.createHauler(hauler);
    return hauler;
  }

  async getAuditLog() {
    return this.repository.getAuditLog();
  }

  async getBusinesses() {
    return this.repository.getBusinesses();
  }
}
