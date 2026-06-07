import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserResponse } from "@/api/types";
import { Permission, hasPermission } from "@/lib/permissions";

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({
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

      updateUser: (userUpdates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userUpdates } : null,
        })),

      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        return hasPermission(user.role, permission);
      },
    }),
    {
      name: "auth-storage", // localstorage key
    }
  )
);
