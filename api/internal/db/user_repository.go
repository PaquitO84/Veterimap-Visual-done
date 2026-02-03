package db

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
	"veterimap-api/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresUserRepository struct {
	Conn *pgxpool.Pool
}

func NewPostgresUserRepository(db *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{Conn: db}
}

// --- GESTIÓN DE USUARIOS Y AUTENTICACIÓN ---

func (r *PostgresUserRepository) CreateUser(ctx context.Context, u *domain.User) error {
	// Dejamos que la BD use gen_random_uuid() si u.ID está vacío,
	// pero lo enviamos si el Service ya lo generó.

	query := `
		INSERT INTO users (
			id, 
			name, 
			email, 
			password, 
			role, 
			is_verified, 
			verification_code, 
			subscription_status
		) 
		VALUES (
			COALESCE(NULLIF($1, '00000000-0000-0000-0000-000000000000'::uuid), gen_random_uuid()), 
			$2, $3, $4, $5, $6, $7, $8
		) 
		RETURNING id, created_at`

	// Ejecutamos y capturamos el ID real (sea el nuestro o el de la BD) y la fecha
	err := r.Conn.QueryRow(ctx, query,
		u.ID,
		u.Name,
		u.Email,
		u.Password,
		string(u.Role),
		u.IsVerified,
		u.VerificationCode,
		"trialing", // Coincidimos con el 'trialing'::text de tu DDL
	).Scan(&u.ID, &u.CreatedAt)

	if err != nil {
		// Esto imprimirá el error real en tu terminal si vuelve a fallar
		fmt.Printf("❌ Error en CreateUser: %v\n", err)
		return err
	}

	return nil
}

func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	// Definimos el orden de las columnas explícitamente (12 columnas)
	query := `
        SELECT 
            id, email, password, role, is_verified, verification_code, 
            subscription_status, name, phone, city, address, postal_code 
        FROM users 
        WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`

	var u domain.User
	err := r.Conn.QueryRow(ctx, query, email).Scan(
		&u.ID,                 // 1
		&u.Email,              // 2
		&u.Password,           // 3
		&u.Role,               // 4
		&u.IsVerified,         // 5
		&u.VerificationCode,   // 6
		&u.SubscriptionStatus, // 7
		&u.Name,               // 8 (ahora acepta NULL)
		&u.Phone,              // 9 (ahora acepta NULL)
		&u.City,               // 10 (ahora acepta NULL)
		&u.Address,            // 11 (ahora acepta NULL)
		&u.PostalCode,         // 12 (ahora acepta NULL)
	)

	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PostgresUserRepository) VerifyUser(ctx context.Context, email string) error {
	// Importante: No pongas el código a NULL todavía, solo cambia is_verified
	query := `UPDATE users SET is_verified = true WHERE email = $1`
	result, err := r.Conn.Exec(ctx, query, email)
	if err != nil {
		return err
	}

	// Si no se actualizó ninguna fila, algo va mal con el email
	if result.RowsAffected() == 0 {
		return fmt.Errorf("no se encontró el usuario para verificar")
	}
	return nil
}

