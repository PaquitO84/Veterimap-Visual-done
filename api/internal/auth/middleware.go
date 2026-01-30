package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"veterimap-api/internal/domain"

	"github.com/google/uuid"
)

// NOTA: GetClaims y ClaimsContextKey ya están definidos en auth.go.
// No los duplicamos aquí para evitar inconsistencias.

// JWTMiddleware valida el token y permite el paso a rutas privadas
func JWTMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Se requiere token de autenticación", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, "Formato de token inválido", http.StatusUnauthorized)
				return
			}

			// Utilizamos ValidateJWT definido en auth.go
			claims, err := ValidateJWT(parts[1])
			if err != nil {
				http.Error(w, "Token inválido o expirado", http.StatusUnauthorized)
				return
			}

			// Inyectamos los claims usando la llave unificada ClaimsContextKey de auth.go
			ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// CORS configura las cabeceras para permitir peticiones desde el Frontend (ej: localhost:5173)
func CORS() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// En desarrollo permitimos todo, en producción deberías poner tu dominio
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// CheckSubscription bloquea el acceso si el profesional no tiene suscripción activa
func CheckSubscription(repo domain.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Usamos el GetClaims unificado
			claims, ok := GetClaims(r.Context())
			if !ok {
				http.Error(w, "No autorizado", http.StatusUnauthorized)
				return
			}

			// Solo aplicamos la restricción a profesionales
			if claims.Role == string(domain.RoleProfessional) {
				userID, err := uuid.Parse(claims.UserID)
				if err != nil {
					http.Error(w, "ID de usuario inválido", http.StatusBadRequest)
					return
				}

				active, err := repo.IsSubscriptionActive(r.Context(), userID)
				if err != nil || !active {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusPaymentRequired)
					json.NewEncoder(w).Encode(map[string]string{
						"error":       "Tu periodo de prueba ha expirado. Por favor, suscríbete.",
						"payment_url": "https://veterimap.com/subscribe",
					})
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
