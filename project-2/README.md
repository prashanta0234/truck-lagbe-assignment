# Real-Time Truck Location API

This project provides two implementations of a real-time truck location tracking API - an optimized version with batch processing and an unoptimized version for performance comparison.

## Quick Start

### Prerequisites

- **Go** (version 1.21+)
- **Docker & Docker Compose**
- **k6** (for load testing)

## Project Setup

### 2. Database Setup

#### For Unoptimized Version:

```bash
cd un-optimized

docker-compose up -d

docker exec -i mysql_db mysql -umy -proot driver_analytics < database_schema.sql

go mod tidy
```

#### For Optimized Version:

```bash
cd optimized

go mod tidy
```

## Running the Application

### Unoptimized Version

```bash
cd un-optimized
go run main.go
```

**Server will start on:**

- API: http://localhost:7000
- phpMyAdmin: http://localhost:8080

### Optimized Version

```bash
cd optimized
go run main.go batch_worker.go
```

**Server will start on:**

- API: http://localhost:8000
- phpMyAdmin: http://localhost:8081

## Testing

### Install k6 (if not already installed)

**Windows (using chocolatey):**

```bash
choco install k6
```

**macOS (using homebrew):**

```bash
brew install k6
```

**Linux:**

```bash
wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz
tar -xzf k6-v0.47.0-linux-amd64.tar.gz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
```

### Running Load Tests

#### Basic Load Test (500 users)

```bash
cd test
k6 run k6-loadtest.js
```
