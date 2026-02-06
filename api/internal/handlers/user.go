package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
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

	response := map[string]interface{}{
		"user":                user,
		"access_level":        user.GetAccessLevel(),   // Elevamos el nivel a la raíz
		"subscription_status": user.SubscriptionStatus, // Elevamos el status a la raíz
		"trial_ends_at":       user.TrialEndsAt,        // Elevamos la fecha a la raíz
	}

	if user.Role == domain.RoleProfessional {
		prof, err := h.ProfileRepo.GetProfileDetail(r.Context(), userID.String())
		if err == nil {
			// Mantenemos la clave exacta que ya usas: "professional_entity"
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
	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		responses.Error(w, http.StatusUnauthorized, "No autorizado")
		return
	}
	ownerID, _ := uuid.Parse(claims.UserID)

	var app domain.Appointment
	if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
		responses.Error(w, http.StatusBadRequest, "Datos de cita inválidos")
		return
	}

	// --- BLINDAJE DE SEGURIDAD PARA EL PLAN DEL PROFESIONAL ---
	profEntity, err := h.ProfileRepo.GetProfileDetail(r.Context(), app.ProfessionalID.String())
	if err == nil && profEntity.UserID != nil {
		profUser, errUser := h.UserRepo.GetUserByID(r.Context(), *profEntity.UserID)
		if errUser == nil && !profUser.HasPremiumAccess() {
			responses.Error(w, http.StatusPaymentRequired, "El profesional no tiene un plan activo para recibir citas online")
			return
		}
	}

	// Aseguramos que ProfessionalID sea el de la Entidad
	prof, err := h.ProfileRepo.GetProfessionalProfileByUserID(r.Context(), app.ProfessionalID)
	if err == nil {
		app.ProfessionalID = prof.ID
	}

	app.ID = uuid.New()
	app.OwnerID = ownerID
	app.Status = "PENDING"

	if err := h.UserRepo.CreateAppointment(r.Context(), &app); err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al guardar la cita en DB")
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

	userUUID, err := uuid.Parse(claims.UserID)
	if err != nil {
		responses.Error(w, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	if input.Contact == nil {
		input.Contact = make(map[string]interface{})
	}

	if email, ok := input.Contact["email"].(string); !ok || email == "" {
		dbUser, err := h.UserRepo.GetUserByID(r.Context(), userUUID)
		if err == nil {
			input.Contact["email"] = dbUser.Email
		}
	}

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

	userID, _ := uuid.Parse(claims.UserID)
	var appointments []domain.Appointment
	var err error

	if claims.Role == string(domain.RoleProfessional) {
		prof, errProf := h.ProfileRepo.GetProfessionalProfileByUserID(r.Context(), userID)
		if errProf != nil {
			responses.Error(w, http.StatusInternalServerError, "No se encontró perfil profesional")
			return
		}
		appointments, err = h.UserRepo.GetAppointmentsByProfessionalID(r.Context(), prof.ID)
	} else {
		appointments, err = h.UserRepo.GetAppointmentsByUserID(r.Context(), claims.UserID)
	}

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
	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		responses.Error(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	userID, _ := uuid.Parse(claims.UserID)
	me, err := h.UserRepo.GetUserByID(r.Context(), userID)
	if err != nil || !me.HasPremiumAccess() {
		responses.Error(w, http.StatusPaymentRequired, "Se requiere Plan PRO activo para registrar historiales")
		return
	}

	var input domain.MedicalHistory
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responses.Error(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	// CORRECCIÓN: Usamos = en lugar de := porque err ya existe arriba
	err = h.UserRepo.AddMedicalHistory(r.Context(), &input)
	if err != nil {
		log.Printf("❌ ERROR REAL EN BD: %v", err)
		responses.Error(w, http.StatusInternalServerError, "Error al guardar historial")
		return
	}

	responses.JSON(w, http.StatusCreated, input)
}

func (h *UserHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	var input struct {
		AppointmentID uuid.UUID `json:"appointment_id"`
		Status        string    `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responses.Error(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	if err := h.UserRepo.UpdateAppointmentStatus(r.Context(), input.AppointmentID, input.Status); err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al actualizar estado")
		return
	}
	responses.JSON(w, http.StatusOK, map[string]string{"message": "Estado actualizado"})
}

func (h *UserHandler) Reschedule(w http.ResponseWriter, r *http.Request) {
	var input struct {
		AppointmentID uuid.UUID `json:"appointment_id"`
		NewDate       string    `json:"new_date"`
		Notes         string    `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		responses.Error(w, http.StatusBadRequest, "Error en formato de datos")
		return
	}

	parsedDate, err := time.Parse(time.RFC3339, input.NewDate)
	if err != nil {
		responses.Error(w, http.StatusBadRequest, "Formato de fecha inválido")
		return
	}

	if err := h.UserRepo.RescheduleAppointment(r.Context(), input.AppointmentID, parsedDate, input.Notes); err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al guardar en base de datos")
		return
	}

	responses.JSON(w, http.StatusOK, map[string]string{"message": "Reagendación exitosa"})
}

func (h *UserHandler) GetMyClients(w http.ResponseWriter, r *http.Request) {
	claims, _ := auth.GetClaims(r.Context())
	userID, _ := uuid.Parse(claims.UserID)

	prof, err := h.ProfileRepo.GetProfessionalProfileByUserID(r.Context(), userID)
	if err != nil {
		responses.Error(w, http.StatusNotFound, "Perfil profesional no encontrado")
		return
	}

	clients, err := h.UserRepo.GetClientsByProfessionalID(r.Context(), prof.ID)
	if err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al obtener clientes")
		return
	}

	responses.JSON(w, http.StatusOK, clients)
}

func (h *UserHandler) GetPetsByOwner(w http.ResponseWriter, r *http.Request) {
	ownerIDStr := chi.URLParam(r, "ownerID")
	ownerID, err := uuid.Parse(ownerIDStr)
	if err != nil {
		responses.Error(w, http.StatusBadRequest, "ID de dueño inválido")
		return
	}

	// CORRECCIÓN: Declaramos pets y usamos = para err porque ya existe arriba
	var pets []domain.Pet
	pets, err = h.UserRepo.GetPetsByOwnerID(r.Context(), ownerID)
	if err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al obtener mascotas")
		return
	}

	responses.JSON(w, http.StatusOK, pets)
}
