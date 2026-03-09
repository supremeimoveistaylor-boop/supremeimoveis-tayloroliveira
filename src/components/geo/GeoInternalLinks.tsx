import { Link } from 'react-router-dom';
import { MapPin, Building, Trees, ShoppingBag, GraduationCap, Heart, Star } from 'lucide-react';
import { neighborhoods, streets, pois } from '@/lib/geo-locations';

interface GeoInternalLinksProps {
  variant?: 'full' | 'compact';
  exclude?: string;
}

const poiIcon = (type: string) => {
  switch (type) {
    case 'parque': return <Trees className="h-3 w-3" />;
    case 'shopping': return <ShoppingBag className="h-3 w-3" />;
    case 'universidade': return <GraduationCap className="h-3 w-3" />;
    case 'hospital': return <Heart className="h-3 w-3" />;
    default: return <MapPin className="h-3 w-3" />;
  }
};

export const GeoInternalLinks = ({ variant = 'full', exclude }: GeoInternalLinksProps) => {
  const filteredNeighborhoods = neighborhoods.filter(n => n.slug !== exclude);
  const filteredStreets = streets.filter(s => s.slug !== exclude);
  const filteredPois = pois.filter(p => p.slug !== exclude);

  if (variant === 'compact') {
    const all = [
      ...filteredNeighborhoods.slice(0, 4).map(n => ({ to: `/imoveis/bairro/${n.slug}`, label: n.name, icon: <Building className="h-3 w-3" /> })),
      ...filteredStreets.slice(0, 3).map(s => ({ to: `/imoveis/rua/${s.slug}`, label: s.name, icon: <MapPin className="h-3 w-3" /> })),
      ...filteredPois.slice(0, 3).map(p => ({ to: `/imoveis/perto/${p.slug}`, label: p.name, icon: poiIcon(p.type) })),
    ];

    return (
      <div className="flex flex-wrap justify-center gap-2">
        {all.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border text-sm hover:border-accent hover:text-accent transition-colors"
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Building className="h-5 w-5 text-accent" />
          Por Bairro
        </h3>
        <ul className="space-y-2">
          {filteredNeighborhoods.map(n => (
            <li key={n.slug}>
              <Link to={`/imoveis/bairro/${n.slug}`} className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Imóveis no {n.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" />
          Por Rua
        </h3>
        <ul className="space-y-2">
          {filteredStreets.map(s => (
            <li key={s.slug}>
              <Link to={`/imoveis/rua/${s.slug}`} className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Imóveis na {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-accent" />
          Perto de
        </h3>
        <ul className="space-y-2">
          {filteredPois.map(p => (
            <li key={p.slug}>
              <Link to={`/imoveis/perto/${p.slug}`} className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1">
                {poiIcon(p.type)}
                Imóveis perto do {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
