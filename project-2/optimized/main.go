package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

const (
	DBHost     = "localhost"
	DBPort     = "3306"
	DBUser     = "my"
	DBPassword = "root"
	DBName     = "driver_analytics"

	BatchSize    = 1000
	BatchTimeout = 10 * time.Second
	QueueSize    = 5000
)

type LocationUpdate struct {
	TruckID   int       `json:"truck_id"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Timestamp time.Time `json:"timestamp"`
}

type LocationUpdateRequest struct {
	TruckID   int     `json:"truck_id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type LocationUpdateResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
	RequestID string `json:"request_id"`
}

type BatchStats struct {
	TotalProcessed  int64  `json:"total_processed"`
	BatchesExecuted int64  `json:"batches_executed"`
	QueueLength     int    `json:"queue_length"`
	LastBatchTime   string `json:"last_batch_time"`
}

var (
	db            *sql.DB
	locationQueue chan LocationUpdate
	batchStats    BatchStats
	statsMutex    sync.RWMutex
	batchWorker   *BatchWorker
)

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

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Database connected!")
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

func generateRequestID() string {
	return fmt.Sprintf("req_%d", time.Now().UnixNano())
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

	update := LocationUpdate{
		TruckID:   req.TruckID,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		Timestamp: time.Now(),
	}

	requestID := generateRequestID()

	select {
	case locationQueue <- update:
		log.Printf("Location update for truck %d queued successfully (Request ID: %s)",
			req.TruckID, requestID)

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(LocationUpdateResponse{
			Success:   true,
			Message:   "Location update queued for processing",
			Timestamp: time.Now().Format(time.RFC3339),
			RequestID: requestID,
		})
	default:
		log.Printf("Queue full, rejecting location update for truck %d", req.TruckID)

		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(LocationUpdateResponse{
			Success:   false,
			Message:   "Service temporarily unavailable - queue is full",
			Timestamp: time.Now().Format(time.RFC3339),
			RequestID: requestID,
		})
	}
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	statsMutex.RLock()
	currentStats := BatchStats{
		TotalProcessed:  batchStats.TotalProcessed,
		BatchesExecuted: batchStats.BatchesExecuted,
		QueueLength:     len(locationQueue),
		LastBatchTime:   batchStats.LastBatchTime,
	}
	statsMutex.RUnlock()

	json.NewEncoder(w).Encode(currentStats)
}

func setupRoutes() *http.ServeMux {
	r := http.NewServeMux()

	r.HandleFunc("/api/v1/location/update", handleLocationUpdate)

	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":     "healthy",
			"timestamp":  time.Now().Format(time.RFC3339),
			"queue_size": len(locationQueue),
			"version":    "optimized",
		})
	})

	r.HandleFunc("/stats", handleStats)

	return r
}

func main() {
	log.Println("Starting Real-Time Truck Location API (OPTIMIZED VERSION)")
	log.Printf("Batch configuration: Size=%d, Timeout=%v, Queue Size=%d",
		BatchSize, BatchTimeout, QueueSize)

	if err := initDatabase(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	locationQueue = make(chan LocationUpdate, QueueSize)

	batchWorker = NewBatchWorker(db, locationQueue, &batchStats, &statsMutex, BatchSize, BatchTimeout)
	go batchWorker.Start()

	r := setupRoutes()

	port := "8000"
	log.Printf("Server starting on port %s", port)

	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
