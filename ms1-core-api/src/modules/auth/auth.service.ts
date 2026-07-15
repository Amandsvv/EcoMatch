import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './auth.repository';
import { AppError, ErrorCodes } from '../../lib/errors';

export class AuthService {
  private repository: AuthRepository;

  constructor(repository: AuthRepository) {
    this.repository = repository;
  }

  async signup(params: any) {
    const { email, password, businessName, businessType, address, lat, lng, phone } = params;

    if (!email || !password || !businessName || !businessType || !address || lat === undefined || lng === undefined || !phone) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Missing required fields');
    }

    const existingUser = await this.repository.getUserByEmail(email);
    if (existingUser) {
      throw new AppError(ErrorCodes.USER_ALREADY_EXISTS, 409, 'User with this email already exists');
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
        lat: parseFloat(lat),
        lng: parseFloat(lng),
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
