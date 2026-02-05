package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"veterimap-api/internal/auth"
	"veterimap-api/internal/domain"
	"veterimap-api/internal/pkg/responses"

	"github.com/google/uuid"
)

type AuthHandler struct {
	Service domain.AuthService
}

func NewAuthHandler(service domain.AuthService) *AuthHandler {
	return &AuthHandler{Service: service}
}

// Register: Crea un nuevo usuario manejando errores de duplicidad
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name         string      `json:"name"`
		Email        string      `json:"email"`
		Password     string      `json:"password"`
		Role         domain.Role `json:"role"`
		SelectedPlan string      `json:"selected_plan"` // Recibimos del front
		HasTrial     bool        `json:"has_trial"`
	}

	// 1. Decodificar el JSON del frontend
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.Error(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	// 2. Llamar al servicio de autenticación
	// Pasamos req.Name como primer argumento según la nueva firma del Service
	if err := h.Service.Register(r.Context(), req.Name, req.Email, req.Password, string(req.Role), req.SelectedPlan, req.HasTrial); err != nil {

		if err == domain.ErrUserAlreadyExists {
			responses.Error(w, http.StatusConflict, "El correo ya está registrado")
			return
		}

		if strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "unique constraint") {
			responses.Error(w, http.StatusConflict, "Este correo electrónico ya está en uso")
			return
		}

		responses.Error(w, http.StatusInternalServerError, "Error al procesar el registro")
		return
	}

	// 4. Respuesta exitosa
	responses.JSON(w, http.StatusCreated, map[string]string{
		"message": "Usuario registrado. Revisa el código de verificación.",
	})
}

// Login: Autentica y devuelve el token JWT
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.Error(w, http.StatusBadRequest, "Credenciales inválidas")
		return
	}

	token, err := h.Service.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		responses.Error(w, http.StatusUnauthorized, "Email o contraseña incorrectos")
		return
	}

	responses.JSON(w, http.StatusOK, map[string]string{
		"token": token,
	})
}

// MeHandler: Devuelve la identidad del usuario logueado
func (h *AuthHandler) MeHandler(w http.ResponseWriter, r *http.Request) {
	// Usamos la función unificada en internal/auth/auth.go
	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		responses.Error(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	uid, err := uuid.Parse(claims.UserID)
	if err != nil {
		responses.Error(w, http.StatusBadRequest, "Token corrupto")
		return
	}

	user, err := h.Service.GetUserByID(r.Context(), uid)
	if err != nil {
		responses.Error(w, http.StatusNotFound, "Usuario no encontrado")
		return
	}

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"user": user,
	})
}

// Verify: Valida el código de verificación
func (h *AuthHandler) Verify(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responses.Error(w, http.StatusBadRequest, "Datos de verificación incompletos")
		return
	}

	if err := h.Service.Verify(r.Context(), req.Email, req.Code); err != nil {
		responses.Error(w, http.StatusUnauthorized, "Código inválido")
		return
	}

	responses.JSON(w, http.StatusOK, map[string]string{
		"message": "Cuenta verificada con éxito",
	})
}

func (h *AuthHandler) SaveProfessionalProfile(w http.ResponseWriter, r *http.Request) {
	// 1. Validar identidad desde el Token JWT
	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		fmt.Println("⚠️ Intento de acceso sin claims de autenticación")
		responses.Error(w, http.StatusUnauthorized, "Token no válido")
		return
	}

	uid, err := uuid.Parse(claims.UserID)
	if err != nil {
		fmt.Printf("⚠️ Error parseando UUID del token: %v\n", err)
		responses.Error(w, http.StatusBadRequest, "ID de usuario corrupto")
		return
	}

	// 2. Decodificar el JSON del Frontend con escáner de tipos
	var req domain.ProfessionalEntity
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&req); err != nil {
		// Si el error es porque un dato no coincide (ej: texto en vez de número)
		if unmarshalErr, ok := err.(*json.UnmarshalTypeError); ok {
			fmt.Printf("❌ ERROR DE TIPO: En el campo '%s' se esperaba %s, pero el formulario envió el valor: '%s'\n",
				unmarshalErr.Field, unmarshalErr.Type, unmarshalErr.Value)
		} else {
			fmt.Printf("❌ ERROR DE SINTAXIS JSON: %v\n", err)
		}
		responses.Error(w, http.StatusBadRequest, "Datos inválidos: revisa que los números no lleven comillas")
		return
	}

	// 3. Validar consistencia antes de tocar la DB
	if req.Name == "" {
		fmt.Println("⚠️ Intento de guardar perfil con Nombre vacío")
		responses.Error(w, http.StatusBadRequest, "El nombre profesional es obligatorio")
		return
	}

	// Forzamos el UserID del token para evitar suplantaciones
	req.UserID = &uid

	// 4. Ejecución en Base de Datos con Log de error detallado
	if err := h.Service.UpsertProfessionalProfile(r.Context(), uid, &req); err != nil {
		// Esto captura errores de PostgreSQL (como el Status 'ACTIVE' que falla)
		fmt.Printf("❌ ERROR CRÍTICO DB UPSERT: %v\n", err)
		responses.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// NIVEL 3: Confirmación de éxito en terminal
	fmt.Printf("✅ Perfil profesional guardado/actualizado para User: %s\n", uid)

	responses.JSON(w, http.StatusOK, map[string]string{
		"message": "Perfil profesional actualizado con éxito",
	})
}

// GetProfessionalProfile: Carga el perfil para el modo "Editar"
func (h *AuthHandler) GetProfessionalProfile(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetClaims(r.Context())
	uid, _ := uuid.Parse(claims.UserID)

	// Necesitaremos este método en el service (lo crearemos a continuación)
	profile, err := h.Service.GetProfessionalProfileByUserID(r.Context(), uid)
	if err != nil {
		// Si no hay perfil, devolvemos 404 pero controlado, para que el front sepa que está vacío
		responses.Error(w, http.StatusNotFound, "Perfil profesional no iniciado")
		return
	}

	responses.JSON(w, http.StatusOK, profile)
}
