import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './auth.repository';
import { AppError, ErrorCodes } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { sendEmail } from '../../lib/mailer';
import { verificationEmailHtml, resetPasswordEmailHtml } from '../../lib/email-templates';

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
          logger.warn(`Geocoding failed: ${error.message || 'Unknown geocoding error'}. Falling back to default coordinates (Delhi/Gurugram).`);
          latitude = 28.4595;
          longitude = 77.0266;
        }
      }
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = uuidv4();
    const businessId = uuidv4();

    const verificationToken = uuidv4();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.repository.createUserAndBusiness(
      {
        id: userId,
        email,
        passwordHash,
        role: 'business',
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
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

    // Send verification email in background
    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.SERVER_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://api.ecomatch.store'
        : `http://localhost:${process.env.PORT || 4000}`);
    const verifyUrl = `${backendUrl}/auth/verify-email?token=${verificationToken}`;
    
    sendEmail(
      email,
      `Verify your EcoMatch account — ${businessName}`,
      verificationEmailHtml(businessName, verifyUrl)
    ).catch((err) => {
      logger.error('Failed to send verification email', { email, error: err.message });
    });

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
      logger.warn('Login failed: email not registered', { email });
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 401, 'Email not registered');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      logger.warn('Login failed: password mismatch', { email, userId: user.id });
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 401, 'Invalid credentials');
    }

    if (!user.emailVerified) {
      logger.warn('Login failed: email not verified', { email, userId: user.id });
      throw new AppError(ErrorCodes.UNAUTHORIZED, 401, 'Please verify your email address before logging in.');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    let businessId = null;
    let businessName = null;
    if (user.role === 'business') {
      const business = await this.repository.getBusinessByUserId(user.id);
      if (business) {
        businessId = business.id;
        businessName = business.name;
      }
    }

    return { token, userId: user.id, email: user.email, businessId, businessName, role: user.role };
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Verification token is required');
    }

    const user = await this.repository.getUserByVerificationToken(token);
    if (!user) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Invalid or expired verification token');
    }

    if (!user.emailVerified) {
      const expiry = user.emailVerificationExpiry;
      if (expiry && Date.now() > new Date(expiry).getTime()) {
        throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Verification token has expired');
      }

      await this.repository.markEmailVerified(user.id);
      logger.info('Email verified successfully', { userId: user.id, email: user.email });
    } else {
      logger.info('Email was already verified', { userId: user.id, email: user.email });
    }

    // Generate JWT token so the frontend can automatically log the user in
    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    let businessId = null;
    let businessName = null;
    if (user.role === 'business') {
      const business = await this.repository.getBusinessByUserId(user.id);
      if (business) {
        businessId = business.id;
        businessName = business.name;
      }
    }

    return {
      token: jwtToken,
      userId: user.id,
      email: user.email,
      businessId,
      businessName,
      role: user.role,
    };
  }

  async deleteAccount(userId: string) {
    if (!userId) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'User ID is required');
    }

    const user = await this.repository.getUserById(userId);
    if (!user) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 404, 'User not found');
    }

    await this.repository.deleteUser(userId);
    logger.info('User account deleted successfully', { userId, email: user.email });
    return { success: true };
  }

  async forgotPassword(email: string) {
    if (!email) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Email is required');
    }

    const trimmedEmail = email.toLowerCase().trim();
    const user = await this.repository.getUserByEmail(trimmedEmail);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

      await this.repository.setResetPasswordToken(user.id, resetToken, resetExpiry);

      const frontendUrl =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://ecomatch.store'
          : 'http://localhost:3000');
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      sendEmail(
        user.email,
        'Reset your EcoMatch password',
        resetPasswordEmailHtml(resetUrl)
      ).catch((err) => {
        logger.error('Failed to send password reset email', { email: user.email, error: err.message });
      });

      logger.info('Password reset requested', { userId: user.id, email: user.email });
    } else {
      logger.info('Password reset requested for non-existent email', { email: trimmedEmail });
    }

    // Always return generic message to prevent email enumeration
    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  }

  async verifyResetToken(token: string) {
    if (!token) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Reset token is required');
    }

    const user = await this.repository.getUserByResetToken(token);
    if (!user || !user.resetPasswordExpiry) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Invalid or expired password reset token');
    }

    if (Date.now() > new Date(user.resetPasswordExpiry).getTime()) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Password reset token has expired');
    }

    return { valid: true, email: user.email };
  }

  async resetPassword(params: { token: string; newPassword: string }) {
    const { token, newPassword } = params;

    if (!token || !newPassword) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Token and new password are required');
    }

    if (newPassword.length < 8) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Password must be at least 8 characters long');
    }

    const user = await this.repository.getUserByResetToken(token);
    if (!user || !user.resetPasswordExpiry) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Invalid or expired password reset token');
    }

    if (Date.now() > new Date(user.resetPasswordExpiry).getTime()) {
      throw new AppError(ErrorCodes.INVALID_REQUEST, 400, 'Password reset token has expired');
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.repository.updatePasswordAndClearResetToken(user.id, newPasswordHash);

    logger.info('Password reset successfully', { userId: user.id, email: user.email });

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }
}


