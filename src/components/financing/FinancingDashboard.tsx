import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calculator, 
  TrendingUp, 
  Search, 
  Building,
  BarChart3,
  Trophy,
  Filter
} from "lucide-react";

interface SimulationUser {
  user_id: string;
  nome: string;
  telefone: string;
  email: string;
  tipo_usuario: "visitante" | "corretor";
  created_at: string;
  simulations: number;
}

interface BankRanking {
  banco: string;
  simulacoes: number;
  media_parcela: number;
  taxa_aprovacao: number;
}

const API_BASE_URL = "https://SEUDOMINIO.com/api";

// Demo data
const DEMO_USERS: SimulationUser[] = [
  { user_id: "1", nome: "João Silva", telefone: "(62) 99999-1111", email: "joao@email.com", tipo_usuario: "visitante", created_at: "2026-01-28T10:00:00Z", simulations: 5 },
  { user_id: "2", nome: "Maria Santos", telefone: "(62) 99999-2222", email: "maria@email.com", tipo_usuario: "corretor", created_at: "2026-01-27T14:30:00Z", simulations: 12 },
  { user_id: "3", nome: "Pedro Costa", telefone: "(62) 99999-3333", email: "pedro@email.com", tipo_usuario: "visitante", created_at: "2026-01-26T09:15:00Z", simulations: 3 },
  { user_id: "4", nome: "Ana Oliveira", telefone: "(62) 99999-4444", email: "ana@email.com", tipo_usuario: "corretor", created_at: "2026-01-25T16:45:00Z", simulations: 8 },
  { user_id: "5", nome: "Carlos Lima", telefone: "(62) 99999-5555", email: "carlos@email.com", tipo_usuario: "visitante", created_at: "2026-01-24T11:20:00Z", simulations: 2 },
];

const DEMO_RANKINGS: BankRanking[] = [
  { banco: "Caixa Econômica", simulacoes: 156, media_parcela: 5200, taxa_aprovacao: 78 },
  { banco: "Banco do Brasil", simulacoes: 98, media_parcela: 5400, taxa_aprovacao: 72 },
  { banco: "Itaú", simulacoes: 87, media_parcela: 5600, taxa_aprovacao: 68 },
  { banco: "Bradesco", simulacoes: 76, media_parcela: 5500, taxa_aprovacao: 70 },
  { banco: "Santander", simulacoes: 65, media_parcela: 5700, taxa_aprovacao: 65 },
];

export const FinancingDashboard = () => {
  const [users, setUsers] = useState<SimulationUser[]>(DEMO_USERS);
  const [rankings, setRankings] = useState<BankRanking[]>(DEMO_RANKINGS);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/dashboard`);
      if (response.ok) {
        const data = await response.json();
        if (data.users) setUsers(data.users);
        if (data.rankings) setRankings(data.rankings);
      }
    } catch (error) {
      console.log("Using demo data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.telefone.includes(searchTerm);
    const matchesType = typeFilter === "all" || user.tipo_usuario === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalSimulations = users.reduce((acc, u) => acc + u.simulations, 0);
  const corretores = users.filter(u => u.tipo_usuario === "corretor").length;
  const visitantes = users.filter(u => u.tipo_usuario === "visitante").length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Usuários</p>
                <p className="text-3xl font-bold text-foreground">{users.length}</p>
              </div>
              <Users className="h-10 w-10 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Simulações</p>
                <p className="text-3xl font-bold text-foreground">{totalSimulations}</p>
              </div>
              <Calculator className="h-10 w-10 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Corretores</p>
                <p className="text-3xl font-bold text-foreground">{corretores}</p>
              </div>
              <Building className="h-10 w-10 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Visitantes</p>
                <p className="text-3xl font-bold text-foreground">{visitantes}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="users" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="ranking" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Trophy className="h-4 w-4 mr-2" />
            Ranking de Bancos
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Usuários Cadastrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background border-border"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-background border-border">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="visitante">Visitantes</SelectItem>
                    <SelectItem value="corretor">Corretores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-muted-foreground font-medium">Nome</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Contato</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Tipo</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Simulações</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.user_id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="p-3">
                          <p className="font-medium">{user.nome}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </td>
                        <td className="p-3 text-muted-foreground">{user.telefone}</td>
                        <td className="p-3">
                          <Badge className={
                            user.tipo_usuario === "corretor"
                              ? "bg-accent/20 text-accent border-accent/30"
                              : "bg-secondary text-secondary-foreground"
                          }>
                            {user.tipo_usuario === "corretor" ? "Corretor" : "Visitante"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-accent">{user.simulations}</span>
                        </td>
                        <td className="p-3 text-muted-foreground text-sm">
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                Ranking Automático - Melhor Banco do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rankings.map((bank, index) => (
                  <div
                    key={bank.banco}
                    className={`p-4 rounded-xl border transition-all ${
                      index === 0
                        ? "border-accent bg-accent/10"
                        : "border-border bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                          index === 0 ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
                        }`}>
                          {index + 1}º
                        </div>
                        <div>
                          <p className="font-bold text-lg flex items-center gap-2">
                            {bank.banco}
                            {index === 0 && <Trophy className="h-5 w-5 text-accent" />}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Média: {formatCurrency(bank.media_parcela)}/mês
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <p className="text-2xl font-bold">{bank.simulacoes}</p>
                          <p className="text-xs text-muted-foreground">Simulações</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-500">{bank.taxa_aprovacao}%</p>
                          <p className="text-xs text-muted-foreground">Aprovação</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar for approval rate */}
                    <div className="mt-4">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            index === 0 ? "bg-accent" : "bg-green-500"
                          }`}
                          style={{ width: `${bank.taxa_aprovacao}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
