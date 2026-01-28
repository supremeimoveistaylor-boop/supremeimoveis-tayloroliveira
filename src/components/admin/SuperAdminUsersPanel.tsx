import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  UserCog, 
  Shield, 
  ShieldCheck, 
  User, 
  Plus, 
  Trash2, 
  Search,
  RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserWithRoles {
  user_id: string;
  email: string | null;
  full_name: string | null;
  roles: string[];
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "user" | "admin" | "super_admin";
  assigned_at: string;
}

interface SuperAdminUsersPanelProps {
  currentUserId: string;
}

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  super_admin: {
    label: "Super Admin",
    icon: <ShieldCheck className="w-3 h-3" />,
    className: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  },
  admin: {
    label: "Admin",
    icon: <Shield className="w-3 h-3" />,
    className: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  },
  user: {
    label: "Usuário",
    icon: <User className="w-3 h-3" />,
    className: "bg-slate-500/20 text-slate-400 border-slate-500/50",
  },
};

export const SuperAdminUsersPanel = ({ currentUserId }: SuperAdminUsersPanelProps) => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [showRemoveRoleDialog, setShowRemoveRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<"user" | "admin" | "super_admin" | "">("");
  const [roleToRemove, setRoleToRemove] = useState<{ userId: string; role: "user" | "admin" | "super_admin" } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("assigned_at", { ascending: false });

      if (rolesError) throw rolesError;

      setUserRoles(roles || []);

      // Group roles by user
      const rolesMap = new Map<string, string[]>();
      (roles || []).forEach((role) => {
        const existing = rolesMap.get(role.user_id) || [];
        existing.push(role.role);
        rolesMap.set(role.user_id, existing);
      });

      // Combine profiles with roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        user_id: profile.user_id,
        email: null, // We don't have direct access to auth.users email
        full_name: profile.full_name,
        roles: rolesMap.get(profile.user_id) || [],
        created_at: profile.created_at,
      }));

      // Add users that have roles but no profile
      (roles || []).forEach((role) => {
        if (!usersWithRoles.find((u) => u.user_id === role.user_id)) {
          usersWithRoles.push({
            user_id: role.user_id,
            email: null,
            full_name: null,
            roles: rolesMap.get(role.user_id) || [],
            created_at: role.assigned_at,
          });
        }
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !selectedRole) return;

    setIsProcessing(true);
    try {
      // Check if role already exists
      if (selectedUser.roles.includes(selectedRole)) {
        toast({
          title: "Atenção",
          description: "Usuário já possui esta role",
          variant: "destructive",
        });
        return;
      }

      // Insert new role
      const { error } = await supabase.from("user_roles").insert({
        user_id: selectedUser.user_id,
        role: selectedRole as "user" | "admin" | "super_admin",
        assigned_by: currentUserId,
      });

      if (error) throw error;

      // Log action
      await supabase.from("super_admin_logs").insert({
        admin_user_id: currentUserId,
        action: "ASSIGN_ROLE",
        target_user_id: selectedUser.user_id,
        target_table: "user_roles",
        metadata: { 
          role: selectedRole, 
          user_name: selectedUser.full_name 
        },
      });

      toast({
        title: "Sucesso",
        description: `Role ${ROLE_LABELS[selectedRole]?.label} atribuída com sucesso`,
      });

      fetchUsersAndRoles();
    } catch (error) {
      console.error("Error adding role:", error);
      toast({
        title: "Erro",
        description: "Erro ao atribuir role",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowAddRoleDialog(false);
      setSelectedUser(null);
      setSelectedRole("");
    }
  };

  const handleRemoveRole = async () => {
    if (!roleToRemove) return;

    // Prevent removing own super_admin role
    if (roleToRemove.userId === currentUserId && roleToRemove.role === "super_admin") {
      toast({
        title: "Ação Bloqueada",
        description: "Você não pode remover sua própria role de Super Admin",
        variant: "destructive",
      });
      setShowRemoveRoleDialog(false);
      return;
    }

    setIsProcessing(true);
    try {
      // Find and delete the role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", roleToRemove.userId)
        .eq("role", roleToRemove.role);

      if (error) throw error;

      // Log action
      await supabase.from("super_admin_logs").insert({
        admin_user_id: currentUserId,
        action: "REVOKE_ROLE",
        target_user_id: roleToRemove.userId,
        target_table: "user_roles",
        metadata: { role: roleToRemove.role },
      });

      toast({
        title: "Sucesso",
        description: `Role ${ROLE_LABELS[roleToRemove.role]?.label} removida com sucesso`,
      });

      fetchUsersAndRoles();
    } catch (error) {
      console.error("Error removing role:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover role",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowRemoveRoleDialog(false);
      setRoleToRemove(null);
    }
  };

  const openAddRoleDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setSelectedRole("");
    setShowAddRoleDialog(true);
  };

  const openRemoveRoleDialog = (userId: string, role: "user" | "admin" | "super_admin") => {
    setRoleToRemove({ userId, role });
    setShowRemoveRoleDialog(true);
  };

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      user.user_id.toLowerCase().includes(search) ||
      user.full_name?.toLowerCase().includes(search) ||
      user.roles.some((r) => r.toLowerCase().includes(search))
    );
  });

  const getAvailableRoles = (user: UserWithRoles): ("user" | "admin" | "super_admin")[] => {
    const allRoles: ("user" | "admin" | "super_admin")[] = ["user", "admin", "super_admin"];
    return allRoles.filter((r) => !user.roles.includes(r));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Gestão de Usuários e Roles
              </CardTitle>
              <CardDescription className="text-slate-400">
                Atribua e remova roles de usuários do sistema
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsersAndRoles}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por ID, nome ou role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <p className="text-xs text-slate-400">Total Usuários</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">
                {users.filter((u) => u.roles.includes("super_admin")).length}
              </p>
              <p className="text-xs text-slate-400">Super Admins</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {users.filter((u) => u.roles.includes("admin")).length}
              </p>
              <p className="text-xs text-slate-400">Admins</p>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-lg border border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 bg-slate-800/50">
                  <TableHead className="text-slate-300">Usuário</TableHead>
                  <TableHead className="text-slate-300">Roles</TableHead>
                  <TableHead className="text-slate-300">Criado em</TableHead>
                  <TableHead className="text-slate-300 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id} className="border-slate-700">
                      <TableCell>
                        <div>
                          <p className="text-white font-medium">
                            {user.full_name || "Sem nome"}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">
                            {user.user_id.slice(0, 8)}...
                            {user.user_id === currentUserId && (
                              <Badge className="ml-2 bg-green-500/20 text-green-400 text-xs">
                                Você
                              </Badge>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-slate-500 text-sm">Sem roles</span>
                          ) : (
                            user.roles.map((role) => {
                              const typedRole = role as "user" | "admin" | "super_admin";
                              return (
                                <Badge
                                  key={role}
                                  className={`${ROLE_LABELS[role]?.className} flex items-center gap-1 cursor-pointer hover:opacity-80`}
                                  onClick={() => openRemoveRoleDialog(user.user_id, typedRole)}
                                  title="Clique para remover"
                                >
                                  {ROLE_LABELS[role]?.icon}
                                  {ROLE_LABELS[role]?.label}
                                  <Trash2 className="w-3 h-3 ml-1 opacity-60" />
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {getAvailableRoles(user).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddRoleDialog(user)}
                            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Role
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <AlertDialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Atribuir Role</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Selecione a role para atribuir ao usuário{" "}
              <span className="text-white font-medium">
                {selectedUser?.full_name || selectedUser?.user_id.slice(0, 8)}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as "" | "user" | "admin" | "super_admin")}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Selecione uma role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {selectedUser &&
                  getAvailableRoles(selectedUser).map((role) => (
                    <SelectItem
                      key={role}
                      value={role}
                      className="text-white focus:bg-slate-600"
                    >
                      <div className="flex items-center gap-2">
                        {ROLE_LABELS[role]?.icon}
                        {ROLE_LABELS[role]?.label}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddRole}
              disabled={!selectedRole || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Role Dialog */}
      <AlertDialog open={showRemoveRoleDialog} onOpenChange={setShowRemoveRoleDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remover Role</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja remover a role{" "}
              <Badge className={ROLE_LABELS[roleToRemove?.role || ""]?.className}>
                {ROLE_LABELS[roleToRemove?.role || ""]?.label}
              </Badge>{" "}
              deste usuário?
              {roleToRemove?.userId === currentUserId && (
                <span className="block mt-2 text-red-400 font-medium">
                  ⚠️ Atenção: Este é seu próprio usuário!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRole}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Remover Role"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
