import { apiClient } from "./client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface ForgotPasswordResponse {
  message: string;
  reset_token?: string | null;
}

export interface ResetPasswordResponse {
  message: string;
}

export function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  return apiClient.postJson<AuthResponse>("/api/v1/auth/signup", { email, password, name });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiClient.postJson<AuthResponse>("/api/v1/auth/login", { email, password });
}

export function getMe(token: string): Promise<AuthUser> {
  return apiClient.get<AuthUser>("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiClient.postJson<ForgotPasswordResponse>("/api/v1/auth/forgot-password", {
    email,
  });
}

export function resetPassword(
  token: string,
  newPassword: string
): Promise<ResetPasswordResponse> {
  return apiClient.postJson<ResetPasswordResponse>("/api/v1/auth/reset-password", {
    token,
    new_password: newPassword,
  });
}