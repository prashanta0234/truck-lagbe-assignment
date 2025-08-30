-- Database setup for Real-Time Truck Location API (OPTIMIZED)
-- Create the database
CREATE DATABASE IF NOT EXISTS truck_tracking;
USE truck_tracking;

-- Create the truck_locations table
CREATE TABLE IF NOT EXISTS truck_locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    truck_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_truck_id (truck_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_truck_timestamp (truck_id, timestamp)
);

-- Insert some sample data for testing
INSERT INTO truck_locations (truck_id, latitude, longitude) VALUES
(1, 40.7128, -74.0060),  -- New York
(2, 34.0522, -118.2437), -- Los Angeles
(3, 41.8781, -87.6298);  -- Chicago
