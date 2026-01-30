-- Índices para optimizar el buscador de Veterimap
-- Día 14 y 15

-- 1. Búsqueda por nombre de clínica (Frecuente)
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles (name);

-- 2. Búsqueda por ciudad en la tabla de ubicaciones
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations (city);

-- 3. Búsqueda por tags (especialidad)
CREATE INDEX IF NOT EXISTS idx_profile_tags_tag ON profile_tags (tag_name);

-- 4. Optimización para ordenado por rating y reseñas
CREATE INDEX IF NOT EXISTS idx_profiles_rating_reviews ON profiles (rating DESC, review_count DESC);