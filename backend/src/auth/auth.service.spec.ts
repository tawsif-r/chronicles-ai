import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let workspacesService: jest.Mocked<WorkspacesService>;
  let jwtService: jest.Mocked<JwtService>;

  const user = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '',
    workspace: null,
    createdAt: new Date(),
  };

  const workspace = { id: 'ws-1', name: 'My Workspace' };

  beforeEach(async () => {
    // Hash a known password for login tests
    user.passwordHash = await bcrypt.hash('password123', 10);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: WorkspacesService,
          useValue: {
            createForUser: jest.fn(),
            findByUserId: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-refresh-secret'),
            get: jest.fn().mockReturnValue('7d'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    workspacesService = module.get(WorkspacesService) as jest.Mocked<WorkspacesService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('creates user + workspace and returns tokens', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(user as any);
      workspacesService.createForUser.mockResolvedValue(workspace as any);

      const result = await service.register({ email: 'new@example.com', password: 'pass123' });

      expect(usersService.create).toHaveBeenCalled();
      expect(workspacesService.createForUser).toHaveBeenCalledWith(user);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws ConflictException when email already registered', async () => {
      usersService.findByEmail.mockResolvedValue(user as any);

      await expect(
        service.register({ email: 'test@example.com', password: 'pass' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns tokens for correct credentials', async () => {
      usersService.findByEmail.mockResolvedValue(user as any);
      workspacesService.findByUserId.mockResolvedValue(workspace as any);

      const result = await service.login({ email: user.email, password: 'password123' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UnauthorizedException for unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(user as any);

      await expect(
        service.login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('returns new tokens for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        workspaceId: 'ws-1',
      });

      const result = await service.refresh('valid-refresh-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UnauthorizedException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
