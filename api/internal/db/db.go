package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Conn es el pool de conexiones global. 
// Es el corazón de la persistencia de datos.
var Conn *pgxpool.Pool

func InitDB() error {
	// 1. Obtener la URL de conexión del entorno
	dsn := os.Getenv("DB_URL") 
	
	if dsn == "" {
		// Fallback de seguridad para desarrollo local
		dsn = "postgres://postgres:postgres@localhost:5432/veterimap?sslmode=disable"
		log.Println("⚠️  Variable DB_URL no encontrada, usando configuración por defecto.")
	}

	// 2. Configuración del Pool de conexiones (Optimizado)
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("error parseando configuración de base de datos: %v", err)
	}

	// Ajustes de rendimiento para manejar ráfagas de peticiones al mapa
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	// 3. Establecer la conexión con Timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return fmt.Errorf("error al crear el pool de conexiones: %v", err)
	}

	// 4. Ping de validación (Crucial para asegurar que la DB está lista)
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("la base de datos existe pero no responde (Ping fallido): %v", err)
	}

	Conn = pool
	log.Println("✅ Pool de conexiones PostgreSQL inicializado correctamente.")
	return nil
}

// CloseDB cierra todas las conexiones activas al apagar el servidor
func CloseDB() {
	if Conn != nil {
		Conn.Close()
		log.Println("💤 Pool de conexiones cerrado.")
	}
}