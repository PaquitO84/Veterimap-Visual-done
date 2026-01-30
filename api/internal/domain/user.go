package domain

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrUserAlreadyExists  = errors.New("el usuario ya existe")
	ErrInvalidCredentials = errors.New("credenciales inválidas")
)

type Role string

const (
	RolePetOwner     Role = "PET_OWNER"
	RoleProfessional Role = "PROFESSIONAL"
	RoleAdmin        Role = "ADMIN"
)

type User struct {
    ID                 uuid.UUID `json:"id"`
    Email              string    `json:"email"`
    Password           string    `json:"-"`
    Role               Role      `json:"role"`
    IsVerified         bool      `json:"is_verified"`
    VerificationCode   string    `json:"verification_code"`
    SubscriptionStatus string    `json:"subscription_status"`
    CreatedAt          time.Time `json:"created_at"`
    UpdatedAt          time.Time `json:"updated_at"`
    
    // Usamos punteros (*) porque estos campos pueden ser NULL en la BD al registrarse
    Name               *string   `json:"name"`
    Phone              *string   `json:"phone"`
    City               *string   `json:"city"`
    Address            *string   `json:"address"`
    PostalCode         *string   `json:"postal_code"`
}

type OwnerAccount struct {
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	City      string    `json:"city"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type Pet struct {
	ID             uuid.UUID   `json:"id"`
	OwnerID        uuid.UUID   `json:"owner_id"`
	Name           string      `json:"name"`
	Species        string      `json:"species"`
	Breed          string      `json:"breed"`
	BirthDate      *time.Time  `json:"birth_date"`
	Gender         string      `json:"gender"`
	Weight         float64     `json:"weight"`
	HealthMetadata interface{} `json:"health_metadata"`
	CreatedAt      time.Time   `json:"created_at"`
}

type Appointment struct {
	ID              uuid.UUID `json:"id"`
	ProfessionalID  uuid.UUID `json:"professional_id"`
	OwnerID         uuid.UUID `json:"owner_id"`
	PetID           uuid.UUID `json:"pet_id"`
	AppointmentDate time.Time `json:"appointment_date"`
	Status          string    `json:"status"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"created_at"`

	// Campos auxiliares (para que el frontend vea nombres y no solo IDs)
	// Se llenan mediante un JOIN en el SQL
	PetName          string `json:"pet_name,omitempty"`
    OwnerName        string `json:"owner_name,omitempty"`
    ProfessionalName string `json:"professional_name,omitempty"`
}

type MedicalHistory struct {
	ID             uuid.UUID `json:"id"`
	PetID          uuid.UUID `json:"pet_id"`
	ProfessionalID uuid.UUID `json:"professional_id"`
	AppointmentID  uuid.UUID `json:"appointment_id"`
	Diagnosis      string    `json:"diagnosis"`
	Treatment      string    `json:"treatment"`
	InternalNotes  string    `json:"internal_notes"`
	CreatedAt      time.Time `json:"created_at"`
}

// UserRepository define lo que la base de datos DEBE ofrecer
type UserRepository interface {
	// Autenticación
	CreateUser(ctx context.Context, u *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	VerifyUser(ctx context.Context, email string) error

	// Perfil de Dueño (Método unificado que reemplaza a UpsertOwnerAccount)
	UpsertOwnerProfile(ctx context.Context, userID string, name, phone, city, address, cp string, contact interface{}) error

	// Mascotas
	AddPet(ctx context.Context, pet *Pet) error
	GetMyPets(ctx context.Context, ownerID uuid.UUID) ([]Pet, error)
	GetPetByID(ctx context.Context, petID uuid.UUID) (*Pet, error)
	GetMedicalHistoryByPetID(ctx context.Context, petID uuid.UUID) ([]MedicalHistory, error)

	// Citas y Salud
	CreateAppointment(ctx context.Context, app *Appointment) error
	GetAppointmentsByUserID(ctx context.Context, userID string) ([]Appointment, error)
	AddMedicalHistory(ctx context.Context, entry *MedicalHistory) error
	IsSubscriptionActive(ctx context.Context, userID uuid.UUID) (bool, error)

	// Profesonales
	UpsertProfessionalProfile(ctx context.Context, p *ProfessionalEntity) error
	GetProfessionalProfileByUserID(ctx context.Context, userID uuid.UUID) (*ProfessionalEntity, error)

	GetAppointmentsByProfessionalID(ctx context.Context, profID uuid.UUID) ([]Appointment, error)
    UpdateAppointmentStatus(ctx context.Context, appID uuid.UUID, status string) error // Aprovechamos para añadir esta
    RescheduleAppointment(ctx context.Context, appID uuid.UUID, newDate time.Time) error // Y esta

	// NOTA: Si borraste UpsertOwnerAccount e IsSubscriptionActive del repositorio,
	// NO pueden estar aquí. Si los necesitas en el futuro, habrá que implementarlos en el repo.
	GetClientsByProfessionalID(ctx context.Context, profID uuid.UUID) ([]User, error)
    
}

type AuthService interface {
	Register(ctx context.Context, name, email, password, role string) error
	Login(ctx context.Context, email, password string) (string, error)
	Verify(ctx context.Context, email, code string) error
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	UpsertProfessionalProfile(ctx context.Context, userID uuid.UUID, p *ProfessionalEntity) error
	GetProfessionalProfileByUserID(ctx context.Context, userID uuid.UUID) (*ProfessionalEntity, error)
	
}
