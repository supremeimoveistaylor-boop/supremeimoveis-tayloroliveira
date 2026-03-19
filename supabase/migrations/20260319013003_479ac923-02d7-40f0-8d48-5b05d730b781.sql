
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  meta_title TEXT,
  meta_description TEXT,
  category TEXT DEFAULT 'mercado-imobiliario',
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  featured_image_url TEXT,
  author TEXT DEFAULT 'Supreme Empreendimentos',
  publish_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  ai_generated BOOLEAN DEFAULT false,
  internal_links TEXT[] DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anyone can read published posts" ON public.blog_posts
  FOR SELECT USING (status = 'published' AND (publish_date IS NULL OR publish_date <= now()));

-- Admins can manage all posts
CREATE POLICY "Admins can manage blog posts" ON public.blog_posts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated at trigger
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for slug lookups and listing
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status_date ON public.blog_posts(status, publish_date DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);
