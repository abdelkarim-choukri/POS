export interface LoginRequest {
  email: string;
  password: string;
}

export interface PinLoginRequest {
  terminal_id: string;
  pin: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface SuperAdminLoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  business_id: string;
  first_name: string;
  last_name: string;
  permissions: Record<string, boolean>;
  dashboard_access: boolean;
}

export interface AuthTokenResponse {
  token: string;
  user: AuthUser;
}
