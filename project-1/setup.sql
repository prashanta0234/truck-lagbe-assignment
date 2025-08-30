-- Create database
CREATE DATABASE IF NOT EXISTS driver_analytics;
USE driver_analytics;

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
    driver_id INT PRIMARY KEY AUTO_INCREMENT,
    driver_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    onboarding_date DATE NOT NULL
);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
    trip_id INT PRIMARY KEY AUTO_INCREMENT,
    driver_id INT NOT NULL,
    start_location VARCHAR(255) NOT NULL,
    end_location VARCHAR(255) NOT NULL,
    trip_date DATE NOT NULL,
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    rating_id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    rating_value INT NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
    comment TEXT,
    FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
);










