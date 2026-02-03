package db

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
)

type ClinicaJSON struct {
	Nombre    string      `json:"nombre"`
	Direccion string      `json:"direccion"`
	Ciudad    string      `json:"ciudad"`
	Lat       interface{} `json:"lat"`
	Lng       interface{} `json:"lng"`
	Telefono  string      `json:"telefono"`
	Rating    interface{} `json:"rating"`
	Reviews   interface{} `json:"reviews"`
	Horario   string      `json:"horario"`
	TipoFicha string      `json:"tipoFicha"`
}

func makeSlug(name string, city string) string {
	raw := strings.ToLower(fmt.Sprintf("%s-%s", name, city))
	reg, _ := regexp.Compile("[^a-z0-9]+")
	return reg.ReplaceAllString(raw, "-")
}

func SeedClinicas() error {
	data, err := os.ReadFile("clinicas.json")
	if err != nil {
		return fmt.Errorf("no se pudo abrir clinicas.json: %v", err)
	}

	var clinicas []ClinicaJSON
	if err := json.Unmarshal(data, &clinicas); err != nil {
		return fmt.Errorf("error al parsear JSON: %v", err)
	}

	ctx := context.Background()
	log.Printf("🚀 Iniciando importación clasificada de %d registros...", len(clinicas))

	for i, c := range clinicas {
		var entityType string
		switch c.TipoFicha {
		case "fichas_clinicas":
			entityType = "CLINIC"
		case "fichas_hospitales":
			entityType = "HOSPITAL"
		case "fichas_veterinarios":
			entityType = "HOME_VET"
		default:
			entityType = "CLINIC"
		}

		// --- ADAPTACIÓN DE HORARIO AL STRUCT WorkingDay ---
		// Esto evita el error de "cannot unmarshal string into WorkingDay"
		workingHoursAdapted := map[string]interface{}{
			"monday": map[string]interface{}{
				"active": true,
				"start":  "Consultar",
				"end":    c.Horario, // Guardamos el texto completo aquí para que se vea en el perfil
			},
		}

		profileData := map[string]interface{}{
			"addresses": []map[string]interface{}{
				{
					"full_address": c.Direccion,
					"city":         c.Ciudad,
					"latitude":     sanitizeCoord(c.Lat),
					"longitude":    sanitizeCoord(c.Lng),
					"is_main":      true,
				},
			},
			"contact": map[string]string{
				"phone": c.Telefono,
			},
			"working_hours": workingHoursAdapted, // <--- Ahora es un objeto, no un string
			"specialties":   []string{},
		}

		profileDataJSON, _ := json.Marshal(profileData)
		slug := makeSlug(c.Nombre, c.Ciudad)

		query := `
            INSERT INTO professional_entities (
                entity_type, status, name, slug, 
                rating, review_count, profile_data, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            ON CONFLICT (slug) DO UPDATE SET 
                entity_type = EXCLUDED.entity_type,
                profile_data = EXCLUDED.profile_data,
                rating = EXCLUDED.rating,
                review_count = EXCLUDED.review_count,
                updated_at = NOW()
            RETURNING id`

		var actualID string
		err = Conn.QueryRow(ctx, query,
			entityType,
			"PROSPECT",
			c.Nombre,
			slug,
			toFloat(c.Rating),
			int(toFloat(c.Reviews)),
			profileDataJSON,
		).Scan(&actualID)

		if err != nil {
			log.Printf("❌ Error importando %s: %v", c.Nombre, err)
			continue
		}

		if i > 0 && i%200 == 0 {
			log.Printf("... %d registros procesados", i)
		}
	}

	log.Println("✅ Seeder completado con éxito.")
	return nil
}

// sanitizeCoord evita que el mapa reciba ceros o NaNs que lo bloquean
func sanitizeCoord(v interface{}) float64 {
	f := toFloat(v)
	if f == 0 {
		return 40.4167 // Madrid por defecto si no hay lat/lng
	}
	return f
}

func toFloat(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch t := v.(type) {
	case float64:
		return t
	case float32:
		return float64(t)
	case int:
		return float64(t)
	case int64:
		return float64(t)
	case string:
		var f float64
		cleanStr := strings.Replace(t, ",", ".", -1)
		fmt.Sscanf(cleanStr, "%f", &f)
		return f
	default:
		return 0
	}
}
