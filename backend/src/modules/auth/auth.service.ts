import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { isUniqueViolation } from '../../database/postgres-error';
import { AuthRepository, PublicUser } from './auth.repository';
import { AuthSessionDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_COST = 12;
const DUMMY_PASSWORD_HASH =
  '$2b$12$FPqQ5yYuch7hI/jaxCbJ.eeiuOG9.7XeEmpBn.UaxsY9/6/mGX8TO';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterDto): Promise<AuthSessionDto> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.repository.findByEmail(email);
    if (existing) throw this.emailConflict();

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    try {
      const user = await this.repository.create({
        email,
        name: input.name.trim(),
        passwordHash,
      });
      return this.createSession(user);
    } catch (error) {
      if (isUniqueViolation(error)) throw this.emailConflict();
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthSessionDto> {
    const email = input.email.trim().toLowerCase();
    const storedUser = await this.repository.findByEmail(email);
    const passwordMatches = await bcrypt.compare(
      input.password,
      storedUser?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!storedUser || !passwordMatches) {
      throw new UnauthorizedException({
        message: 'Email atau kata sandi salah',
        code: 'INVALID_CREDENTIALS',
      });
    }
    return this.createSession(storedUser);
  }

  async getCurrentUser(userId: string): Promise<PublicUser | null> {
    return this.repository.findPublicById(userId);
  }

  private async createSession(user: PublicUser): Promise<AuthSessionDto> {
    const expiresIn = this.config.getOrThrow<number>('JWT_EXPIRES_IN');
    const principal: AuthenticatedUser = {
      userId: user.id,
      email: user.email,
      isDemo: user.isDemo,
    };
    const accessToken = await this.jwt.signAsync(
      { email: principal.email, isDemo: principal.isDemo },
      { subject: principal.userId, expiresIn },
    );
    return {
      accessToken,
      expiresAt: new Date(Date.now() + expiresIn * 1_000).toISOString(),
      user,
    };
  }

  private emailConflict(): ConflictException {
    return new ConflictException({
      message: 'Email sudah terdaftar',
      code: 'EMAIL_ALREADY_EXISTS',
      errors: [{ field: 'email', message: 'Gunakan email lain' }],
    });
  }
}
