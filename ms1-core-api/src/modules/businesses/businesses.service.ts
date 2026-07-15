import { BusinessesRepository } from './businesses.repository';
import { AppError, ErrorCodes } from '../../lib/errors';

export class BusinessesService {
  private repository: BusinessesRepository;

  constructor(repository: BusinessesRepository) {
    this.repository = repository;
  }

  async getBusinessProfile(businessId: string) {
    const business = await this.repository.getBusinessById(businessId);
    if (!business) {
      throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, 404, 'Business not found');
    }
    return business;
  }

  async updateBusinessProfile(businessId: string, userId: string, body: any) {
    const business = await this.repository.getBusinessById(businessId);
    if (!business) {
      throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, 404, 'Business not found');
    }

    if (business.userId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 403, 'Not authorized to update this business');
    }

    const { name, type, address, lat, lng, phone } = body;

    const updates = {
      name: name || business.name,
      type: type || business.type,
      address: address || business.address,
      lat: lat !== undefined ? lat : business.lat,
      lng: lng !== undefined ? lng : business.lng,
      phone: phone || business.phone,
    };

    await this.repository.updateBusiness(businessId, updates);
    return { success: true, businessId };
  }
}
