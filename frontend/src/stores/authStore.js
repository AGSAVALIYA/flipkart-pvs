import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hasPermission } from "@/lib/permissions";
export const useAuthStore = create()(persist((set, get) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    setAuth: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
    }),
    logout: () => {
        set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
        });
    },
    updateUser: (userUpdates) => set((state) => ({
        user: state.user ? { ...state.user, ...userUpdates } : null,
    })),
    hasPermission: (permission) => {
        const user = get().user;
        if (!user)
            return false;
        return hasPermission(user.role, permission);
    },
}), {
    name: "auth-storage", // localstorage key
}));
