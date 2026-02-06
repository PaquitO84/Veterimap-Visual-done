package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type ProfessionalEntity struct {
	ID          uuid.UUID   `json:"id"`
	UserID      *uuid.UUID  `json:"user_id"`
	EntityType  string      `json:"entity_type"`
	Status      string      `json:"status"`
	Name        string      `json:"name"`
	Slug        *string     `json:"slug"`
	ProfileData ProfileData `json:"profile_data"` // Mapea al JSONB
	Rating      float64     `json:"rating"`
	ReviewCount int         `json:"review_count"`
	IsActive    bool        `json:"is_active"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type ProfileData struct {
	LicenseNumber  string                `json:"license_number"`
	Bio            string                `json:"bio"`
	LogoURL        string                `json:"logo_url"`
	Addresses      []AddressData         `json:"addresses"`
	Contact        ContactInfo           `json:"contact"`
	Specialization SpecializationData    `json:"specialization,omitempty"`
	Specialties    []string              `json:"specialties"`
	WorkingHours   map[string]WorkingDay `json:"working_hours"`
	Pricing        PricingModel          `json:"pricing"`
	Insurance      InsuranceData         `json:"insurance_partners"`
}

type AddressData struct {
	FullAddress string  `json:"full_address"`
	City        string  `json:"city"`
	PostalCode  string  `json:"postal_code"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	IsMain      bool    `json:"is_main"`
}

type ContactInfo struct {
	Phone string `json:"phone"`
	Email string `json:"email"`
}

type SpecializationData struct {
	Specialties      []string      `json:"specialties"`
	Experience       string        `json:"experience"`
	DetailedServices []ServiceData `json:"detailed_services"`
}

type WorkingDay struct {
	Active bool   `json:"active"`
	Start  string `json:"start"`
	End    string `json:"end"`
}

type PricingModel struct {
	Tarifas []ServiceData `json:"tarifas"`
}

type ServiceData struct {
	Name  string `json:"name"`
	Price string `json:"price"`
}

type InsuranceData struct {
	Accepts   bool   `json:"accepts"`
	Companies string `json:"companies"`
}

// ProfileSummary es el objeto ligero que viaja al mapa
type ProfileSummary struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	ProfileType string  `json:"entity_type"`
	Rating      float64 `json:"rating"`
	ReviewCount int     `json:"review_count"`
	City        string  `json:"city"`
	FullAddress string  `json:"full_address"`
	Latitude    float64 `json:"lat"`
	Longitude   float64 `json:"lng"`
}

type ProfileDetail struct {
	ProfessionalEntity
	SubscriptionStatus string     `json:"subscription_status"`
	TrialEndsAt        *time.Time `json:"trial_ends_at"`
	AccessLevel        int        `json:"access_level"`
}

type ProfileRepository interface {
	SearchProfiles(ctx context.Context, name, city, tag string, limit, offset int) (int, []ProfileSummary, error)
	GetProfileDetail(ctx context.Context, id string) (*ProfileDetail, error)
	UpsertProfessionalProfile(ctx context.Context, p *ProfessionalEntity) error
	GetProfessionalProfileByUserID(ctx context.Context, userID uuid.UUID) (*ProfessionalEntity, error)
}
