package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

const (
	DBHost     = "localhost"
	DBPort     = "3306"
	DBUser     = "my"
	DBPassword = "root"
	DBName     = "driver_analytics"
)

type LocationUpdateRequest struct {
	TruckID   int     `json:"truck_id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type LocationUpdateResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

var db *sql.DB

func initDatabase() error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		DBUser, DBPassword, DBHost, DBPort, DBName)

	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database connection: %v", err)
	}

	if err = db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %v", err)
	}

	log.Println("Database connection established successfully")
	return nil
}

func insertTruckLocation(truckID int, latitude, longitude float64) error {
	query := `INSERT INTO truck_locations (truck_id, latitude, longitude, timestamp) 
			  VALUES (?, ?, ?, ?)`

	_, err := db.Exec(query, truckID, latitude, longitude, time.Now())
	if err != nil {
		return fmt.Errorf("failed to insert truck location: %v", err)
	}

	log.Printf("Successfully inserted location for truck %d: (%.6f, %.6f)",
		truckID, latitude, longitude)
	return nil
}

func validateLocationData(req *LocationUpdateRequest) error {
	if req.TruckID <= 0 {
		return fmt.Errorf("truck_id must be a positive integer")
	}
	if req.Latitude < -90 || req.Latitude > 90 {
		return fmt.Errorf("latitude must be between -90 and 90")
	}
	if req.Longitude < -180 || req.Longitude > 180 {
		return fmt.Errorf("longitude must be between -180 and 180")
	}
	return nil
}

func handleLocationUpdate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(LocationUpdateResponse{
			Success:   false,
			Message:   "Only POST method is allowed",
			Timestamp: time.Now().Format(time.RFC3339),
		})
		return
	}

	var req LocationUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(LocationUpdateResponse{
			Success:   false,
			Message:   fmt.Sprintf("Invalid JSON payload: %v", err),
			Timestamp: time.Now().Format(time.RFC3339),
		})
		return
	}

	if err := validateLocationData(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(LocationUpdateResponse{
			Success:   false,
			Message:   err.Error(),
			Timestamp: time.Now().Format(time.RFC3339),
		})
		return
	}

	startTime := time.Now()
	if err := insertTruckLocation(req.TruckID, req.Latitude, req.Longitude); err != nil {
		log.Printf("Database error for truck %d: %v", req.TruckID, err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(LocationUpdateResponse{
			Success:   false,
			Message:   "Failed to update truck location",
			Timestamp: time.Now().Format(time.RFC3339),
		})
		return
	}
	duration := time.Since(startTime)

	log.Printf("Location update for truck %d processed in %v", req.TruckID, duration)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(LocationUpdateResponse{
		Success:   true,
		Message:   "Truck location updated successfully",
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

func setupRoutes() *http.ServeMux {
	r := http.NewServeMux()
	r.HandleFunc("/api/v1/location/update", handleLocationUpdate)

	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	return r
}

func main() {
	log.Println("Starting Real-Time Truck Location API (UN-OPTIMIZED VERSION)")
	log.Println("WARNING: This version performs synchronous DB writes - expect bottlenecks!")

	if err := initDatabase(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	r := setupRoutes()

	port := "7000"
	log.Printf("Server starting on port %s", port)

	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
