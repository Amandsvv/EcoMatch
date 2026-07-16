import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './auth.repository';
import { AppError, ErrorCodes } from '../../lib/errors';

import { logger } from '../../lib/logger';

export class AuthService {
  private repository: AuthRepository;

  constructor(repository: AuthRepository) {
    this.repository = repository;
  }

  async signup(params: any) {
    const { email, password, businessName, businessType, address, lat, lng, phone, state, area, pincode } = params;

    if (!email || !password || !businessName || !businessType || !address || !phone) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Missing required fields');
    }

    const existingUser = await this.repository.getUserByEmail(email);
    if (existingUser) {
      throw new AppError(ErrorCodes.USER_ALREADY_EXISTS, 409, 'User with this email already exists');
    }

    let latitude = lat;
    let longitude = lng;

    if (latitude === undefined || longitude === undefined) {
      if (!state || !area || !pincode) {
        throw new AppError(
          ErrorCodes.INVALID_REQUEST,
          400,
          'Location coordinates are missing. Please provide latitude/longitude, or address details (state, area, pincode) for geocoding.'
        );
      }

      const apiKey = process.env.OPENCAGE_API_KEY;
      if (!apiKey || apiKey === 'your_opencage_api_key_here') {
        logger.warn('OpenCage API key is not configured. Falling back to default mock coordinates.');
        latitude = 40.715 + (Math.random() - 0.5) * 0.01;
        longitude = -74.008 + (Math.random() - 0.5) * 0.01;
      } else {
        const query = `${address}, ${area}, ${state}, ${pincode}`;
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}`;
        
        try {
          const axios = require('axios');
          const geoRes = await axios.get(url);
          if (geoRes.data && geoRes.data.results && geoRes.data.results.length > 0) {
            latitude = geoRes.data.results[0].geometry.lat;
            longitude = geoRes.data.results[0].geometry.lng;
          } else {
            throw new Error('No coordinates found for the provided location');
          }
        } catch (error: any) {
          throw new AppError(
            ErrorCodes.INVALID_REQUEST,
            400,
            `Geocoding failed: ${error.message || 'Unknown geocoding error'}`
          );
        }
      }
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = uuidv4();
    const businessId = uuidv4();

    await this.repository.createUserAndBusiness(
      {
        id: userId,
        email,
        passwordHash,
        role: 'business',
      },
      {
        id: businessId,
        userId,
        name: businessName,
        type: businessType,
        address,
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        phone,
      }
    );

    const token = jwt.sign(
      { userId, role: 'business', email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return { token, userId, businessId };
  }

  async login(params: any) {

    const { email, password } = params;

    if (!email || !password) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Email and password are required');
    }

    const user = await this.repository.getUserByEmail(email);
    if (!user) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 401, 'Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 401, 'Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    let businessId = null;
    if (user.role === 'business') {
      const business = await this.repository.getBusinessByUserId(user.id);
      if (business) {
        businessId = business.id;
      }
    }

    return { token, userId: user.id, businessId, role: user.role };
  }
}
