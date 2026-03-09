// Geo location data for Goiânia SEO pages
export interface GeoNeighborhood {
  slug: string;
  name: string;
  region: string;
  description: string;
  lat: number;
  lng: number;
}

export interface GeoStreet {
  slug: string;
  name: string;
  neighborhood: string;
  description: string;
}

export interface GeoPOI {
  slug: string;
  name: string;
  type: 'parque' | 'shopping' | 'universidade' | 'hospital' | 'transporte';
  lat: number;
  lng: number;
  description: string;
}

export const CITY = 'Goiânia';
export const STATE = 'GO';
export const CANONICAL_BASE = 'https://supremeempreendimentos.com';

export const neighborhoods: GeoNeighborhood[] = [
  { slug: 'setor-bueno', name: 'Setor Bueno', region: 'Sul', description: 'Um dos bairros mais valorizados de Goiânia, o Setor Bueno oferece infraestrutura completa com restaurantes, bares, academias e fácil acesso às principais vias da cidade.', lat: -16.7080, lng: -49.2700 },
  { slug: 'setor-marista', name: 'Setor Marista', region: 'Sul', description: 'Bairro nobre e tradicional, o Setor Marista é referência em qualidade de vida com ruas arborizadas, comércios sofisticados e proximidade ao Parque Flamboyant.', lat: -16.7020, lng: -49.2600 },
  { slug: 'setor-oeste', name: 'Setor Oeste', region: 'Oeste', description: 'O Setor Oeste combina localização privilegiada com acesso rápido ao centro e aos principais shoppings da cidade. Ideal para quem busca praticidade.', lat: -16.6800, lng: -49.2750 },
  { slug: 'jardim-goias', name: 'Jardim Goiás', region: 'Sul', description: 'Jardim Goiás é sinônimo de alto padrão. Abriga o Parque Flamboyant e o Shopping Flamboyant, sendo um dos endereços mais desejados de Goiânia.', lat: -16.7150, lng: -49.2400 },
  { slug: 'setor-central', name: 'Setor Central', region: 'Centro', description: 'O coração de Goiânia, com acesso a todos os serviços públicos, comércio popular e transporte coletivo abundante.', lat: -16.6790, lng: -49.2550 },
  { slug: 'alphaville-flamboyant', name: 'Alphaville Flamboyant', region: 'Sul', description: 'Condomínio fechado de alto padrão com segurança 24h, áreas de lazer completas e localização privilegiada próxima ao Shopping Flamboyant.', lat: -16.7300, lng: -49.2300 },
  { slug: 'aldeia-do-vale', name: 'Aldeia do Vale', region: 'Sul', description: 'Um dos condomínios mais exclusivos de Goiânia, com lotes amplos, natureza preservada e infraestrutura de clube.', lat: -16.7400, lng: -49.2100 },
  { slug: 'setor-nova-suica', name: 'Setor Nova Suíça', region: 'Oeste', description: 'Bairro residencial tranquilo com boa infraestrutura, escolas e supermercados nas proximidades.', lat: -16.6850, lng: -49.2900 },
  { slug: 'jardim-america', name: 'Jardim América', region: 'Sul', description: 'Bairro tradicional e consolidado com ampla oferta de comércio, serviços e opções de lazer.', lat: -16.7000, lng: -49.2500 },
  { slug: 'parque-amazonia', name: 'Parque Amazônia', region: 'Sul', description: 'Região em crescimento com excelente custo-benefício, próxima ao Parque Areião e à Avenida T-63.', lat: -16.7100, lng: -49.2800 },
  { slug: 'setor-pedro-ludovico', name: 'Setor Pedro Ludovico', region: 'Sul', description: 'Bairro residencial com ruas arborizadas, praças e fácil acesso ao centro da cidade.', lat: -16.6950, lng: -49.2650 },
  { slug: 'vila-rosa', name: 'Vila Rosa', region: 'Sul', description: 'Bairro em expansão com novos empreendimentos e excelente potencial de valorização.', lat: -16.7200, lng: -49.2550 },
];

