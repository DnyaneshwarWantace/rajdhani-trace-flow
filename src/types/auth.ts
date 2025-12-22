export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  phone?: string;
  department?: string;
  avatar?: string;
  last_login?: string;
  created_by?: string;
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
    permissions: any;
  };
}
