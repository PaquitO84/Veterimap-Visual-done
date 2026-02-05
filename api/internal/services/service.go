package services

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"time"
	"math/big"
	"strings"
	"veterimap-api/internal/auth"
	"veterimap-api/internal/domain"

	"github.com/google/uuid"
)

type authService struct {
	repo domain.UserRepository
}

func NewAuthService(repo domain.UserRepository) domain.AuthService {
	return &authService{repo: repo}
}

func (s *authService) Register(ctx context.Context, name, email, password, role, plan string, hasTrial bool) error {
    cleanEmail := strings.ToLower(strings.TrimSpace(email))
    cleanName := strings.TrimSpace(name)

    hashedPassword, err := auth.HashPassword(password)
    if err != nil {
        return err
    }

    // 1. Lógica de Suscripción (Sin cambios)
    var subscriptionStatus = "free"
    var trialEndsAt *time.Time

    if role == string(domain.RoleProfessional) {
        subscriptionStatus = plan 
        if subscriptionStatus == "" {
            subscriptionStatus = "essential"
        }
        if hasTrial {
            expiration := time.Now().AddDate(0, 0, 60)
            trialEndsAt = &expiration
        }
    }

    // 2. Generación del código (Sin cambios)
    min := big.NewInt(100000)
    max := big.NewInt(900000)
    n, _ := rand.Int(rand.Reader, max)
    verificationCode := fmt.Sprintf("%06d", new(big.Int).Add(n, min))

    u := &domain.User{
        ID:                 uuid.New(),
        Name:               &cleanName,
        Email:              cleanEmail,
        Password:           hashedPassword,
        Role:               domain.Role(role),
        VerificationCode:   verificationCode,
        IsVerified:         false,
        SubscriptionStatus: subscriptionStatus,
        TrialEndsAt:        trialEndsAt,
    }

    // 3. LLAMADA AL REPOSITORIO (CORREGIDO)
    // Primero guardamos el error en una variable, NO hacemos return directo aquí
    if err := s.repo.CreateUser(ctx, u); err != nil {
        return err
    }

    // 4. LOG PARA TERMINAL (Ahora sí se ejecutará)
    log.Printf("\n==========================================\n")
    log.Printf("📧 CÓDIGO DE VERIFICACIÓN PARA %s: %s", cleanEmail, verificationCode)
    log.Printf("💎 PLAN: %s | TRIAL: %v", subscriptionStatus, hasTrial)
    log.Printf("\n==========================================\n")

    return nil // Finalización exitosa
}

func (s *authService) Login(ctx context.Context, email, password string) (string, error) {
	u, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return "", domain.ErrInvalidCredentials
	}

	if !auth.CheckPasswordHash(password, u.Password) {
		return "", domain.ErrInvalidCredentials
	}

	return auth.GenerateJWT(u.ID.String(), string(u.Role))
}

func (s *authService) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return s.repo.GetUserByID(ctx, id)
}

func (s *authService) Verify(ctx context.Context, email, code string) error {
	u, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		log.Printf("❌ ERROR: No se encontró el email [%s]", email)
		return err
	}

	// ESTO NOS DIRÁ LA VERDAD
	log.Printf("🔍 DEBUG: DB_CODE: '%s' | FRONT_CODE: '%s' | EMAIL: '%s'", u.VerificationCode, code, email)

	if u.VerificationCode != code {
		return fmt.Errorf("código incorrecto")
	}
	return s.repo.VerifyUser(ctx, email)
}

// internal/services/service.go

func (s *authService) UpsertProfessionalProfile(ctx context.Context, userID uuid.UUID, p *domain.ProfessionalEntity) error {
	p.UserID = &userID

	// Corregimos: "ACTIVE" no existe en tu DB. Usamos "VERIFIED" o "CLAIMED"
	if p.Status == "" || p.Status == "ACTIVE" {
		p.Status = "VERIFIED"
	}

	p.IsActive = true

	// Generar Slug basado en el nombre de forma segura para el puntero
	if p.Name != "" {
		generatedSlug := strings.ToLower(strings.ReplaceAll(p.Name, " ", "-"))
		p.Slug = &generatedSlug
	}

	// Asegúrate de que esta línea tenga exactamente estos paréntesis:
	return s.repo.UpsertProfessionalProfile(ctx, p)
}

func (s *authService) GetProfessionalProfileByUserID(ctx context.Context, userID uuid.UUID) (*domain.ProfessionalEntity, error) {
	// Este método debe ir al repositorio de perfiles
	return s.repo.GetProfessionalProfileByUserID(ctx, userID)
}
