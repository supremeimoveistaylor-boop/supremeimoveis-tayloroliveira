-- Adicionar índices para busca performática na tabela properties
-- Full Text Search no título e descrição
CREATE INDEX IF NOT EXISTS idx_properties_fts ON properties 
USING GIN (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Índices para filtros comuns
CREATE INDEX IF NOT EXISTS idx_properties_purpose ON properties (purpose);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties (property_type);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties (location);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties (price);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties (status);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties (bedrooms);

-- Índice composto para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_properties_search_combo ON properties (status, purpose, property_type, price);