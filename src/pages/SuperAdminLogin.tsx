import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff, AlertTriangle, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Access is granted by role (super_admin) stored in user_roles.

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Password recovery state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  // Check if already logged in as super admin
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesError) {
        console.error("Error checking roles:", rolesError);
        return;
      }

      const roles = (rolesData ?? []).map((r) => r.role);
      if (roles.includes("super_admin")) navigate("/super-admin");
    };
    checkExistingSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        toast({
          title: "Erro de autenticação",
          description: authError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: rolesData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id);

      if (roleError) {
        console.error("Error checking role:", roleError);
        await supabase.auth.signOut();
        toast({
          title: "Erro",
          description: "Erro ao verificar permissões",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const roles = (rolesData ?? []).map((r) => r.role);
      if (!roles.includes("super_admin")) {
        await supabase.auth.signOut();
        toast({
          title: "Acesso Negado",
          description: "Você não tem permissão para acessar o painel Master Admin.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      await supabase.from("super_admin_logs").insert({
        admin_user_id: authData.user.id,
        action: "LOGIN",
        metadata: { email: authData.user.email },
      });

      toast({
        title: "Bem-vindo, Super Admin!",
        description: "Acesso autorizado ao painel Master.",
      });

      navigate("/super-admin");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, informe seu email.",
        variant: "destructive",
      });
      return;
    }

    setIsRecovering(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setRecoverySent(true);
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir a senha.",
        });
      }
    } catch (error) {
      console.error("Recovery error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const resetRecoveryState = () => {
    setShowRecovery(false);
    setRecoveryEmail("");
    setRecoverySent(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
            {showRecovery ? (
              <Mail className="w-8 h-8 text-amber-500" />
            ) : (
              <Shield className="w-8 h-8 text-amber-500" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {showRecovery ? "Recuperar Senha" : "Master Admin"}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {showRecovery
              ? "Informe seu email para receber as instruções"
              : "Acesso restrito a super administradores"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showRecovery ? (
            recoverySent ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-2">Email Enviado!</h3>
                    <p className="text-slate-400 text-sm">
                      Enviamos um link de recuperação para <span className="text-amber-400">{recoveryEmail}</span>.
                      Verifique sua caixa de entrada e spam.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={resetRecoveryState}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordRecovery} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-email" className="text-slate-200">Email</Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="seu.email@example.com"
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-200">
                    Enviaremos um link seguro para você redefinir sua senha. O link expira em 1 hora.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isRecovering}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                >
                  {isRecovering ? "Enviando..." : "Enviar Link de Recuperação"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetRecoveryState}
                  className="w-full text-slate-300 hover:text-white hover:bg-slate-700/50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Login
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="super.admin@example.com"
                  required
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">
                  Este painel é exclusivo para super administradores. Todas as ações são registradas e auditadas.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
              >
                {isLoading ? "Verificando..." : "Acessar Painel Master"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
                >
                  Esqueci minha senha / Recuperar acesso
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminLogin;
