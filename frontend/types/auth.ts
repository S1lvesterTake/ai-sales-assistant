export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isDemo: boolean;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
}
