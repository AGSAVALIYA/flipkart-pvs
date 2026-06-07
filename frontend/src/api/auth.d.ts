import type { TokenResponse, UserCreate, UserResponse, PermissionSet } from "@/api/types";
export declare function login(username: string, password: string): Promise<TokenResponse>;
export declare function register(userData: UserCreate): Promise<UserResponse>;
export declare function refreshToken(refresh: string): Promise<TokenResponse>;
export declare function getMe(): Promise<UserResponse>;
export declare function getUsers(): Promise<UserResponse[]>;
export declare function updateUserRole(userId: string, role: string): Promise<UserResponse>;
export declare function deleteUser(userId: string): Promise<void>;
export declare function getPermissions(): Promise<PermissionSet[]>;
