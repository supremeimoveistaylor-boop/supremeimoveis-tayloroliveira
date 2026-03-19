import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Newspaper, Sparkles, Trash2, Eye, Calendar, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  publish_date: string | null;
  word_count: number;
  view_count: number;
  ai_generated: boolean;
  created_at: string;
}

export const BlogAdminPanel = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, status, category, publish_date, word_count, view_count, ai_generated, created_at')
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  };

  const generatePosts = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: { count: 3 },
      });
      if (error) throw error;
      toast({ title: 'Posts gerados!', description: `${data?.posts_generated || 0} posts criados com sucesso.` });
      fetchPosts();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setGenerating(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === 'published' && !posts.find(p => p.id === id)?.publish_date) {
      update.publish_date = new Date().toISOString();
    }
    const { error } = await supabase.from('blog_posts').update(update).eq('id', id);
    if (!error) {
      setPosts(posts.map(p => p.id === id ? { ...p, ...update } : p));
      toast({ title: 'Status atualizado' });
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Excluir este post?')) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (!error) {
      setPosts(posts.filter(p => p.id !== id));
      toast({ title: 'Post excluído' });
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      published: 'default', scheduled: 'secondary', draft: 'outline', archived: 'destructive',
    };
    const labels: Record<string, string> = {
      published: 'Publicado', scheduled: 'Agendado', draft: 'Rascunho', archived: 'Arquivado',
    };
    return <Badge variant={map[s] || 'outline'}>{labels[s] || s}</Badge>;
  };

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    views: posts.reduce((s, p) => s + (p.view_count || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-foreground">{stats.total}</p><p className="text-sm text-muted-foreground">Total de Posts</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-green-600">{stats.published}</p><p className="text-sm text-muted-foreground">Publicados</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-accent">{stats.scheduled}</p><p className="text-sm text-muted-foreground">Agendados</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-foreground">{stats.views}</p><p className="text-sm text-muted-foreground">Visualizações</p></CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4 flex-wrap">
        <Button onClick={generatePosts} disabled={generating}>
          {generating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {generating ? 'Gerando...' : 'Gerar 3 Posts com IA'}
        </Button>
        <Button variant="outline" onClick={fetchPosts}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : posts.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <Newspaper className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Nenhum post ainda</p>
          <p className="text-muted-foreground">Clique em "Gerar Posts com IA" para começar.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(post.status)}
                    {post.ai_generated && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                  </div>
                  <h3 className="font-medium text-foreground truncate">{post.title}</h3>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span>{post.word_count} palavras</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.view_count}</span>
                    {post.publish_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(post.publish_date).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={post.status} onValueChange={(v) => updateStatus(post.id, v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => deletePost(post.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
