import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs = ({ items, className = "" }: BreadcrumbsProps) => {
  // Generate JSON-LD structured data for breadcrumbs
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      ...(item.href && { "item": `https://supremeempreendimentos.com${item.href.startsWith('#') ? item.href : `/#${item.href}`}` })
    }))
  };

  return (
    <>
      {/* JSON-LD Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      {/* Visual Breadcrumbs */}
      <nav 
        aria-label="Navegação estrutural" 
        className={`flex items-center text-sm text-muted-foreground ${className}`}
      >
        <ol className="flex items-center flex-wrap gap-1">
          {/* Home link */}
          <li className="flex items-center">
            <Link 
              to="/" 
              className="hover:text-primary transition-colors flex items-center gap-1"
              aria-label="Página inicial"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only md:not-sr-only">Início</span>
            </Link>
          </li>
          
          {items.map((item, index) => (
            <li key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" aria-hidden="true" />
              {item.href ? (
                <Link 
                  to={item.href}
                  className="hover:text-primary transition-colors truncate max-w-[150px] md:max-w-[250px]"
                  title={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span 
                  className="text-foreground font-medium truncate max-w-[150px] md:max-w-[300px]"
                  aria-current="page"
                  title={item.label}
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};
