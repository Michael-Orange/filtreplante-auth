import { JwtUser, DbUser, PublicUser, AppInfo } from './user';

export interface LoginResponse {
  success: boolean;
  user?: JwtUser;
  message?: string;
}

export type MeResponse = JwtUser;

export type PublicUsersResponse = PublicUser[];

export type AppsResponse = AppInfo[];

export interface SSOResponse {
  success: boolean;
  redirectUrl: string;
  token: string;
}

export type UsersResponse = DbUser[];

export interface UserResponse {
  success: boolean;
  user?: DbUser;
  message?: string;
}

export interface PasswordResponse {
  password: string;
}

export interface ApiError {
  error: string;
  message?: string;
}
