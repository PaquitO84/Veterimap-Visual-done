package handlers

import (
	"encoding/json"
	"net/http"
	"veterimap-api/internal/auth"
	"veterimap-api/internal/domain"
	"veterimap-api/internal/pkg/responses"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type UserHandler struct {
	UserRepo    domain.UserRepository
	ProfileRepo domain.ProfileRepository
}

func NewUserHandler(userRepo domain.UserRepository, profileRepo domain.ProfileRepository) *UserHandler {
	return &UserHandler{
		UserRepo:    userRepo,
		ProfileRepo: profileRepo,
	}
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		responses.Error(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	userID, _ := uuid.Parse(claims.UserID)
	user, err := h.UserRepo.GetUserByID(r.Context(), userID)
	if err != nil {
		responses.Error(w, http.StatusNotFound, "Usuario no encontrado")
		return
	}

	response := map[string]interface{}{"user": user}
	if user.Role == domain.RoleProfessional {
		prof, err := h.ProfileRepo.GetProfileDetail(r.Context(), userID.String())
		if err == nil {
			response["professional_entity"] = prof
		}
	}

	responses.JSON(w, http.StatusOK, response)
}

func (h *UserHandler) AddPet(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		responses.Error(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	userID, _ := uuid.Parse(claims.UserID)
	var pet domain.Pet
	if err := json.NewDecoder(r.Body).Decode(&pet); err != nil {
		responses.Error(w, http.StatusBadRequest, "Datos de mascota inválidos")
		return
	}

	pet.OwnerID = userID
	if err := h.UserRepo.AddPet(r.Context(), &pet); err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al guardar la mascota")
		return
	}

	responses.JSON(w, http.StatusCreated, pet)
}

func (h *UserHandler) GetMyPets(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		responses.Error(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	userID, _ := uuid.Parse(claims.UserID)
	pets, err := h.UserRepo.GetMyPets(r.Context(), userID)
	if err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al obtener mascotas")
		return
	}

	responses.JSON(w, http.StatusOK, pets)
}

func (h *UserHandler) CreateAppointment(w http.ResponseWriter, r *http.Request) {
	var app domain.Appointment
	if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
		responses.Error(w, http.StatusBadRequest, "Datos de cita inválidos")
		return
	}

	if err := h.UserRepo.CreateAppointment(r.Context(), &app); err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al crear la cita")
		return
	}

	responses.JSON(w, http.StatusCreated, app)
}
func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name       string                 `json:"name"`
		Phone      string                 `json:"phone"`
		City       string                 `json:"city"`
		Address    string                 `json:"address"`
		PostalCode string                 `json:"postal_code"`
		Contact    map[string]interface{} `json:"contact_info"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responses.Error(w, http.StatusBadRequest, "Datos de perfil inválidos")
		return
	}

	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		responses.Error(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	// Convertimos el claims.UserID (string) a uuid.UUID para las consultas
	userUUID, err := uuid.Parse(claims.UserID)
	if err != nil {
		responses.Error(w, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	// --- SOLUCIÓN PUNTO 4: Blindaje de Email ---
	if input.Contact == nil {
		input.Contact = make(map[string]interface{})
	}

	if email, ok := input.Contact["email"].(string); !ok || email == "" {
		// Ahora pasamos userUUID que es el tipo correcto
		dbUser, err := h.UserRepo.GetUserByID(r.Context(), userUUID)
		if err == nil {
			input.Contact["email"] = dbUser.Email
		}
	}
	// ------------------------------------------

	// Ejecutamos el Upsert pasando claims.UserID (que es string)
	err = h.UserRepo.UpsertOwnerProfile(
		r.Context(),
		claims.UserID,
		input.Name,
		input.Phone,
		input.City,
		input.Address,
		input.PostalCode,
		input.Contact,
	)

	if err != nil {
		responses.Error(w, http.StatusInternalServerError, "No se pudo actualizar el perfil")
		return
	}

	responses.JSON(w, http.StatusOK, map[string]string{"message": "Perfil actualizado correctamente"})
}

func (h *UserHandler) GetMyAppointments(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		responses.Error(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	appointments, err := h.UserRepo.GetAppointmentsByUserID(r.Context(), claims.UserID)
	if err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al obtener citas")
		return
	}

	responses.JSON(w, http.StatusOK, appointments)
}

func (h *UserHandler) GetPetByID(w http.ResponseWriter, r *http.Request) {
	petIDStr := chi.URLParam(r, "petID")
	petID, err := uuid.Parse(petIDStr)
	if err != nil {
		responses.Error(w, http.StatusBadRequest, "ID de mascota inválido")
		return
	}

	pet, err := h.UserRepo.GetPetByID(r.Context(), petID)
	if err != nil {
		responses.Error(w, http.StatusNotFound, "Mascota no encontrada")
		return
	}

	responses.JSON(w, http.StatusOK, pet)
}

func (h *UserHandler) GetMedicalHistory(w http.ResponseWriter, r *http.Request) {
	petIDStr := chi.URLParam(r, "petID")
	petID, err := uuid.Parse(petIDStr)
	if err != nil {
		responses.Error(w, http.StatusBadRequest, "ID de mascota inválido")
		return
	}

	history, err := h.UserRepo.GetMedicalHistoryByPetID(r.Context(), petID)
	if err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al obtener historial")
		return
	}

	responses.JSON(w, http.StatusOK, history)
}

func (h *UserHandler) AddMedicalHistory(w http.ResponseWriter, r *http.Request) {
	var entry domain.MedicalHistory
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		responses.Error(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	if err := h.UserRepo.AddMedicalHistory(r.Context(), &entry); err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al guardar historial")
		return
	}

	responses.JSON(w, http.StatusCreated, entry)
}
