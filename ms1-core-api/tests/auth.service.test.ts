import { AuthService } from '../src/modules/auth/auth.service';
import bcrypt from 'bcrypt';

jest.mock('../src/lib/mailer', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

describe('AuthService - Forgot & Reset Password', () => {
  let mockRepo: any;
  let authService: AuthService;

  beforeEach(() => {
    mockRepo = {
      getUserByEmail: jest.fn(),
      getUserByResetToken: jest.fn(),
      setResetPasswordToken: jest.fn().mockResolvedValue(undefined),
      updatePasswordAndClearResetToken: jest.fn().mockResolvedValue(undefined),
    };
    authService = new AuthService(mockRepo);
  });

  describe('forgotPassword', () => {
    it('returns generic message even if user does not exist (no enumeration)', async () => {
      mockRepo.getUserByEmail.mockResolvedValue(null);

      const res = await authService.forgotPassword('nonexistent@example.com');
      expect(res.message).toContain('If an account exists');
      expect(mockRepo.setResetPasswordToken).not.toHaveBeenCalled();
    });

    it('generates token and saves to repository when user exists', async () => {
      mockRepo.getUserByEmail.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      });

      const res = await authService.forgotPassword('test@example.com');
      expect(res.message).toContain('If an account exists');
      expect(mockRepo.setResetPasswordToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Date)
      );
    });
  });

  describe('verifyResetToken', () => {
    it('throws error if token is missing or user not found', async () => {
      mockRepo.getUserByResetToken.mockResolvedValue(null);

      await expect(authService.verifyResetToken('invalid-token')).rejects.toThrow(
        'Invalid or expired password reset token'
      );
    });

    it('throws error if token is expired', async () => {
      mockRepo.getUserByResetToken.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        resetPasswordExpiry: new Date(Date.now() - 10000), // expired in past
      });

      await expect(authService.verifyResetToken('expired-token')).rejects.toThrow(
        'Password reset token has expired'
      );
    });

    it('returns valid true and email if token is valid', async () => {
      mockRepo.getUserByResetToken.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        resetPasswordExpiry: new Date(Date.now() + 60000), // valid future
      });

      const res = await authService.verifyResetToken('valid-token');
      expect(res.valid).toBe(true);
      expect(res.email).toBe('test@example.com');
    });
  });

  describe('resetPassword', () => {
    it('throws error if password is less than 8 characters', async () => {
      await expect(
        authService.resetPassword({ token: 'any-token', newPassword: 'short' })
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('throws error if token is invalid or expired', async () => {
      mockRepo.getUserByResetToken.mockResolvedValue(null);

      await expect(
        authService.resetPassword({ token: 'invalid-token', newPassword: 'validPassword123' })
      ).rejects.toThrow('Invalid or expired password reset token');
    });

    it('hashes new password and clears reset token on success', async () => {
      mockRepo.getUserByResetToken.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        resetPasswordExpiry: new Date(Date.now() + 60000),
      });

      const res = await authService.resetPassword({
        token: 'valid-token',
        newPassword: 'newSecretPassword123!',
      });

      expect(res.message).toContain('Password has been reset successfully');
      expect(mockRepo.updatePasswordAndClearResetToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String)
      );

      const passedHash = mockRepo.updatePasswordAndClearResetToken.mock.calls[0][1];
      const matches = await bcrypt.compare('newSecretPassword123!', passedHash);
      expect(matches).toBe(true);
    });
  });
});
