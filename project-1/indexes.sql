-- Database Indexes for Performance Optimization
-- These indexes will significantly improve query performance for the analytics endpoint

USE driver_analytics;

-- Index on drivers table for driver lookup
CREATE INDEX idx_drivers_driver_id ON drivers(driver_id);

-- Index on trips table for driver-based queries
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_driver_date ON trips(driver_id, trip_date);
CREATE INDEX idx_trips_trip_id ON trips(trip_id);

-- Index on payments table for trip-based queries
CREATE INDEX idx_payments_trip_id ON payments(trip_id);
CREATE INDEX idx_payments_amount ON payments(amount);

-- Index on ratings table for trip-based queries
CREATE INDEX idx_ratings_trip_id ON ratings(trip_id);
CREATE INDEX idx_ratings_rating_value ON ratings(rating_value);

-- Composite indexes for better performance
CREATE INDEX idx_trips_driver_trip ON trips(driver_id, trip_id);
CREATE INDEX idx_payments_trip_amount ON payments(trip_id, amount);
CREATE INDEX idx_ratings_trip_rating ON ratings(trip_id, rating_value);

-- Show created indexes
SHOW INDEX FROM drivers;
SHOW INDEX FROM trips;
SHOW INDEX FROM payments;
SHOW INDEX FROM ratings;
