import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, Clock, ArrowLeft, MessageCircle, Calendar, Home } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  category: string;
  tags: string[];
  publish_date: string;
  word_count: number;
  author: string;
  internal_links: string[];
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<{ title: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) fetchPost(slug);
  }, [slug]);

  const fetchPost = async (s: string) => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', s)
      .eq('status', 'published')
      .single();

    if (!error && data) {
      setPost(data);
      document.title = data.meta_title || data.title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', data.meta_description || data.excerpt || '');
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
      link.href = `https://supremeempreendimentos.com/blog/${data.slug}`;

      // Increment view count
      await supabase.from('blog_posts').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);

      // Fetch related
      const { data: related } = await supabase
        .from('blog_posts')
        .select('title, slug')
        .eq('status', 'published')
        .neq('id', data.id)
        .eq('category', data.category)
        .limit(3);
      if (related) setRelatedPosts(related);
    }
    setLoading(false);
  };

  const readTime = (words: number) => Math.max(1, Math.ceil(words / 200));

  // Simple markdown to HTML
  const renderContent = (md: string) => {
    let html = md
      .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-foreground mt-8 mb-3">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-foreground mt-10 mb-4">$1</h2>')
      .replace(/^\* (.+)$/gm, '<li class="ml-4 text-muted-foreground">$1</li>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-muted-foreground">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p class="text-muted-foreground leading-relaxed mb-4">')
      .replace(/📱/g, '📱').replace(/📅/g, '📅').replace(/🏠/g, '🏠');
    
    return `<p class="text-muted-foreground leading-relaxed mb-4">${html}</p>`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Artigo não encontrado</h1>
          <Link to="/blog" className="text-accent hover:underline">Voltar ao blog</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const categoryLabel: Record<string, string> = {
    'mercado-imobiliario': 'Mercado Imobiliário',
    'investimento': 'Investimento',
    'bairros-nobres': 'Bairros Nobres',
    'estilo-de-vida': 'Estilo de Vida',
    'dicas-compra': 'Dicas de Compra',
    'tendencias': 'Tendências',
  };

  // JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "Supreme Empreendimentos" },
    datePublished: post.publish_date,
    url: `https://supremeempreendimentos.com/#/blog/${post.slug}`,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <Link to="/blog" className="inline-flex items-center gap-2 text-accent hover:underline mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Blog
        </Link>

        <header className="mb-10">
          <Badge variant="secondary" className="mb-4">
            {categoryLabel[post.category] || post.category}
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {new Date(post.publish_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {readTime(post.word_count)} min de leitura
            </span>
          </div>
        </header>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
        />

        {/* CTAs */}
        <div className="mt-12 p-8 bg-primary/5 rounded-2xl border border-accent/20 space-y-4">
          <h3 className="text-2xl font-bold text-foreground mb-6">Interessado em imóveis de luxo em Goiânia?</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => window.open('https://wa.me/5562999918353?text=Olá! Vi o artigo no blog e gostaria de saber mais sobre imóveis de luxo.', '_blank')}
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Falar com Especialista
            </Button>
            <Button
              variant="outline"
              className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              onClick={() => window.open('https://wa.me/5562999918353?text=Olá! Gostaria de agendar uma visita a imóveis de alto padrão.', '_blank')}
            >
              <Calendar className="mr-2 h-4 w-4" /> Agendar Visita
            </Button>
            <Link to="/comprar">
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" /> Ver Imóveis
              </Button>
            </Link>
          </div>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h3 className="text-xl font-bold text-foreground mb-4">Artigos Relacionados</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <Link key={rp.slug} to={`/blog/${rp.slug}`} className="p-4 rounded-lg border hover:border-accent transition-colors">
                  <p className="font-medium text-foreground hover:text-accent transition-colors">{rp.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <Footer />
    </div>
  );
};

export default BlogPost;
