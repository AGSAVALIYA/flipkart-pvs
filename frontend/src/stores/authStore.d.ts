import type { UserResponse } from "@/api/types";
import { Permission } from "@/lib/permissions";
interface AuthState {
    user: UserResponse | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    setAuth: (user: UserResponse, accessToken: string, refreshToken: string) => void;
    logout: () => void;
    updateUser: (user: Partial<UserResponse>) => void;
    hasPermission: (permission: Permission) => boolean;
}
export declare const useAuthStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AuthState>, "setState" | "persist"> & {
    setState(partial: AuthState | Partial<AuthState> | ((state: AuthState) => AuthState | Partial<AuthState>), replace?: false | undefined): unknown;
    setState(state: AuthState | ((state: AuthState) => AuthState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AuthState, AuthState, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AuthState) => void) => () => void;
        onFinishHydration: (fn: (state: AuthState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AuthState, AuthState, unknown>>;
    };
}>;
export {};
