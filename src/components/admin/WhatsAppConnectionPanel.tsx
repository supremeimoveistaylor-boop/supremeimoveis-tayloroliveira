import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, ExternalLink, RefreshCw, CheckCircle2, XCircle, Phone, Trash2, Instagram } from 'lucide-react';

// Single Meta App for both WhatsApp and Instagram
const META_APP_ID = '1594744215047248';
const META_REDIRECT_URI = 'https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/meta-oauth-callback';
const WHATSAPP_SCOPES = 'whatsapp_business_management,whatsapp_business_messaging,business_management';
const INSTAGRAM_SCOPES = 'instagram_manage_messages,instagram_basic,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management';

interface ChannelConnection {
  id: string;
  channel_type: string;
  account_name: string | null;
  phone_number_id: string | null;
  meta_business_id: string | null;
  instagram_id: string | null;
  page_id: string | null;
  status: string;
  created_at: string;
  last_activity_at: string | null;
}

export const WhatsAppConnectionPanel = () => {
  const { user } = useAuth();
  const [whatsappConn, setWhatsappConn] = useState<ChannelConnection | null>(null);
  const [instagramConn, setInstagramConn] = useState<ChannelConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectingWA, setIsConnectingWA] = useState(false);
  const [isConnectingIG, setIsConnectingIG] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meta_channel_connections')
        .select('id, channel_type, account_name, phone_number_id, meta_business_id, instagram_id, page_id, status, created_at, last_activity_at')
        .eq('user_id', user.id);

      if (error) throw error;
      setWhatsappConn(data?.find(c => c.channel_type === 'whatsapp') || null);
      setInstagramConn(data?.find(c => c.channel_type === 'instagram') || null);
    } catch (error: any) {
      console.error('Error fetching connections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Listen for OAuth callback message from popup OR URL param fallback
  useEffect(() => {
    const processOAuthCode = async (code: string, channel: 'whatsapp' | 'instagram' = 'whatsapp') => {
      const setter = channel === 'instagram' ? setIsConnectingIG : setIsConnectingWA;
      setter(true);
      try {
        const { data, error } = await supabase.functions.invoke('meta-oauth-callback', {
          body: {
            code,
            user_id: user?.id,
            redirect_uri: META_REDIRECT_URI,
            channel,
          },
        });

        if (error) throw error;

        if (data?.success) {
          const connName = data.connections?.[0]?.account_name || data.connection?.account_name || 'Conta';
          toast({
            title: channel === 'instagram' ? '✅ Instagram Conectado!' : '✅ WhatsApp Conectado!',
            description: `Conta "${connName}" conectada com sucesso.`,
          });
          fetchConnections();
        } else {
          throw new Error(data?.error || 'Falha na conexão');
        }
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        toast({
          title: 'Erro na conexão',
          description: error.message || 'Falha ao conectar.',
          variant: 'destructive',
        });
      } finally {
        setter(false);
      }
    };

    // Check URL for oauth_code (fallback when not opened as popup)
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const urlCode = hashParams.get('oauth_code');
    if (urlCode) {
      const cleanHash = window.location.hash.split('?')[0];
      window.history.replaceState(null, '', window.location.pathname + cleanHash);
      processOAuthCode(urlCode);
    }

    // Check for Instagram success redirect
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('success') === 'true') {
      toast({
        title: '✅ Conexão realizada!',
        description: `Canal(is) ${searchParams.get('channels') || ''} conectado(s) com sucesso.`,
      });
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      fetchConnections();
    }

    // Listen for postMessage from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'META_OAUTH_CALLBACK' && event.data?.code) {
        processOAuthCode(event.data.code, event.data.channel || 'whatsapp');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user, fetchConnections]);

  const handleConnectWhatsApp = () => {
    if (!user) return;
    const state = btoa(JSON.stringify({ user_id: user.id, channel: 'whatsapp', redirect_uri: META_REDIRECT_URI }));
    const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&scope=${WHATSAPP_SCOPES}&response_type=code&state=${state}`;
    window.location.href = oauthUrl;
  };

  const handleConnectInstagram = () => {
    if (!user) return;
    const state = btoa(JSON.stringify({ user_id: user.id, channel: 'instagram', redirect_uri: META_REDIRECT_URI }));
    const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&scope=${INSTAGRAM_SCOPES}&response_type=code&state=${state}`;
    window.location.href = oauthUrl;
  };

  const openOAuthPopup = (url: string) => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(url, 'meta_oauth', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);
  };

  const handleDisconnect = async (conn: ChannelConnection) => {
    const label = conn.channel_type === 'instagram' ? 'Instagram' : 'WhatsApp';
    if (!confirm(`Tem certeza que deseja desconectar o ${label}?`)) return;
    
    try {
      const { error } = await supabase
        .from('meta_channel_connections')
        .delete()
        .eq('id', conn.id);

      if (error) throw error;

      if (conn.channel_type === 'instagram') setInstagramConn(null);
      else setWhatsappConn(null);

      toast({ title: `${label} desconectado`, description: 'A conexão foi removida com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
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
      {/* WhatsApp Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            WhatsApp Cloud API
          </CardTitle>
          <CardDescription>
            Conecte seu WhatsApp Business oficial com 1 clique via OAuth da Meta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {whatsappConn && whatsappConn.status === 'connected' ? (
            <ConnectedState
              connection={whatsappConn}
              icon={<Phone className="w-5 h-5 text-green-500" />}
              label="WhatsApp"
              color="green"
              onReconnect={handleConnectWhatsApp}
              onDisconnect={() => handleDisconnect(whatsappConn)}
              details={[
                { label: 'Conta', value: whatsappConn.account_name },
                { label: 'Phone Number ID', value: whatsappConn.phone_number_id, mono: true },
                { label: 'WABA ID', value: whatsappConn.meta_business_id, mono: true },
                { label: 'Última Atividade', value: whatsappConn.last_activity_at ? new Date(whatsappConn.last_activity_at).toLocaleString('pt-BR') : 'Nunca' },
              ]}
            />
          ) : (
            <DisconnectedState
              label="WhatsApp"
              description="Clique abaixo para conectar seu WhatsApp Business oficial via Meta."
              buttonLabel="Conectar WhatsApp Oficial"
              buttonIcon={<Phone className="w-5 h-5 mr-2" />}
              buttonColor="bg-green-600 hover:bg-green-700"
              isConnecting={isConnectingWA}
              onConnect={handleConnectWhatsApp}
            />
          )}
        </CardContent>
      </Card>

      {/* Instagram Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            Instagram Business API
          </CardTitle>
          <CardDescription>
            Conecte sua conta Instagram Business para enviar e receber DMs via Omnichat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {instagramConn && instagramConn.status === 'connected' ? (
            <ConnectedState
              connection={instagramConn}
              icon={<Instagram className="w-5 h-5 text-pink-500" />}
              label="Instagram"
              color="pink"
              onReconnect={handleConnectInstagram}
              onDisconnect={() => handleDisconnect(instagramConn)}
              details={[
                { label: 'Conta', value: instagramConn.account_name },
                { label: 'Instagram ID', value: instagramConn.instagram_id, mono: true },
                { label: 'Page ID', value: instagramConn.page_id, mono: true },
                { label: 'Última Atividade', value: instagramConn.last_activity_at ? new Date(instagramConn.last_activity_at).toLocaleString('pt-BR') : 'Nunca' },
              ]}
            />
          ) : (
            <DisconnectedState
              label="Instagram"
              description="Clique abaixo para conectar sua conta Instagram Business via Meta."
              buttonLabel="Conectar Instagram Business"
              buttonIcon={<Instagram className="w-5 h-5 mr-2" />}
              buttonColor="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
              isConnecting={isConnectingIG}
              onConnect={handleConnectInstagram}
              hints={[
                'Você será redirecionado para o Facebook para autorizar o acesso.',
                'É necessário ter uma Página do Facebook vinculada a uma conta Instagram Business.',
                'Seus tokens são armazenados de forma segura.',
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ====== Sub-components ======

interface DetailItem {
  label: string;
  value: string | null;
  mono?: boolean;
}

const colorMap: Record<string, { bg: string; border: string; text: string; textDark: string; badge: string; badgeText: string; icon: string }> = {
  green: {
    bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-700', textDark: 'dark:text-green-400',
    badge: 'bg-green-500/20', badgeText: 'text-green-600 dark:text-green-400 border-green-500/30', icon: 'text-green-500',
  },
  pink: {
    bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-700', textDark: 'dark:text-pink-400',
    badge: 'bg-pink-500/20', badgeText: 'text-pink-600 dark:text-pink-400 border-pink-500/30', icon: 'text-pink-500',
  },
};

const ConnectedState = ({
  connection,
  icon,
  label,
  color,
  onReconnect,
  onDisconnect,
  details,
}: {
  connection: ChannelConnection;
  icon: React.ReactNode;
  label: string;
  color: string;
  onReconnect: () => void;
  onDisconnect: () => void;
  details: DetailItem[];
}) => {
  const c = colorMap[color] || colorMap.green;
  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 p-4 rounded-lg ${c.bg} border ${c.border}`}>
        <CheckCircle2 className={`w-8 h-8 ${c.icon} shrink-0`} />
        <div className="flex-1">
          <p className={`font-semibold ${c.text} ${c.textDark}`}>
            🟢 {label} Conectado
          </p>
          <p className="text-sm text-muted-foreground">
            Conta vinculada e pronta para enviar/receber mensagens.
          </p>
        </div>
        <Badge className={`${c.badge} ${c.badgeText}`}>
          Ativo
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {details.map((d) => (
          <div key={d.label} className="p-4 rounded-lg border bg-card">
            <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
            <p className={d.mono ? 'font-mono text-sm' : 'font-medium'}>{d.value || 'N/A'}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReconnect}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reconectar
        </Button>
        <Button variant="destructive" size="sm" onClick={onDisconnect}>
          <Trash2 className="w-4 h-4 mr-2" />
          Desconectar
        </Button>
      </div>
    </div>
  );
};

const DisconnectedState = ({
  label,
  description,
  buttonLabel,
  buttonIcon,
  buttonColor,
  isConnecting,
  onConnect,
  hints,
}: {
  label: string;
  description: string;
  buttonLabel: string;
  buttonIcon: React.ReactNode;
  buttonColor: string;
  isConnecting: boolean;
  onConnect: () => void;
  hints?: string[];
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
      <XCircle className="w-8 h-8 text-muted-foreground shrink-0" />
      <div>
        <p className="font-semibold">{label} não conectado</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>

    <Button
      size="lg"
      className={`w-full ${buttonColor} text-white`}
      onClick={onConnect}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
          Conectando...
        </>
      ) : (
        <>
          {buttonIcon}
          {buttonLabel}
          <ExternalLink className="w-4 h-4 ml-2" />
        </>
      )}
    </Button>

    <div className="text-xs text-muted-foreground space-y-1">
      {(hints || [
        'Você será redirecionado para o Facebook para autorizar o acesso.',
        'É necessário ter uma conta Meta Business verificada.',
        'Seus tokens são armazenados de forma segura.',
      ]).map((hint, i) => (
        <p key={i}>• {hint}</p>
      ))}
    </div>
  </div>
);