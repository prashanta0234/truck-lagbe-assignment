const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "driver_analytics",
  waitForConnections: true,
  connectionLimit: 10,
});

// Sample locations for variety
const locations = [
  'Downtown', 'Airport', 'Mall', 'University', 'Hospital', 
  'Suburb', 'Business District', 'Residential Area', 'Shopping Center',
  'Train Station', 'Bus Terminal', 'Park', 'Restaurant', 'Hotel'
];

// Sample comments for ratings
const comments = [
  'Great service', 'Good ride', 'Excellent driver', 'Safe trip', 
  'On time', 'Clean car', 'Professional', 'Friendly', 'Comfortable', 
  'Smooth ride', 'Very helpful', 'Great communication', 'Punctual',
  'Courteous driver', 'Well maintained vehicle', 'Good navigation'
];

async function seed() {
  try {
    console.log("Starting database seeding...");
    
    // First, seed drivers (1000+)
    console.log("Seeding drivers...");
    for (let i = 1; i <= 1000; i++) {
      const onboardingDate = new Date(2023, 0, 1);
      onboardingDate.setDate(onboardingDate.getDate() + Math.floor(Math.random() * 365));
      
      await pool.query(
        `INSERT INTO drivers(driver_name, phone_number, onboarding_date) VALUES (?, ?, ?)`,
        [`Driver ${i}`, `+1234567${i.toString().padStart(3, "0")}`, onboardingDate.toISOString().split('T')[0]]
      );
    }
    console.log("✅ Drivers seeded successfully!");

    // Step 1: Insert all trips first
    console.log("Step 1: Seeding all trips...");
    let tripIdCounter = 1; // Start from 11 since we have 10 initial trips
    
    for (let driverId = 1; driverId <= 1000; driverId++) {
      console.log(`Processing driver ${driverId}/1000...`);
      
      for (let tripNumber = 1; tripNumber <= 1000; tripNumber++) {
        // Random start and end locations
        const startLocation = locations[Math.floor(Math.random() * locations.length)];
        const endLocation = locations[Math.floor(Math.random() * locations.length)];
        
        // Random trip date in 2024
        const tripDate = new Date(2024, 0, 1);
        tripDate.setDate(tripDate.getDate() + Math.floor(Math.random() * 365));
        
        // Insert trip
        await pool.query(
          `INSERT INTO trips(driver_id, start_location, end_location, trip_date) VALUES (?, ?, ?, ?)`,
          [driverId, startLocation, endLocation, tripDate.toISOString().split('T')[0]]
        );
        
        tripIdCounter++;
      }
    }
    console.log("✅ All trips seeded successfully!");

    // Step 2: Insert all payments
    console.log("Step 2: Seeding all payments...");
    for (let tripId = 1; tripId < tripIdCounter; tripId++) {
      // Random amount between $15-$115
      const amount = Math.round((Math.random() * 100 + 15) * 100) / 100;
      
      // Random payment date in 2024
      const paymentDate = new Date(2024, 0, 1);
      paymentDate.setDate(paymentDate.getDate() + Math.floor(Math.random() * 365));
      
      // Insert payment
      await pool.query(
        `INSERT INTO payments(trip_id, amount, payment_date) VALUES (?, ?, ?)`,
        [tripId, amount, paymentDate.toISOString().split('T')[0]]
      );
    }
    console.log("✅ All payments seeded successfully!");

    // Step 3: Insert all ratings
    console.log("Step 3: Seeding all ratings...");
    for (let tripId = 1; tripId < tripIdCounter; tripId++) {
      // Random rating 1-5
      const ratingValue = Math.floor(Math.random() * 5) + 1;
      
      // Random comment
      const comment = comments[Math.floor(Math.random() * comments.length)];
      
      // Insert rating
      await pool.query(
        `INSERT INTO ratings(trip_id, rating_value, comment) VALUES (?, ?, ?)`,
        [tripId, ratingValue, comment]
      );
    }
    console.log("✅ All ratings seeded successfully!");

    console.log("\n🎉 All tables seeded successfully!");
    console.log("📊 Summary:");
    console.log("   - Drivers: 1000+ records");
    console.log("   - Trips: 1,000,000+ records (1000 per driver)");
    console.log("   - Payments: 1,000,000+ records (1 per trip)");
    console.log("   - Ratings: 1,000,000+ records (1 per trip)");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

seed();
