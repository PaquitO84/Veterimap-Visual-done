package db

import (
	"context"
	"encoding/json"
	"fmt"
	"veterimap-api/internal/domain"

	"github.com/google/uuid"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresProfileRepository struct {
	Conn *pgxpool.Pool
}

func NewPostgresProfileRepository(db *pgxpool.Pool) *PostgresProfileRepository {
	return &PostgresProfileRepository{Conn: db}
}

// SearchProfiles: Motor de búsqueda unificado para mapa y listados
func (r *PostgresProfileRepository) SearchProfiles(ctx context.Context, name, city, tag string, limit, offset int) (int, []domain.ProfileSummary, error) {
	var profiles []domain.ProfileSummary
	var totalCount int

	// Preparamos los parámetros para ILIKE
	nameParam := "%" + name + "%"
	cityParam := "%" + city + "%"

	// 1. QUERY DE CONTEO
	// Nota: En Go, para pasar un '%' literal en una string que usa placeholders, se usa '%%'
	countQuery := `
        SELECT COUNT(*) 
        FROM professional_entities 
        WHERE is_active = true
          AND ($1 = '%%' OR name ILIKE $1)
          AND ($2 = '%%' OR profile_data->'addresses'->0->>'city' ILIKE $2)
          AND (
               $3 = '' OR 
               entity_type = $3 OR 
               profile_data->'specialties' @> jsonb_build_array($3)
          )`

	err := r.Conn.QueryRow(ctx, countQuery, nameParam, cityParam, tag).Scan(&totalCount)
	if err != nil {
		return 0, nil, fmt.Errorf("error counting profiles: %v", err)
	}

	// 2. QUERY DE DATOS
	// Corregimos la extracción de latitude/longitude.
	// Al usar ->> extraemos texto, por lo que casteamos a NUMERIC para el Scan a float64.
	dataQuery := `
        SELECT 
            id, 
            name, 
            entity_type, 
            rating, 
            review_count,
            COALESCE(profile_data->'addresses'->0->>'city', '') as city,
            COALESCE(profile_data->'addresses'->0->>'full_address', '') as full_address,
            COALESCE((profile_data->'addresses'->0->>'latitude')::numeric, 0) as lat,
            COALESCE((profile_data->'addresses'->0->>'longitude')::numeric, 0) as lng
        FROM professional_entities
        WHERE is_active = true
          AND ($1 = '%%' OR name ILIKE $1)
          AND ($2 = '%%' OR profile_data->'addresses'->0->>'city' ILIKE $2)
          AND (
               $3 = '' OR 
               entity_type = $3 OR 
               profile_data->'specialties' @> jsonb_build_array($3)
          )
        ORDER BY rating DESC, review_count DESC
        LIMIT $4 OFFSET $5`

	rows, err := r.Conn.Query(ctx, dataQuery, nameParam, cityParam, tag, limit, offset)
	if err != nil {
		return 0, nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var p domain.ProfileSummary

		err := rows.Scan(
			&p.ID,
			&p.Name,
			&p.ProfileType,
			&p.Rating,
			&p.ReviewCount,
			&p.City,
			&p.FullAddress,
			&p.Latitude,
			&p.Longitude,
		)
		if err != nil {
			fmt.Printf("⚠️ Error scanneando perfil ID %s: %v\n", p.ID, err)
			continue
		}
		profiles = append(profiles, p)
	}
	return totalCount, profiles, nil
}

// GetProfileDetail: Obtiene la ficha completa decodificando el JSONB automáticamente
func (r *PostgresProfileRepository) GetProfileDetail(ctx context.Context, id string) (*domain.ProfileDetail, error) {
	// IMPORTANTE: id, user_id, entity_type, status, name, slug, rating, review_count, is_active son columnas reales.
	// profile_data es la columna JSONB que mapea al struct anidado.
	query := `SELECT id, user_id, entity_type, status, name, slug, profile_data, rating, review_count, is_active, created_at, updated_at 
              FROM professional_entities WHERE id = $1`

	var d domain.ProfileDetail

	err := r.Conn.QueryRow(ctx, query, id).Scan(
		&d.ID,          // Se mapea a uuid.UUID en el struct
		&d.UserID,      // Se mapea a *uuid.UUID en el struct
		&d.EntityType,  // string
		&d.Status,      // string
		&d.Name,        // string
		&d.Slug,        // string
		&d.ProfileData, // pgx detecta el destino Struct y la columna JSONB automáticamente
		&d.Rating,      // float64
		&d.ReviewCount, // int
		&d.IsActive,    // bool
		&d.CreatedAt,   // time.Time
		&d.UpdatedAt,   // time.Time
	)

	if err != nil {
		return nil, fmt.Errorf("error obteniendo detalle de perfil: %v", err)
	}

	return &d, nil
}

func (r *PostgresProfileRepository) UpsertProfessionalProfile(ctx context.Context, p *domain.ProfessionalEntity) error {
	query := `
		INSERT INTO professional_entities (
			user_id, entity_type, status, name, slug, profile_data, is_active, updated_at
		) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			entity_type = EXCLUDED.entity_type,
			name = EXCLUDED.name,
			profile_data = EXCLUDED.profile_data,
			updated_at = NOW()
		RETURNING id, created_at`

	// En Go, para pasar un struct a JSONB en Postgres, lo serializamos primero
	profileDataJSON, err := json.Marshal(p.ProfileData)
	if err != nil {
		return fmt.Errorf("error serializing profile data: %v", err)
	}

	err = r.Conn.QueryRow(ctx, query,
		p.UserID,
		p.EntityType,
		p.Status,
		p.Name,
		p.Slug,
		profileDataJSON,
		p.IsActive,
	).Scan(&p.ID, &p.CreatedAt)

	if err != nil {
		fmt.Printf("❌ Error en UpsertProfessionalProfile: %v\n", err)
		return err
	}

	return nil
}

func (r *PostgresProfileRepository) GetProfessionalProfileByUserID(ctx context.Context, userID uuid.UUID) (*domain.ProfessionalEntity, error) {
	query := `SELECT id, user_id, entity_type, status, name, slug, profile_data, rating, review_count, is_active, created_at, updated_at 
              FROM professional_entities WHERE user_id = $1`

	var d domain.ProfessionalEntity
	err := r.Conn.QueryRow(ctx, query, userID).Scan(
		&d.ID, &d.UserID, &d.EntityType, &d.Status, &d.Name, &d.Slug,
		&d.ProfileData, &d.Rating, &d.ReviewCount, &d.IsActive, &d.CreatedAt, &d.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}
	return &d, nil
}
