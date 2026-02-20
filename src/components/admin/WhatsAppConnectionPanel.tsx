import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, ExternalLink, RefreshCw, CheckCircle2, XCircle, Phone, Trash2 } from 'lucide-react';

const META_APP_ID = '1594744215047248';
const REDIRECT_URI = 'https://supremeempreendimentos.com/api/meta/oauth/callback';
const OAUTH_SCOPES = 'whatsapp_business_management,whatsapp_business_messaging,business_management';

interface WhatsAppConnection {
  id: string;
  channel_type: string;
  account_name: string | null;
  phone_number_id: string | null;
  meta_business_id: string | null;
  status: string;
  created_at: string;
  last_activity_at: string | null;
}

export const WhatsAppConnectionPanel = () => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meta_channel_connections')
        .select('id, channel_type, account_name, phone_number_id, meta_business_id, status, created_at, last_activity_at')
        .eq('user_id', user.id)
        .eq('channel_type', 'whatsapp')
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (error: any) {
      console.error('Error fetching WhatsApp connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Listen for OAuth callback message from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'META_OAUTH_CALLBACK' && event.data?.code) {
        setIsConnecting(true);
        try {
          const { data, error } = await supabase.functions.invoke('meta-oauth-callback', {
            body: {
              code: event.data.code,
              user_id: user?.id,
              redirect_uri: REDIRECT_URI,
            },
          });

          if (error) throw error;

          if (data?.success) {
            toast({
              title: '✅ WhatsApp Conectado!',
              description: `Conta "${data.connection.account_name}" conectada com sucesso.`,
            });
            fetchConnection();
          } else {
            throw new Error(data?.error || 'Falha na conexão');
          }
        } catch (error: any) {
          console.error('OAuth callback error:', error);
          toast({
            title: 'Erro na conexão',
            description: error.message || 'Falha ao conectar WhatsApp.',
            variant: 'destructive',
          });
        } finally {
          setIsConnecting(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user, fetchConnection]);

  const handleConnect = () => {
    const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${OAUTH_SCOPES}&response_type=code`;
    
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      oauthUrl,
      'meta_oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );
  };

  const handleDisconnect = async () => {
    if (!connection || !confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    
    try {
      const { error } = await supabase
        .from('meta_channel_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      toast({
        title: 'WhatsApp desconectado',
        description: 'A conexão foi removida com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            WhatsApp Cloud API — Embedded Signup
          </CardTitle>
          <CardDescription>
            Conecte seu WhatsApp Business oficial com 1 clique via OAuth da Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {connection && connection.status === 'active' ? (
            /* Connected State */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    🟢 WhatsApp Conectado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Conta vinculada e pronta para enviar/receber mensagens.
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                  Ativo
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Conta</p>
                  <p className="font-medium">{connection.account_name || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Phone Number ID</p>
                  <p className="font-mono text-sm">{connection.phone_number_id || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">WABA ID</p>
                  <p className="font-mono text-sm">{connection.meta_business_id || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Última Atividade</p>
                  <p className="text-sm">
                    {connection.last_activity_at 
                      ? new Date(connection.last_activity_at).toLocaleString('pt-BR')
                      : 'Nunca'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleConnect}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconectar
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            /* Disconnected State */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
                <XCircle className="w-8 h-8 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold">WhatsApp não conectado</p>
                  <p className="text-sm text-muted-foreground">
                    Clique abaixo para conectar seu WhatsApp Business oficial via Meta.
                  </p>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5 mr-2" />
                    Conectar WhatsApp Oficial
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Você será redirecionado para o Facebook para autorizar o acesso.</p>
                <p>• É necessário ter uma conta Meta Business verificada.</p>
                <p>• Seus tokens são armazenados de forma segura.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
