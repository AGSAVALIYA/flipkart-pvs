import type { UserLogin } from "@/api/types";
import { Permission } from "@/lib/permissions";
export declare function useAuth(): {
    user: import("@/api/types").UserResponse | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: Error | null;
    login: import("@tanstack/react-query").UseMutateAsyncFunction<import("@/api/types").TokenResponse, Error, UserLogin, unknown>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
    role: import("@/api/types").Role | undefined;
};
