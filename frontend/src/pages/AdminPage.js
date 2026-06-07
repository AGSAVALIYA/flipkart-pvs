import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers, register, updateUserRole, deleteUser } from "@/api/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/api/client";
import { formatDateTime } from "@/lib/formatters";
import { Role } from "@/lib/permissions";
import { UserPlus, UserMinus, Key } from "lucide-react";
export const AdminPage = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [selectedRole, setSelectedRole] = useState(Role.OPERATOR);
    // 1. Fetch Users List
    const { data: users, isLoading } = useQuery({
        queryKey: ["users-list"],
        queryFn: getUsers,
    });
    // 2. Register New User Mutation
    const createMutation = useMutation({
        mutationFn: () => register({ username, password, role: selectedRole }),
        onSuccess: () => {
            toast("User account registered successfully.", "success");
            setIsCreateOpen(false);
            setUsername("");
            setPassword("");
            setSelectedRole(Role.OPERATOR);
            queryClient.invalidateQueries({ queryKey: ["users-list"] });
        },
        onError: (err) => {
            toast(getErrorMessage(err), "error");
        },
    });
    // 3. Edit User Role Mutation
    const roleMutation = useMutation({
        mutationFn: ({ userId, role }) => updateUserRole(userId, role),
        onSuccess: () => {
            toast("User system role updated.", "success");
            queryClient.invalidateQueries({ queryKey: ["users-list"] });
        },
        onError: (err) => {
            toast(getErrorMessage(err), "error");
        },
    });
    // 4. Deactivate User Mutation
    const deleteMutation = useMutation({
        mutationFn: (userId) => deleteUser(userId),
        onSuccess: () => {
            toast("User account soft-deactivated.", "warning");
            queryClient.invalidateQueries({ queryKey: ["users-list"] });
        },
        onError: (err) => {
            toast(getErrorMessage(err), "error");
        },
    });
    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (!username.trim() || !password) {
            toast("Please enter all required registration details.", "error");
            return;
        }
        createMutation.mutate();
    };
    const handleRoleChange = (userId, newRole) => {
        roleMutation.mutate({ userId, role: newRole });
    };
    const handleDeactivate = (userId) => {
        if (window.confirm("Are you sure you want to deactivate this user account?")) {
            deleteMutation.mutate(userId);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6 animate-fade-in select-none", children: [_jsx(PageHeader, { title: "User Management Terminal", subtitle: "Provision accounts, edit system roles, and revoke operator privileges.", action: _jsxs(Button, { variant: "primary", size: "sm", onClick: () => setIsCreateOpen(true), className: "gap-2 font-bold tracking-wide", children: [_jsx(UserPlus, { className: "h-4 w-4" }), "Create User"] }) }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx("h2", { className: "text-sm font-bold text-slate-800 dark:text-slate-100", children: "System Accounts" }) }), _jsx(CardContent, { className: "p-0", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Username" }), _jsx(TableHead, { children: "System Designation" }), _jsx(TableHead, { children: "Active Status" }), _jsx(TableHead, { children: "Created At" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: isLoading ? (Array.from({ length: 4 }).map((_, i) => (_jsx(TableRow, { children: Array.from({ length: 5 }).map((_, j) => (_jsx(TableCell, { children: _jsx("div", { className: "h-4 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded" }) }, j))) }, i)))) : users && users.length > 0 ? (users.map((u) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-extrabold text-slate-700 dark:text-slate-200", children: u.username }), _jsx(TableCell, { children: u.role === "admin" || u.role === "super_admin" ? (_jsx(Badge, { variant: "success", className: "uppercase px-2 py-0.5", children: "Admin" })) : (_jsx(Badge, { variant: "info", className: "uppercase px-2 py-0.5", children: "Operator" })) }), _jsx(TableCell, { children: u.is_active ? (_jsxs("span", { className: "inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-emerald-500" }), "Active"] })) : (_jsxs("span", { className: "inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-slate-400" }), "Inactive"] })) }), _jsx(TableCell, { className: "text-xs text-slate-400 dark:text-slate-500", children: formatDateTime(u.created_at) }), _jsxs(TableCell, { className: "text-right flex items-center justify-end gap-2.5", children: [_jsxs("select", { value: u.role, onChange: (e) => handleRoleChange(u.id, e.target.value), className: "bg-transparent text-xs font-bold text-slate-500 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 focus:outline-none cursor-pointer", disabled: roleMutation.isPending, children: [_jsx("option", { value: Role.OPERATOR, children: "OPERATOR" }), _jsx("option", { value: Role.ADMIN, children: "ADMIN" })] }), _jsx("button", { onClick: () => handleDeactivate(u.id), disabled: deleteMutation.isPending || !u.is_active, className: "text-rose-500 hover:text-rose-600 disabled:opacity-40 p-1 hover:bg-rose-500/10 rounded", title: "Deactivate account", children: _jsx(UserMinus, { className: "h-4.5 w-4.5" }) })] })] }, u.id)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center py-8 text-slate-400", children: "No users recorded in system." }) })) })] }) })] }), _jsx(Dialog, { isOpen: isCreateOpen, onClose: () => setIsCreateOpen(false), title: "Provision Account", children: _jsxs("form", { onSubmit: handleCreateSubmit, className: "flex flex-col gap-4.5 mt-2", children: [_jsx(Input, { label: "USERNAME", placeholder: "e.g. jason_op", value: username, onChange: (e) => setUsername(e.target.value), disabled: createMutation.isPending, required: true }), _jsx(Input, { label: "TEMPORARY PASSWORD", type: "password", placeholder: "Min 8 characters", value: password, onChange: (e) => setPassword(e.target.value), disabled: createMutation.isPending, icon: _jsx(Key, { className: "h-4 w-4" }), required: true }), _jsx(Select, { label: "SYSTEM ROLE", value: selectedRole, onChange: (e) => setSelectedRole(e.target.value), disabled: createMutation.isPending, options: [
                                { value: Role.OPERATOR, label: "OPERATOR (Terminal checking only)" },
                                { value: Role.ADMIN, label: "ADMIN (Ingestion upload and Audit reports)" },
                            ] }), _jsxs("div", { className: "flex justify-end gap-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 pt-4", children: [_jsx(Button, { variant: "outline", type: "button", onClick: () => setIsCreateOpen(false), disabled: createMutation.isPending, children: "Cancel" }), _jsx(Button, { variant: "primary", type: "submit", isLoading: createMutation.isPending, children: "Create User" })] })] }) })] }));
};
export default AdminPage;
