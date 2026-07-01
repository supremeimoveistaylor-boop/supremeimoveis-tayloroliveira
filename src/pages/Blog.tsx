import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, Clock, ArrowRight } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  publish_date: string;
  word_count: number;
  featured_image_url: string | null;
  author: string;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Blog | Imóveis de Luxo em Goiânia - Supreme Empreendimentos';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Artigos exclusivos sobre imóveis de luxo, investimento imobiliário e bairros nobres de Goiânia. Tendências e dicas do mercado de alto padrão.');

    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, category, tags, publish_date, word_count, featured_image_url, author')
      .eq('status', 'published')
      .lte('publish_date', new Date().toISOString())
      .order('publish_date', { ascending: false })
      .limit(50);

    if (!error && data) setPosts(data);
    setLoading(false);
  };

  const readTime = (words: number) => Math.max(1, Math.ceil(words / 200));

  const categoryLabel: Record<string, string> = {
    'mercado-imobiliario': 'Mercado Imobiliário',
    'investimento': 'Investimento',
    'bairros-nobres': 'Bairros Nobres',
    'estilo-de-vida': 'Estilo de Vida',
    'dicas-compra': 'Dicas de Compra',
    'tendencias': 'Tendências',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Blog <span className="text-accent">Supreme</span>: Tendências e Dicas de Imóveis de Luxo em Goiânia
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Artigos exclusivos sobre o mercado imobiliário de luxo em Goiânia. 
            Tendências, investimentos e o melhor do alto padrão.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-xl">Em breve, novos artigos exclusivos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 group">
                  <div className="h-48 bg-gradient-to-br from-primary/10 to-accent/20 flex items-center justify-center">
                    <span className="text-4xl opacity-30">🏠</span>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabel[post.category] || post.category}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(post.publish_date).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {readTime(post.word_count)} min
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
