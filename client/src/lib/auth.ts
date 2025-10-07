import { apiRequest } from "./queryClient";

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
  };
  token?: string;
}

export const auth = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/admin/login", {
      username,
      password,
    });
    return response.json();
  },

  async logout(): Promise<void> {
    await apiRequest("POST", "/api/admin/logout");
  },

  async getCurrentUser(): Promise<AuthResponse | null> {
    try {
      const response = await apiRequest("GET", "/api/admin/me");
      return response.json();
    } catch (error) {
      return null;
    }
  },

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/register", {
      username,
      email,
      password,
    });
    return response.json();
  },
};
