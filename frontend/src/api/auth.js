import { apiClient } from "@/api/client";
export async function login(username, password) {
    // Backend expects form-encoded data for OAuth2
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);
    const { data } = await apiClient.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return data;
}
export async function register(userData) {
    const { data } = await apiClient.post("/auth/register", userData);
    return data;
}
export async function refreshToken(refresh) {
    const { data } = await apiClient.post("/auth/refresh", { refresh_token: refresh });
    return data;
}
export async function getMe() {
    const { data } = await apiClient.get("/auth/me");
    return data;
}
export async function getUsers() {
    const { data } = await apiClient.get("/auth/users");
    return data;
}
export async function updateUserRole(userId, role) {
    const { data } = await apiClient.patch(`/auth/users/${userId}`, { role });
    return data;
}
export async function deleteUser(userId) {
    await apiClient.delete(`/auth/users/${userId}`);
}
export async function getPermissions() {
    const { data } = await apiClient.get("/auth/permissions");
    return data;
}
