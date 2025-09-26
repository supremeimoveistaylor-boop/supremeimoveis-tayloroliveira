import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Home, Edit, Trash2, Eye, ArrowLeft, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  property_type: string;
  purpose: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  area: number;
  images: string[];
  status: string;
  created_at: string;
  user_id: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'user';
  phone: string;
  created_at: string;
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'properties' | 'users'>('properties');

  // Redirect if not authenticated or not admin
  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin && !loading) {
    toast({
      title: "Acesso negado",
      description: "Você não tem permissão para acessar esta página.",
      variant: "destructive",
    });
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (isAdmin) {
      fetchAllProperties();
      fetchAllProfiles();
    }
  }, [isAdmin]);

  const fetchAllProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar imóveis",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updatePropertyStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setProperties(properties.map(p => p.id === id ? { ...p, status } : p));
      toast({
        title: "Status atualizado",
        description: "O status do imóvel foi atualizado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;

      setProfiles(profiles.map(p => p.user_id === userId ? { ...p, role } : p));
      toast({
        title: "Permissão atualizada",
        description: "A permissão do usuário foi atualizada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteProperty = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProperties(properties.filter(p => p.id !== id));
      toast({
        title: "Imóvel excluído",
        description: "O imóvel foi excluído com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir imóvel",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Painel do Administrador</h1>
                <p className="text-muted-foreground">Gerencie todos os imóveis e usuários</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate('/add-property')}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Imóvel
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <Button
            variant={activeTab === 'properties' ? 'default' : 'outline'}
            onClick={() => setActiveTab('properties')}
          >
            <Home className="mr-2 h-4 w-4" />
            Imóveis ({properties.length})
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'outline'}
            onClick={() => setActiveTab('users')}
          >
            <Users className="mr-2 h-4 w-4" />
            Usuários ({profiles.length})
          </Button>
        </div>

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Todos os Imóveis</h2>
            </div>

            {properties.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum imóvel cadastrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Ainda não há imóveis no sistema
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <Card key={property.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{property.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant={property.purpose === 'sale' ? 'default' : 'secondary'}>
                              {property.purpose === 'sale' ? 'Venda' : 'Aluguel'}
                            </Badge>
                            <Badge variant="outline">
                              {property.property_type === 'house' ? 'Casa' :
                               property.property_type === 'apartment' ? 'Apartamento' :
                               property.property_type === 'commercial' ? 'Comercial' : 'Terreno'}
                            </Badge>
                          </CardDescription>
                        </div>
                        <Badge variant={
                          property.status === 'active' ? 'default' :
                          property.status === 'sold' ? 'destructive' :
                          property.status === 'rented' ? 'secondary' : 'outline'
                        }>
                          {property.status === 'active' ? 'Ativo' :
                           property.status === 'sold' ? 'Vendido' :
                           property.status === 'rented' ? 'Alugado' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{property.location}</p>
                      <p className="text-2xl font-bold text-primary mb-4">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(property.price)}
                      </p>
                      
                      {property.bedrooms && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <span>{property.bedrooms} quartos</span>
                          <span>{property.bathrooms} banheiros</span>
                          {property.area && <span>{property.area.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })}m²</span>}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Select
                          value={property.status}
                          onValueChange={(value) => updatePropertyStatus(property.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="sold">Vendido</SelectItem>
                            <SelectItem value="rented">Alugado</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/edit-property/${property.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteProperty(property.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Todos os Usuários</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => (
                <Card key={profile.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{profile.full_name || 'Nome não informado'}</CardTitle>
                        <CardDescription className="mt-1">
                          {profile.phone && (
                            <p className="text-sm">{profile.phone}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Cadastrado em: {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </CardDescription>
                      </div>
                      <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                        {profile.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                        <Select
                          value={profile.role}
                          onValueChange={(value: 'admin' | 'user') => updateUserRole(profile.user_id, value)}
                        >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;