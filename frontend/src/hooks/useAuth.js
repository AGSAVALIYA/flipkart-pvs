import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { login as apiLogin, getMe as apiGetMe } from "@/api/auth";
export function useAuth() {
    const queryClient = useQueryClient();
    const { user, accessToken, isAuthenticated, setAuth, logout, hasPermission } = useAuthStore();
    // Query to sync /auth/me profile details from server
    const { data: profile, isLoading: isProfileLoading } = useQuery({
        queryKey: ["auth-profile"],
        queryFn: apiGetMe,
        enabled: isAuthenticated && !!accessToken,
        staleTime: 5 * 60 * 1000, // 5 min cache
    });
    // Login mutation calling auth service and saving tokens
    const loginMutation = useMutation({
        mutationFn: async (credentials) => {
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
        isLoading: loginMutation.isPending || isProfileLoading,
        error: loginMutation.error,
        login: loginMutation.mutateAsync,
        logout: handleLogout,
        hasPermission,
        role: profile?.role ?? user?.role,
    };
}
