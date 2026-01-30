package handlers

import (
	"log"
	"net/http"
	"strconv"
	"veterimap-api/internal/domain"
	"veterimap-api/internal/pkg/responses"
)

// ProfileHandler gestiona la búsqueda pública y el mapa
type ProfileHandler struct {
	Repo domain.ProfileRepository // Usamos la interfaz del dominio
}

func NewProfileHandler(repo domain.ProfileRepository) *ProfileHandler {
	return &ProfileHandler{Repo: repo}
}

// List: Lista paginada para el Marketplace
func (h *ProfileHandler) List(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	city := r.URL.Query().Get("city")
	tag := r.URL.Query().Get("tag")

	limit := 10
	page := 1
	if p, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil && p > 0 {
		page = p
	}
	offset := (page - 1) * limit

	total, profiles, err := h.Repo.SearchProfiles(r.Context(), name, city, tag, limit, offset)
	if err != nil {
		responses.Error(w, http.StatusInternalServerError, "Error al buscar: "+err.Error())
		return
	}

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"total":    total,
		"page":     page,
		"limit":    limit,
		"profiles": profiles,
	})
}

// SearchMap: Procesa la búsqueda para los pines del mapa (Público)
func (h *ProfileHandler) SearchMap(w http.ResponseWriter, r *http.Request) {
	city := r.URL.Query().Get("city")
	entityType := r.URL.Query().Get("type")
	specialty := r.URL.Query().Get("specialty")

	// TRADUCCIÓN DE NOMENCLATURA (Frontend -> DB)
	switch entityType {
	case "fichas_clinicas":
		entityType = "CLINIC"
	case "fichas_hospitales":
		entityType = "HOSPITAL"
	case "fichas_veterinarios":
		entityType = "HOME_VET"
	}

	tagABuscar := entityType
	if entityType == "INDIVIDUAL" && specialty != "" {
		tagABuscar = specialty
	}

	_, results, err := h.Repo.SearchProfiles(r.Context(), "", city, tagABuscar, 1000, 0)
	if err != nil {
		log.Printf("ERROR EN MAPA: %v", err)
		responses.Error(w, http.StatusInternalServerError, "Error en la búsqueda del mapa")
		return
	}

	if results == nil {
		results = []domain.ProfileSummary{}
	}

	responses.JSON(w, http.StatusOK, map[string]interface{}{
		"results": results,
	})
}

// GetDetail: Ficha completa de una veterinaria
func (h *ProfileHandler) GetDetail(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		responses.Error(w, http.StatusBadRequest, "ID requerido")
		return
	}

	detail, err := h.Repo.GetProfileDetail(r.Context(), id)
	if err != nil {
		responses.Error(w, http.StatusNotFound, "Perfil no encontrado")
		return
	}

	responses.JSON(w, http.StatusOK, detail)
}