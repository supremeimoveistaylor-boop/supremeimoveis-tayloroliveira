import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  Database, 
  Activity, 
  LogOut, 
  RefreshCw,
  UserCog,
  FileText,
  MessageSquare
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_table: string | null;
  target_record_id: string | null;
  target_user_id: string | null;
  metadata: any;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  assigned_at: string;
  email?: string;
}

interface ChannelConnection {
  id: string;
  channel_type: string;
  account_name: string | null;
  status: string;
  created_at: string;
  last_activity_at: string | null;
}

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [serverValidated, setServerValidated] = useState(false);
  const [validationFailed, setValidationFailed] = useState(false);

  // Server-side validation via RPC before rendering
  useEffect(() => {
    const validateServerSide = async () => {
      if (loading) return;
      
      if (!user) {
        navigate("/admin-master-login");
        return;
      }

      try {
        // Call server-side RPC to validate super_admin role
        const { data: isSuperAdmin, error } = await supabase.rpc('is_super_admin', {
          _user_id: user.id
        });

        if (error) {
          console.error("Server validation error:", error);
          throw error;
        }

        if (!isSuperAdmin) {
          toast({
            title: "Acesso Negado",
            description: "Validação server-side falhou. Você não tem permissão.",
            variant: "destructive",
          });
          setValidationFailed(true);
          
          // Log unauthorized access attempt
          await supabase.from("super_admin_logs").insert({
            admin_user_id: user.id,
            action: "UNAUTHORIZED_ACCESS_ATTEMPT",
            metadata: { email: user.email, client_role: userRole },
          });
          
          navigate("/admin-master-login");
          return;
        }

        setServerValidated(true);
        fetchDashboardData();
      } catch (error) {
        console.error("Validation error:", error);
        toast({
          title: "Erro de Validação",
          description: "Não foi possível validar suas permissões.",
          variant: "destructive",
        });
        setValidationFailed(true);
        navigate("/admin-master-login");
      }
    };

    validateServerSide();
  }, [user, loading, navigate]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch audit logs
      const { data: logs, error: logsError } = await supabase
        .from("super_admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setAuditLogs(logs || []);

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("assigned_at", { ascending: false });

      if (rolesError) throw rolesError;
      setUserRoles(roles || []);

      // Fetch Meta channel connections
      const { data: conns, error: connsError } = await supabase
        .from("meta_channel_connections")
        .select("id, channel_type, account_name, status, created_at, last_activity_at")
        .order("created_at", { ascending: false });

      if (connsError) throw connsError;
      setConnections(conns || []);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (user) {
      await supabase.from("super_admin_logs").insert({
        admin_user_id: user.id,
        action: "LOGOUT",
        metadata: { email: user.email },
      });
    }
    await supabase.auth.signOut();
    navigate("/admin-master-login");
  };

  const handlePromoteToSuperAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "super_admin", assigned_by: user?.id })
        .eq("user_id", userId);

      if (error) throw error;

      await supabase.from("super_admin_logs").insert({
        admin_user_id: user!.id,
        action: "PROMOTE_TO_SUPER_ADMIN",
        target_user_id: userId,
        target_table: "user_roles",
      });

      toast({
        title: "Sucesso",
        description: "Usuário promovido a Super Admin",
      });

      fetchDashboardData();
    } catch (error) {
      console.error("Error promoting user:", error);
      toast({
        title: "Erro",
        description: "Erro ao promover usuário",
        variant: "destructive",
      });
    }
  };

  // Block rendering until server-side validation completes
  if (loading || !serverValidated || validationFailed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">
            {validationFailed ? "Acesso negado..." : "Validando permissões..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Super Admin Dashboard</h1>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{userRoles.length}</p>
                  <p className="text-sm text-slate-400">Usuários com Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {userRoles.filter(r => r.role === "super_admin").length}
                  </p>
                  <p className="text-sm text-slate-400">Super Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{connections.length}</p>
                  <p className="text-sm text-slate-400">Conexões Meta</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{auditLogs.length}</p>
                  <p className="text-sm text-slate-400">Logs de Auditoria</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
              <Database className="w-4 h-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
              <UserCog className="w-4 h-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
              <MessageSquare className="w-4 h-4 mr-2" />
              Conexões Meta
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
              <FileText className="w-4 h-4 mr-2" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Últimas Atividades</CardTitle>
                <CardDescription className="text-slate-400">
                  Ações recentes dos super administradores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Ação</TableHead>
                      <TableHead className="text-slate-300">Data</TableHead>
                      <TableHead className="text-slate-300">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.slice(0, 10).map((log) => (
                      <TableRow key={log.id} className="border-slate-700">
                        <TableCell>
                          <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {log.target_table && `Tabela: ${log.target_table}`}
                          {log.metadata?.email && ` | ${log.metadata.email}`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Gerenciamento de Roles</CardTitle>
                <CardDescription className="text-slate-400">
                  Visualize e gerencie roles de usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">User ID</TableHead>
                      <TableHead className="text-slate-300">Role</TableHead>
                      <TableHead className="text-slate-300">Atribuído em</TableHead>
                      <TableHead className="text-slate-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles.map((role) => (
                      <TableRow key={role.id} className="border-slate-700">
                        <TableCell className="text-slate-300 font-mono text-xs">
                          {role.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              role.role === "super_admin" 
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/50" 
                                : role.role === "admin"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/50"
                            }
                          >
                            {role.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {new Date(role.assigned_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {role.role !== "super_admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePromoteToSuperAdmin(role.user_id)}
                              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                            >
                              Promover
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Conexões Meta (BYO)</CardTitle>
                <CardDescription className="text-slate-400">
                  WhatsApp e Instagram Business conectados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connections.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    Nenhuma conexão Meta configurada ainda.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Canal</TableHead>
                        <TableHead className="text-slate-300">Conta</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Última Atividade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connections.map((conn) => (
                        <TableRow key={conn.id} className="border-slate-700">
                          <TableCell>
                            <Badge variant="outline" className="border-green-500/50 text-green-400">
                              {conn.channel_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {conn.account_name || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                conn.status === "active" 
                                  ? "bg-green-500/20 text-green-400" 
                                  : "bg-red-500/20 text-red-400"
                              }
                            >
                              {conn.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {conn.last_activity_at 
                              ? new Date(conn.last_activity_at).toLocaleString("pt-BR")
                              : "Nunca"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Logs de Auditoria Completos</CardTitle>
                <CardDescription className="text-slate-400">
                  Histórico completo de ações do Super Admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Ação</TableHead>
                      <TableHead className="text-slate-300">Admin ID</TableHead>
                      <TableHead className="text-slate-300">Tabela Alvo</TableHead>
                      <TableHead className="text-slate-300">Data/Hora</TableHead>
                      <TableHead className="text-slate-300">Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} className="border-slate-700">
                        <TableCell>
                          <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 font-mono text-xs">
                          {log.admin_user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {log.target_table || "-"}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs max-w-xs truncate">
                          {log.metadata ? JSON.stringify(log.metadata) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