func (r *PostgresUserRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	// Añadimos name, phone, city, address, postal_code
	query := `SELECT id, email, role, is_verified, subscription_status, name, phone, city, address, postal_code 
              FROM users WHERE id = $1`

	var u domain.User
	err := r.Conn.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.Role, &u.IsVerified, &u.SubscriptionStatus,
		&u.Name, &u.Phone, &u.City, &u.Address, &u.PostalCode,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// --- GESTIÓN DE DUEÑOS Y MASCOTAS ---

func (r *PostgresUserRepository) UpsertOwnerProfile(ctx context.Context, userID string, name, phone, city, address, cp string, contact interface{}) error {
	contactJSON, err := json.Marshal(contact)
	if err != nil {
		return err // Evitamos guardar basura si el JSON falla
	}

	query := `
        UPDATE users 
        SET name = $2, phone = $3, city = $4, address = $5, postal_code = $6, contact_info = $7, updated_at = NOW()
        WHERE id = $1`

	_, err = r.Conn.Exec(ctx, query, userID, name, phone, city, address, cp, contactJSON)
	return err
}

func (r *PostgresUserRepository) AddPet(ctx context.Context, pet *domain.Pet) error {
	// Si el ID es nulo o cero (Date.now() fallido), generamos uno real
	if pet.ID == uuid.Nil {
		pet.ID = uuid.New()
	}

	query := `
        INSERT INTO pets (id, owner_id, name, species, breed, birth_date, gender, weight, health_metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            species = EXCLUDED.species,
            breed = EXCLUDED.breed,
            birth_date = EXCLUDED.birth_date,
            gender = EXCLUDED.gender,
            weight = EXCLUDED.weight,
            health_metadata = EXCLUDED.health_metadata;`

	_, err := r.Conn.Exec(ctx, query,
		pet.ID, pet.OwnerID, pet.Name, pet.Species, pet.Breed, pet.BirthDate, pet.Gender, pet.Weight, pet.HealthMetadata)
	return err
}

func (r *PostgresUserRepository) GetMyPets(ctx context.Context, ownerID uuid.UUID) ([]domain.Pet, error) {
	// El orden de las columnas según tu DBeaver
	query := `
        SELECT 
            id, owner_id, name, species, breed, 
            birth_date, health_metadata, created_at, gender, weight 
        FROM pets 
        WHERE owner_id = $1`

	rows, err := r.Conn.Query(ctx, query, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pets []domain.Pet
	for rows.Next() {
		var p domain.Pet
		// El Scan debe seguir exactamente el mismo orden que el SELECT anterior
		err := rows.Scan(
			&p.ID,             // 1. id
			&p.OwnerID,        // 2. owner_id
			&p.Name,           // 3. name
			&p.Species,        // 4. species
			&p.Breed,          // 5. breed
			&p.BirthDate,      // 6. birth_date
			&p.HealthMetadata, // 7. health_metadata
			&p.CreatedAt,      // 8. created_at
			&p.Gender,         // 9. gender
			&p.Weight,         // 10. weight
		)
		if err != nil {
			// Si una fila falla, se registra el error y se continúa con la siguiente
			continue
		}
		pets = append(pets, p)
	}
	return pets, nil
}

// --- GESTIÓN CLÍNICA ---
func (r *PostgresUserRepository) CreateAppointment(ctx context.Context, app *domain.Appointment) error {
	query := `
        INSERT INTO appointments (id, professional_id, owner_id, pet_id, appointment_date, status, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `
	// CAMBIO: r.db -> r.Conn
	_, err := r.Conn.Exec(ctx, query,
		app.ID,
		app.ProfessionalID,
		app.OwnerID,
		app.PetID,
		app.AppointmentDate,
		app.Status,
		app.Notes,
	)
	return err
}

// Asegúrate que este nombre coincida con lo que llama el handler en GetMyAppointments
func (r *PostgresUserRepository) GetAppointmentsByUserID(ctx context.Context, userID string) ([]domain.Appointment, error) {
	query := `
        SELECT 
            a.id, a.professional_id, a.owner_id, a.pet_id, 
            a.appointment_date, a.status, a.notes, a.created_at,
            p.name as pet_name, 
            pe.name as professional_name
        FROM appointments a
        INNER JOIN pets p ON a.pet_id = p.id
        INNER JOIN professional_entities pe ON a.professional_id = pe.id
        WHERE a.owner_id = $1
        ORDER BY a.appointment_date ASC`

	rows, err := r.Conn.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var appointments []domain.Appointment
	for rows.Next() {
		var a domain.Appointment
		err := rows.Scan(
			&a.ID, &a.ProfessionalID, &a.OwnerID, &a.PetID,
			&a.AppointmentDate, &a.Status, &a.Notes, &a.CreatedAt,
			&a.PetName, &a.ProfessionalName,
		)
		if err != nil {
			return nil, err
		}
		appointments = append(appointments, a)
	}
	return appointments, nil
}

func (r *PostgresUserRepository) AddMedicalHistory(ctx context.Context, h *domain.MedicalHistory) error {
    // Usamos NULLIF para que si el ID de la cita es el valor por defecto (ceros), 
    // se guarde como NULL en la base de datos y no rompa la restricción.
    query := `
        INSERT INTO medical_histories (pet_id, professional_id, appointment_id, diagnosis, treatment, internal_notes) 
        VALUES ($1, $2, NULLIF($3, '00000000-0000-0000-0000-000000000000'::uuid), $4, $5, $6) 
        RETURNING id, created_at`
        
    return r.Conn.QueryRow(ctx, query, 
        h.PetID, 
        h.ProfessionalID, 
        h.AppointmentID, 
        h.Diagnosis, 
        h.Treatment, 
        h.InternalNotes,
    ).Scan(&h.ID, &h.CreatedAt)
}

// IsSubscriptionActive verifica si el usuario tiene una suscripción válida.
func (r *PostgresUserRepository) IsSubscriptionActive(ctx context.Context, userID uuid.UUID) (bool, error) {
	var status string
	query := `SELECT subscription_status FROM users WHERE id = $1`

	err := r.Conn.QueryRow(ctx, query, userID).Scan(&status)
	if err != nil {
		// Si no se encuentra el usuario o hay error, devolvemos false
		return false, err
	}

	// Ajusta "active" según los estados que manejes en tu DB
	return status == "active", nil
}

func (r *PostgresUserRepository) GetPetByID(ctx context.Context, petID uuid.UUID) (*domain.Pet, error) {
	query := `SELECT id, owner_id, name, species, breed, birth_date, gender, weight, health_metadata FROM pets WHERE id = $1`
	var p domain.Pet
	err := r.Conn.QueryRow(ctx, query, petID).Scan(
		&p.ID, &p.OwnerID, &p.Name, &p.Species, &p.Breed, &p.BirthDate, &p.Gender, &p.Weight, &p.HealthMetadata,
	)
	return &p, err
}

func (r *PostgresUserRepository) GetMedicalHistoryByPetID(ctx context.Context, petID uuid.UUID) ([]domain.MedicalHistory, error) {
	query := `SELECT id, pet_id, professional_id, diagnosis, treatment, internal_notes, created_at FROM medical_histories WHERE pet_id = $1 ORDER BY created_at DESC`
	rows, _ := r.Conn.Query(ctx, query, petID)
	defer rows.Close()
	var history []domain.MedicalHistory
	for rows.Next() {
		var h domain.MedicalHistory
		rows.Scan(&h.ID, &h.PetID, &h.ProfessionalID, &h.Diagnosis, &h.Treatment, &h.InternalNotes, &h.CreatedAt)
		history = append(history, h)
	}
	return history, nil
}

func (r *PostgresUserRepository) UpsertProfessionalProfile(ctx context.Context, p *domain.ProfessionalEntity) error {
	query := `
		INSERT INTO professional_entities (
			user_id, entity_type, status, name, slug, profile_data, is_active, updated_at
		) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			entity_type = EXCLUDED.entity_type,
			name = EXCLUDED.name,
			profile_data = EXCLUDED.profile_data,
			updated_at = NOW()
		RETURNING id, created_at`

	profileDataJSON, err := json.Marshal(p.ProfileData)
	if err != nil {
		return fmt.Errorf("error serializing profile data: %v", err)
	}

	err = r.Conn.QueryRow(ctx, query,
		p.UserID,
		p.EntityType,
		p.Status,
		p.Name,
		p.Slug,
		profileDataJSON,
		p.IsActive,
	).Scan(&p.ID, &p.CreatedAt)

	if err != nil {
		return err
	}
	return nil
}

func (r *PostgresUserRepository) GetProfessionalProfileByUserID(ctx context.Context, userID uuid.UUID) (*domain.ProfessionalEntity, error) {
	query := `
        SELECT id, user_id, entity_type, status, name, slug, profile_data, rating, review_count, is_active, created_at, updated_at 
        FROM professional_entities 
        WHERE user_id = $1`

	var p domain.ProfessionalEntity
	err := r.Conn.QueryRow(ctx, query, userID).Scan(
		&p.ID,          // uuid
		&p.UserID,      // uuid
		&p.EntityType,  // text
		&p.Status,      // text
		&p.Name,        // text
		&p.Slug,        // text
		&p.ProfileData, // jsonb -> se mapea al struct ProfileData automáticamente
		&p.Rating,      // numeric -> float64
		&p.ReviewCount, // integer -> int
		&p.IsActive,    // boolean
		&p.CreatedAt,   // timestamp
		&p.UpdatedAt,   // timestamp
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PostgresUserRepository) GetAppointmentsByProfessionalID(ctx context.Context, profID uuid.UUID) ([]domain.Appointment, error) {
	query := `
        SELECT 
            a.id, 
            a.professional_id, -- AÑADIR ESTA
            a.owner_id,        -- AÑADIR ESTA
            a.pet_id,          -- AÑADIR ESTA
            a.appointment_date, 
            a.status, 
            a.notes, 
            p.name as pet_name, 
            u.name as owner_name
        FROM appointments a
        INNER JOIN pets p ON a.pet_id = p.id
        INNER JOIN users u ON a.owner_id = u.id
        WHERE a.professional_id = $1
        ORDER BY a.appointment_date ASC`

	rows, err := r.Conn.Query(ctx, query, profID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var appointments []domain.Appointment
	for rows.Next() {
		var a domain.Appointment
		err := rows.Scan(
			&a.ID,
			&a.ProfessionalID, // Escanear el ID profesional
			&a.OwnerID,        // Escanear el ID del dueño
			&a.PetID,          // Escanear el ID de la mascota
			&a.AppointmentDate,
			&a.Status,
			&a.Notes,
			&a.PetName,
			&a.OwnerName,
		)
		if err != nil {
			return nil, err
		}
		appointments = append(appointments, a)
	}
	return appointments, nil
}

func (r *PostgresUserRepository) UpdateAppointmentStatus(ctx context.Context, appID uuid.UUID, status string) error {
	query := `UPDATE appointments SET status = $1 WHERE id = $2`
	_, err := r.Conn.Exec(ctx, query, status, appID)
	return err
}

func (r *PostgresUserRepository) RescheduleAppointment(ctx context.Context, appID uuid.UUID, newDate time.Time, notes string) error {
    // Cambiamos el estado a 'RESCHEDULED' para que el Front del dueño sepa que debe mostrar botones de Aceptar/Anular
    // Y guardamos la nota explicativa del veterinario
    query := `
        UPDATE appointments 
        SET appointment_date = $1, 
            status = 'RESCHEDULED', 
            notes = $2 
        WHERE id = $3`
        
    _, err := r.Conn.Exec(ctx, query, newDate, notes, appID)
    return err
}

func (r *PostgresUserRepository) GetClientsByProfessionalID(ctx context.Context, profID uuid.UUID) ([]domain.User, error) {
    // Mejoramos la query: El cliente existe si la cita NO está 'CANCELLED' ni es 'PENDING'
    // Esto incluye CONFIRMED, COMPLETED y RESCHEDULED
    query := `
        SELECT DISTINCT u.id, u.name, u.email, u.phone, u.city
        FROM users u
        INNER JOIN appointments a ON u.id = a.owner_id
        WHERE a.professional_id = $1 
        AND a.status IN ('CONFIRMED', 'COMPLETED', 'RESCHEDULED', 'NOSHOW')
        ORDER BY u.name ASC`

    rows, err := r.Conn.Query(ctx, query, profID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var clients []domain.User
    for rows.Next() {
        var u domain.User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.City); err != nil {
            return nil, err
        }
        clients = append(clients, u)
    }
    return clients, nil
}

func (r *PostgresUserRepository) GetPetsByOwnerID(ctx context.Context, ownerID uuid.UUID) ([]domain.Pet, error) {
    query := `SELECT id, name, species, breed, gender, birth_date, owner_id FROM pets WHERE owner_id = $1`
    rows, err := r.Conn.Query(ctx, query, ownerID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var pets []domain.Pet
    for rows.Next() {
        var p domain.Pet
        if err := rows.Scan(&p.ID, &p.Name, &p.Species, &p.Breed, &p.Gender, &p.BirthDate, &p.OwnerID); err != nil {
            return nil, err
        }
        pets = append(pets, p)
    }
    return pets, nil
}