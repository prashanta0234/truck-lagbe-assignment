package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"
)

type BatchWorker struct {
	db            *sql.DB
	locationQueue chan LocationUpdate
	batchStats    *BatchStats
	statsMutex    *sync.RWMutex
	batchSize     int
	batchTimeout  time.Duration
}

func NewBatchWorker(db *sql.DB, locationQueue chan LocationUpdate, batchStats *BatchStats, statsMutex *sync.RWMutex, batchSize int, batchTimeout time.Duration) *BatchWorker {
	return &BatchWorker{
		db:            db,
		locationQueue: locationQueue,
		batchStats:    batchStats,
		statsMutex:    statsMutex,
		batchSize:     batchSize,
		batchTimeout:  batchTimeout,
	}
}

func (bw *BatchWorker) Start() {
	log.Println("Batch worker started")

	ticker := time.NewTicker(bw.batchTimeout)
	defer ticker.Stop()

	var batch []LocationUpdate

	for {
		select {
		case update := <-bw.locationQueue:
			batch = append(batch, update)

			if len(batch) >= bw.batchSize {
				bw.processBatch(batch)
				batch = nil
			}

		case <-ticker.C:
			if len(batch) > 0 {
				bw.processBatch(batch)
				batch = nil
			}
		}
	}
}

func (bw *BatchWorker) processBatch(batch []LocationUpdate) {
	if len(batch) == 0 {
		return
	}

	startTime := time.Now()

	if err := bw.bulkInsertLocations(batch); err != nil {
		log.Printf("Failed to process batch of %d updates: %v", len(batch), err)
		return
	}

	bw.statsMutex.Lock()
	bw.batchStats.TotalProcessed += int64(len(batch))
	bw.batchStats.BatchesExecuted++
	bw.batchStats.LastBatchTime = time.Now().Format(time.RFC3339)
	bw.statsMutex.Unlock()

	duration := time.Since(startTime)
	log.Printf("Successfully processed %d location updates in %v", len(batch), duration)
}

func (bw *BatchWorker) bulkInsertLocations(updates []LocationUpdate) error {
	if len(updates) == 0 {
		return nil
	}

	query := "INSERT INTO truck_locations (truck_id, latitude, longitude, timestamp) VALUES "

	valueStrings := make([]string, 0, len(updates))
	valueArgs := make([]interface{}, 0, len(updates)*4)

	for _, update := range updates {
		valueStrings = append(valueStrings, "(?, ?, ?, ?)")
		valueArgs = append(valueArgs, update.TruckID, update.Latitude, update.Longitude, update.Timestamp)
	}

	query += strings.Join(valueStrings, ", ")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	startTime := time.Now()
	_, err := bw.db.ExecContext(ctx, query, valueArgs...)
	duration := time.Since(startTime)

	if err != nil {
		return fmt.Errorf("failed to bulk insert locations: %v", err)
	}

	log.Printf("Saved %d location updates to database in %v", len(updates), duration)
	return nil
}
