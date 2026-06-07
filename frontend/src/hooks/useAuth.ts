import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { login as apiLogin, getMe as apiGetMe } from "@/api/auth";
import type { UserLogin } from "@/api/types";
import { Permission } from "@/lib/permissions";
import axios from "axios";

export function useAuth() {
  const queryClient = useQueryClient();
  const { user, accessToken, isAuthenticated, setAuth, logout, hasPermission } = useAuthStore();

  // Query to sync /auth/me profile details from server
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["auth-profile"],
    queryFn: async () => {
      try {
        return await apiGetMe();
      } catch (error: any) {
        // If 401, throw it so the axios response interceptor logs the user out
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          throw error;
        }
        // If other error (e.g. backend down), return cached user to resolve successfully
        const cachedUser = useAuthStore.getState().user;
        if (cachedUser) {
          console.warn("Backend offline or returned error. Falling back to cached user session.", error);
          return cachedUser;
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: false,
    refetchOnMount: false,
  });

  // Login mutation calling auth service and saving tokens
  const loginMutation = useMutation({
    mutationFn: async (credentials: UserLogin) => {
      return await apiLogin(credentials.username, credentials.password);
    },
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
    },
  });

  const handleLogout = () => {
    logout();
    queryClient.clear();
  };

  return {
    user: profile ?? user,
    isAuthenticated,
    isLoading: loginMutation.isPending || (isProfileLoading && !user),
    error: loginMutation.error,
    login: loginMutation.mutateAsync,
    logout: handleLogout,
    hasPermission,
    role: profile?.role ?? user?.role,
  };
}

