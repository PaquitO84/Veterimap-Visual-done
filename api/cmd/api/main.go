package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"veterimap-api/internal/auth"
	"veterimap-api/internal/db"
	"veterimap-api/internal/handlers"
	"veterimap-api/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Cargar configuración
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  No se encontró archivo .env, usando variables de entorno del sistema")
	}

	// 2. Conectar a la Base de Datos
	// Usamos db.Conn que es el pool de conexiones pgx
	if err := db.InitDB(); err != nil {
		log.Fatalf("❌ Error crítico al conectar la DB: %v", err)
	}
	defer db.CloseDB()

	// 3. Ejecutar Seeder / Migraciones
	// Esto asegura que las tablas y datos de prueba existan
	log.Println("⏳ Ejecutando migración y seeder de datos...")
	if err := db.SeedClinicas(); err != nil {
		log.Printf("⚠️ Nota sobre el seeder: %v", err)
	}

	// 4. Inicializar Repositorios
	// Inyectamos db.Conn (pool pgx) en los repositorios
	userRepo := db.NewPostgresUserRepository(db.Conn)
	profileRepo := db.NewPostgresProfileRepository(db.Conn)

	// 5. Inicializar Servicios
	authService := services.NewAuthService(userRepo)

	// 6. Inicializar Handlers
	authHandler := handlers.NewAuthHandler(authService)
	profileHandler := handlers.NewProfileHandler(profileRepo)
	userHandler := handlers.NewUserHandler(userRepo, profileRepo)

	// 7. Configurar el Router (Chi)
	r := chi.NewRouter()

	// Middlewares
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(auth.CORS()) // Middleware de CORS para permitir peticiones desde el Frontend (5173)

	// --- RUTAS PÚBLICAS ---
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
		r.Post("/verify", authHandler.Verify)
	})

	r.Route("/api/profiles", func(r chi.Router) {
		r.Get("/", profileHandler.List)            // Marketplace / Lista general
		r.Get("/detail", profileHandler.GetDetail) // Ficha individual
		r.Get("/map", profileHandler.SearchMap)    // Endpoint clave para los pines del mapa
	})

	// --- RUTAS PRIVADAS (Requieren JWT) ---
	r.Group(func(r chi.Router) {
		r.Use(auth.JWTMiddleware())

		r.Get("/api/me", authHandler.MeHandler)

		// 1. Grupo de Usuario (TODO lo que cuelga de /api/users/me)
		r.Route("/api/users/me", func(r chi.Router) {
			// Perfil de Dueño
			r.Get("/profile", userHandler.GetProfile)
			r.Post("/profile", userHandler.UpdateProfile)

			// --- ESTA ES LA POSICIÓN CORRECTA ---
			// Ahora la URL final será: /api/users/me/professional-profile
			r.Route("/professional-profile", func(r chi.Router) {
				r.Get("/", authHandler.GetProfessionalProfile)
				r.Post("/", authHandler.SaveProfessionalProfile)
			})

			// Mascotas
			r.Get("/pets", userHandler.GetMyPets)
			r.Post("/pets", userHandler.AddPet)
			r.Get("/pets/{petID}", userHandler.GetPetByID)
			r.Get("/clients", userHandler.GetMyClients)

			// Citas
			r.Get("/appointments", userHandler.GetMyAppointments)
			r.Post("/appointments", userHandler.CreateAppointment)

			r.Patch("/appointments/status", userHandler.UpdateStatus) // Nueva: Confirmar/Rechazar
			r.Patch("/appointments/reschedule", userHandler.Reschedule)

			r.Get("/pets/owner/{ownerID}", userHandler.GetPetsByOwner)
		})

		// 2. Grupo de Historial Médico
		r.Route("/api/medical-histories", func(r chi.Router) {
			// Esta ruta permite que David cargue el pasado clínico de la mascota
			r.Get("/pet/{petID}", userHandler.GetMedicalHistory)

			// Esta ruta permite que David cree una nueva entrada (POST)
			r.Post("/", userHandler.AddMedicalHistory)
		})
	})

	// 8. Arrancar el Servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Veterimap API escuchando en http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("❌ Error al arrancar el servidor: %v", err)
	}
}
