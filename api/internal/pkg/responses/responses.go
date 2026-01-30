package responses

import (
	"encoding/json"
	"net/http"
)

// JSON responde con el objeto tal cual, permitiendo que los handlers 
// definan su propia estructura (ej: "results", "user", etc.)
func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	// Enviamos 'data' directamente para evitar el doble anidamiento
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Error al codificar respuesta", http.StatusInternalServerError)
	}
}

// Error responde con un formato estándar de error para que el Frontend 
// siempre sepa dónde buscar el mensaje: response.error
func Error(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}