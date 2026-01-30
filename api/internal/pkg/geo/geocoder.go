package geo

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// GeocodingResult es la estructura que devuelve OpenStreetMap (Nominatim)
type GeocodingResult struct {
	Lat string `json:"lat"`
	Lon string `json:"lon"`
}

// GetCoordinates toma una dirección y devuelve (Latitud, Longitud, error)
func GetCoordinates(address string) (float64, float64, error) {
	// Nominatim requiere un User-Agent identificable y tiempos de espera prudentes
	client := &http.Client{Timeout: 10 * time.Second}

	// Escapamos la dirección para la URL
	safeAddress := url.QueryEscape(address)
	apiURL := fmt.Sprintf("https://nominatim.openstreetmap.org/search?format=json&q=%s&limit=1", safeAddress)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return 0, 0, fmt.Errorf("error creando petición: %v", err)
	}

	// Identificación obligatoria para evitar bloqueos
	req.Header.Set("User-Agent", "Veterimap-App-Production-v1")

	resp, err := client.Do(req)
	if err != nil {
		return 0, 0, fmt.Errorf("error de red: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, fmt.Errorf("API Nominatim devolvió estado: %d", resp.StatusCode)
	}

	var results []GeocodingResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return 0, 0, fmt.Errorf("error decodificando respuesta: %v", err)
	}

	if len(results) == 0 {
		return 0, 0, fmt.Errorf("dirección no encontrada en el mapa")
	}

	// Convertimos los strings a float64 con precisión de 64 bits
	lat, errLat := strconv.ParseFloat(results[0].Lat, 64)
	lon, errLon := strconv.ParseFloat(results[0].Lon, 64)

	if errLat != nil || errLon != nil {
		return 0, 0, fmt.Errorf("formato de coordenadas inválido recibido de la API")
	}

	return lat, lon, nil
}