import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers, register, updateUserRole, deleteUser } from "@/api/auth";
import {
  getAIProcessingSettings,
  updateAIProcessingSettings,
} from "@/api/settings";
import { AIProcessingMode, Role } from "@/api/types";
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
import { Bot, Key, Save, UserMinus, UserPlus } from "lucide-react";

const DEFAULT_AI_ROLE_MODES: Record<Role, AIProcessingMode> = {
  [Role.SUPER_ADMIN]: AIProcessingMode.AUTOMATIC,
  [Role.ADMIN]: AIProcessingMode.AUTOMATIC,
  [Role.OPERATOR]: AIProcessingMode.AUTOMATIC,
  [Role.VIEWER]: AIProcessingMode.NOT_ALLOWED,
  [Role.QA_MANAGER]: AIProcessingMode.NOT_ALLOWED,
};

export const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>(Role.OPERATOR);
  const [aiRoleModes, setAiRoleModes] = useState<Record<Role, AIProcessingMode>>(DEFAULT_AI_ROLE_MODES);

  // Hook layout-header actions
  useEffect(() => {
    const handlePrimary = () => {
      setIsCreateOpen(true);
    };
    const handleSecondary = () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      toast("Accounts list refreshed.", "success");
    };

    window.addEventListener("header-primary-click", handlePrimary);
    window.addEventListener("header-secondary-click", handleSecondary);
    return () => {
      window.removeEventListener("header-primary-click", handlePrimary);
      window.removeEventListener("header-secondary-click", handleSecondary);
    };
  }, [queryClient, toast]);

  // 1. Fetch Users List
  const { data: users, isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: getUsers,
  });

  const { data: aiSettings, isLoading: isAISettingsLoading } = useQuery({
    queryKey: ["ai-processing-settings"],
    queryFn: getAIProcessingSettings,
  });

  useEffect(() => {
    if (aiSettings?.role_modes) {
      setAiRoleModes(aiSettings.role_modes as Record<Role, AIProcessingMode>);
    }
  }, [aiSettings]);

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
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      updateUserRole(userId, role),
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
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      toast("User account soft-deactivated.", "warning");
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (err) => {
      toast(getErrorMessage(err), "error");
    },
  });

  const aiSettingsMutation = useMutation({
    mutationFn: () => updateAIProcessingSettings({ role_modes: aiRoleModes }),
    onSuccess: () => {
      toast("AI processing policy updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["ai-processing-settings"] });
    },
    onError: (err) => {
      toast(getErrorMessage(err), "error");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast("Please enter all required registration details.", "error");
      return;
    }
    createMutation.mutate();
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    roleMutation.mutate({ userId, role: newRole as Role });
  };

  const handleDeactivate = (userId: string) => {
    if (window.confirm("Are you sure you want to deactivate this user account?")) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in select-none">
      <PageHeader
        title="User Management Terminal"
        subtitle="Provision accounts, edit system roles, and revoke operator privileges."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 font-bold tracking-wide"
          >
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Bot className="h-4 w-4 text-blue-500" />
              AI Processing Policy
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
              Configure automatic, manual, or disabled AI review for each role.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={aiSettings?.provider_available ? "success" : "warning"}>
              {aiSettings?.provider_available ? "Provider ready" : "Provider unavailable"}
            </Badge>
            <Badge variant="neutral">{aiSettings?.provider_name ?? "no-provider"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.values(Role)
              .filter((role) => [Role.ADMIN, Role.OPERATOR, Role.QA_MANAGER].includes(role))
              .map((role) => (
              <div
                key={role}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  {role.replace(/_/g, " ")}
                </div>
                <div className="mt-3">
                  <Select
                    value={aiRoleModes[role]}
                    onChange={(event) =>
                      setAiRoleModes((current) => ({
                        ...current,
                        [role]: event.target.value as AIProcessingMode,
                      }))
                    }
                    disabled={aiSettingsMutation.isPending || isAISettingsLoading}
                    options={[
                      { value: AIProcessingMode.AUTOMATIC, label: "Automatic background processing" },
                      { value: AIProcessingMode.MANUAL, label: "Manual trigger only" },
                      { value: AIProcessingMode.NOT_ALLOWED, label: "Not allowed" },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {aiSettings?.updated_at
                ? `Last updated ${formatDateTime(aiSettings.updated_at)}`
                : "Using default AI policy until this is saved."}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => aiSettingsMutation.mutate()}
              isLoading={aiSettingsMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save AI Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Inventory table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            System Accounts
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>System Designation</TableHead>
                <TableHead>Active Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users && users.length > 0 ? (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-extrabold text-slate-700 dark:text-slate-200">
                      {u.username}
                    </TableCell>
                    <TableCell>
                      {u.role === "admin" || u.role === "super_admin" ? (
                        <Badge variant="success" className="uppercase px-2 py-0.5">
                          Admin
                        </Badge>
                      ) : u.role === "qa_manager" ? (
                        <Badge variant="warning" className="uppercase px-2 py-0.5">
                          QA Manager
                        </Badge>
                      ) : (
                        <Badge variant="info" className="uppercase px-2 py-0.5">
                          Operator
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDateTime(u.created_at)}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2.5">
                      <Select
                        size="sm"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        options={[
                          { value: Role.OPERATOR, label: "OPERATOR" },
                          { value: Role.ADMIN, label: "ADMIN" },
                          { value: Role.QA_MANAGER, label: "QA MANAGER" },
                        ]}
                        disabled={roleMutation.isPending}
                        className="w-36 text-left"
                      />

                      <button
                        onClick={() => handleDeactivate(u.id)}
                        disabled={deleteMutation.isPending || !u.is_active}
                        className="text-rose-500 hover:text-rose-600 disabled:opacity-40 p-1 hover:bg-rose-500/10 rounded"
                        title="Deactivate account"
                      >
                        <UserMinus className="h-4.5 w-4.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    No users recorded in system.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE USER DIALOG */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Provision Account"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4.5 mt-2">
          <Input
            label="USERNAME"
            placeholder="e.g. jason_op"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={createMutation.isPending}
            required
          />

          <Input
            label="TEMPORARY PASSWORD"
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={createMutation.isPending}
            icon={<Key className="h-4 w-4" />}
            required
          />

          <Select
            label="SYSTEM ROLE"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
            disabled={createMutation.isPending}
            options={[
              { value: Role.OPERATOR, label: "OPERATOR (Terminal checking only)" },
              { value: Role.ADMIN, label: "ADMIN (Ingestion upload and Audit reports)" },
              { value: Role.QA_MANAGER, label: "QA MANAGER (Audit reports and Export only)" },
            ]}
          />

          <div className="flex justify-end gap-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
export default AdminPage;
