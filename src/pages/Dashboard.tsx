import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Home, Edit, Trash2, Eye, TestTube } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImageDebugger } from '@/components/ImageDebugger';

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
  listing_status?: 'available' | 'sold' | 'rented';
  created_at: string;
  property_code?: string;
}

const Dashboard = () => {
  const { user, signOut, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchProperties();
  }, [user, loading, isAdmin]);

  const fetchProperties = async () => {
    // Avoid infinite spinner when not authenticated
    if (loading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Admins can see all properties, regular users see only their own
      let query = supabase
        .from('properties')
        .select('*');
      
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setProperties((data || []) as Property[]);
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
            <div>
              <h1 className="text-2xl font-bold">Painel de Controle</h1>
              <p className="text-muted-foreground">Gerencie seus imóveis</p>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Button variant="secondary" onClick={() => navigate('/admin')}>
                  Painel do Admin
                </Button>
              )}
              <Button onClick={() => navigate('/add-property')}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Imóvel
              </Button>
              <Button variant="outline" onClick={signOut}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Imóveis</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{properties.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {properties.filter(p => p.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendidos</CardTitle>
              <Badge variant="secondary" className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {properties.filter(p => p.status === 'sold').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alugados</CardTitle>
              <Badge variant="secondary" className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {properties.filter(p => p.status === 'rented').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Meus Imóveis</h2>
          </div>

          {/* Image Debug Section - Temporary */}
          {properties.length > 0 && (
            <div className="mb-6">
              <details className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <summary className="cursor-pointer font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  🔍 Testar Carregamento de Imagens
                </summary>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.map((property) => (
                    <ImageDebugger
                      key={property.id}
                      images={property.images || []}
                      propertyTitle={property.title}
                    />
                  ))}
                </div>
              </details>
            </div>
          )}

          {properties.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum imóvel cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando seu primeiro imóvel
                </p>
                <Button onClick={() => navigate('/add-property')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Imóvel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <Card key={property.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        {property.property_code && (
                          <div className="text-xs font-mono text-muted-foreground mb-1.5">
                            {property.property_code}
                          </div>
                        )}
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;