export const streets: GeoStreet[] = [
  { slug: 'avenida-t-63', name: 'Avenida T-63', neighborhood: 'Setor Bueno', description: 'Uma das avenidas mais movimentadas do Setor Bueno, a T-63 é repleta de restaurantes, bares e comércios. Excelente localização para quem busca vida urbana.' },
  { slug: 'avenida-85', name: 'Avenida 85', neighborhood: 'Setor Marista', description: 'A Avenida 85 é uma das vias mais nobres de Goiânia, conectando os setores Marista e Bueno com ampla oferta de serviços e gastronomia.' },
  { slug: 'avenida-t-9', name: 'Avenida T-9', neighborhood: 'Setor Bueno', description: 'Via importante do Setor Bueno com edifícios residenciais de alto padrão e fácil acesso ao Parque Vaca Brava.' },
  { slug: 'avenida-portugal', name: 'Avenida Portugal', neighborhood: 'Setor Oeste', description: 'Avenida tradicional do Setor Oeste com comércio variado e boa infraestrutura urbana.' },
  { slug: 'avenida-t-4', name: 'Avenida T-4', neighborhood: 'Setor Bueno', description: 'Via residencial e comercial no coração do Setor Bueno, com fácil acesso a escolas e hospitais.' },
  { slug: 'rua-t-37', name: 'Rua T-37', neighborhood: 'Setor Bueno', description: 'Rua tranquila e arborizada no Setor Bueno, muito procurada por famílias que buscam qualidade de vida.' },
  { slug: 'avenida-republica-do-libano', name: 'Avenida República do Líbano', neighborhood: 'Setor Oeste', description: 'Avenida nobre do Setor Oeste com imóveis de alto padrão e proximidade a áreas verdes.' },
  { slug: 'avenida-terceira-radial', name: 'Avenida Terceira Radial', neighborhood: 'Setor Pedro Ludovico', description: 'Uma das principais vias de Goiânia, conectando diversos bairros com fácil acesso ao transporte público.' },
];

export const pois: GeoPOI[] = [
  { slug: 'parque-flamboyant', name: 'Parque Flamboyant', type: 'parque', lat: -16.7130, lng: -49.2430, description: 'O Parque Flamboyant é o maior parque urbano de Goiânia, com lagos, trilhas e áreas de lazer. Morar perto é sinônimo de qualidade de vida.' },
  { slug: 'parque-vaca-brava', name: 'Parque Vaca Brava', type: 'parque', lat: -16.7050, lng: -49.2680, description: 'O Parque Vaca Brava é o cartão postal do Setor Bueno, com pista de caminhada, playground e eventos culturais.' },
  { slug: 'parque-areiao', name: 'Parque Areião', type: 'parque', lat: -16.7090, lng: -49.2780, description: 'O Parque Areião oferece contato com a natureza no coração de Goiânia, ideal para atividades ao ar livre.' },
  { slug: 'shopping-flamboyant', name: 'Shopping Flamboyant', type: 'shopping', lat: -16.7170, lng: -49.2380, description: 'O maior shopping de Goiânia, com mais de 400 lojas, cinema, praça de alimentação e eventos culturais.' },
  { slug: 'goiania-shopping', name: 'Goiânia Shopping', type: 'shopping', lat: -16.6920, lng: -49.2620, description: 'Shopping tradicional de Goiânia com localização central e fácil acesso por transporte público.' },
  { slug: 'shopping-passeio-das-aguas', name: 'Shopping Passeio das Águas', type: 'shopping', lat: -16.6500, lng: -49.2800, description: 'Um dos maiores shoppings do Centro-Oeste, com parque aquático e ampla área de lazer.' },
  { slug: 'ufg', name: 'Universidade Federal de Goiás (UFG)', type: 'universidade', lat: -16.6780, lng: -49.2540, description: 'A UFG é a principal universidade pública de Goiás. Morar próximo facilita o acesso aos campus e à vida acadêmica.' },
  { slug: 'puc-goias', name: 'PUC Goiás', type: 'universidade', lat: -16.6850, lng: -49.2370, description: 'A PUC Goiás é uma das maiores universidades particulares do estado, com campus moderno e completo.' },
  { slug: 'hospital-araujo-jorge', name: 'Hospital Araújo Jorge', type: 'hospital', lat: -16.6900, lng: -49.2500, description: 'Hospital referência em oncologia na região Centro-Oeste do Brasil.' },
];

export const regions = [
  { slug: 'regiao-sul', name: 'Região Sul', neighborhoods: ['setor-bueno', 'setor-marista', 'jardim-goias', 'jardim-america', 'parque-amazonia'] },
  { slug: 'regiao-oeste', name: 'Região Oeste', neighborhoods: ['setor-oeste', 'setor-nova-suica'] },
  { slug: 'regiao-central', name: 'Região Central', neighborhoods: ['setor-central'] },
];

export type GeoPageType = 'bairro' | 'rua' | 'perto' | 'regiao';

export function getAllGeoSlugs(): { slug: string; type: GeoPageType; label: string }[] {
  const all: { slug: string; type: GeoPageType; label: string }[] = [];
  neighborhoods.forEach(n => all.push({ slug: n.slug, type: 'bairro', label: `Imóveis no ${n.name}` }));
  streets.forEach(s => all.push({ slug: s.slug, type: 'rua', label: `Imóveis na ${s.name}` }));
  pois.forEach(p => all.push({ slug: p.slug, type: 'perto', label: `Imóveis perto do ${p.name}` }));
  regions.forEach(r => all.push({ slug: r.slug, type: 'regiao', label: `Imóveis na ${r.name}` }));
  return all;
}

export function getRelatedLocations(currentSlug: string, limit = 6): { slug: string; type: GeoPageType; label: string }[] {
  const all = getAllGeoSlugs().filter(g => g.slug !== currentSlug);
  // Shuffle and return limited
  return all.sort(() => Math.random() - 0.5).slice(0, limit);
}
