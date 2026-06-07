import { apiClient } from "@/api/client";
import type {
  TokenResponse,
  UserCreate,
  UserResponse,
  PermissionSet,
} from "@/api/types";

export async function login(
  username: string,
  password: string,
): Promise<TokenResponse> {
  // Backend expects form-encoded data for OAuth2
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const { data } = await apiClient.post<TokenResponse>(
    "/auth/login",
    formData,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );
  return data;
}

export async function register(userData: UserCreate): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>(
    "/auth/register",
    userData,
  );
  return data;
}

export async function refreshToken(
  refresh: string,
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>(
    "/auth/refresh",
    { refresh_token: refresh },
  );
  return data;
}

export async function getMe(): Promise<UserResponse> {
  const { data } = await apiClient.get<UserResponse>("/auth/me");
  return data;
}

export async function getUsers(): Promise<UserResponse[]> {
  const { data } = await apiClient.get<UserResponse[]>("/auth/users");
  return data;
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<UserResponse> {
  const { data } = await apiClient.patch<UserResponse>(
    `/auth/users/${userId}/role`,
    null,
    { params: { role } },
  );
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/auth/users/${userId}`);
}

export async function getPermissions(): Promise<PermissionSet[]> {
  const { data } = await apiClient.get<PermissionSet[]>("/auth/permissions");
  return data;
}
