package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"
	"veterimap-api/internal/db"
	"veterimap-api/internal/pkg/geo"

	"github.com/joho/godotenv"
)

func main() {
	// 1. Cargar entorno (buscando en varios niveles)
	_ = godotenv.Load(".env", "../.env", "../../.env")

	if os.Getenv("DB_URL") == "" {
		log.Fatal("❌ ERROR: No se detectó la variable DB_URL. Revisa el archivo .env")
	}

	// 2. Conectar a la DB
	if err := db.InitDB(); err != nil {
		log.Fatalf("❌ Error de conexión: %v", err)
	}
	defer db.CloseDB()

	log.Println("🛰️ Iniciando geocodificación en professional_entities...")

	// 3. Buscar entidades sin coordenadas
	// Filtramos por latitude '0' o NULL
	query := `
		SELECT id, profile_data 
		FROM professional_entities 
		WHERE profile_data->'addresses'->0->>'latitude' = '0' 
		   OR profile_data->'addresses'->0->>'latitude' IS NULL
		LIMIT 100` // Limitamos para evitar bloqueos largos en pruebas

	rows, err := db.Conn.Query(context.Background(), query)
	if err != nil {
		log.Fatal("Error al consultar: ", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var profileDataBytes []byte
		if err := rows.Scan(&id, &profileDataBytes); err != nil {
			log.Println("Error scan:", err)
			continue
		}

		// Parsear el JSONB
		var profileData map[string]interface{}
		if err := json.Unmarshal(profileDataBytes, &profileData); err != nil {
			log.Printf("❌ Error unmarshal ID %s: %v", id, err)
			continue
		}

		// Navegación segura en el mapa de direcciones
		addresses, ok := profileData["addresses"].([]interface{})
		if !ok || len(addresses) == 0 {
			log.Printf("⚠️ ID %s no tiene direcciones", id)
			continue
		}

		firstAddr, ok := addresses[0].(map[string]interface{})
		if !ok {
			continue
		}

		// Extraer datos para geocodificar con valores por defecto
		addr, _ := firstAddr["full_address"].(string)
		city, _ := firstAddr["city"].(string)

		if addr == "" || city == "" {
			log.Printf("⚠️ ID %s tiene dirección o ciudad vacía", id)
			continue
		}

		fullSearch := addr + ", " + city
		log.Printf("📍 Buscando: %s", fullSearch)

		// 4. Obtener coordenadas de la API
		lat, lon, err := geo.GetCoordinates(fullSearch)
		if err != nil {
			log.Printf("❌ Error en API para %s: %v", id, err)
			time.Sleep(1 * time.Second)
			continue
		}

		// 5. Actualizar el mapa interno (se guardan como float64 automáticamente)
		firstAddr["latitude"] = lat
		firstAddr["longitude"] = lon
		
		newJSON, err := json.Marshal(profileData)
		if err != nil {
			log.Printf("❌ Error marshal final: %v", err)
			continue
		}

		// 6. Guardar en la base de datos
		_, updateErr := db.Conn.Exec(context.Background(),
			"UPDATE professional_entities SET profile_data = $1 WHERE id = $2",
			newJSON, id)

		if updateErr != nil {
			log.Printf("❌ Error DB al actualizar ID %s: %v", id, updateErr)
		} else {
			log.Printf("✅ Actualizado: %s [%f, %f]", city, lat, lon)
		}

		// Respetar Rate Limit (1.2 segundos entre peticiones)
		time.Sleep(1200 * time.Millisecond)
	}

	log.Println("🏁 Proceso de geocodificación finalizado.")
}