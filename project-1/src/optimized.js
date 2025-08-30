import express from 'express';
import { queryOptimized } from '../db.js';
import compression from 'compression';

const app = express();
const PORT = 5002;

app.use(express.json());
app.use(compression());

app.get("/api/v1/drivers/:driverId/analytics", async (req, res) => {
  const { driverId } = req.params;
  const { limit = 100, cursor_date, cursor_id } = req.query;
  
  const limitNum = parseInt(limit) || 100;


  try {
    const [driverStats] = await queryOptimized(`
      SELECT 
        d.driver_id, 
        d.driver_name, 
        d.phone_number, 
        d.onboarding_date,
        COUNT(t.trip_id) as totalTrips,
        COALESCE(SUM(p.amount), 0) as totalEarnings,
        COALESCE(AVG(r.rating_value), 0) as averageRating
      FROM drivers d
      LEFT JOIN trips t ON d.driver_id = t.driver_id
      LEFT JOIN payments p ON t.trip_id = p.trip_id
      LEFT JOIN ratings r ON t.trip_id = r.trip_id
      WHERE d.driver_id = ?
      GROUP BY d.driver_id, d.driver_name, d.phone_number, d.onboarding_date
    `, [driverId]);

    

    if (!driverStats) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    let cursorCondition = '';
    let queryParams = [driverId];
    
    if (cursor_date && cursor_id) {
      cursorCondition = `
        AND (t.trip_date < ? OR (t.trip_date = ? AND t.trip_id < ?))
      `;
      queryParams.push(cursor_date, cursor_date, cursor_id);
    }

    const trips = await queryOptimized(`
      SELECT 
        t.trip_id,
        t.start_location,
        t.end_location,
        t.trip_date,
        p.amount,
        p.payment_date,
        r.rating_value,
        r.comment
      FROM trips t
      LEFT JOIN payments p ON t.trip_id = p.trip_id
      LEFT JOIN ratings r ON t.trip_id = r.trip_id
      WHERE t.driver_id = ? ${cursorCondition}
      ORDER BY t.trip_date DESC, t.trip_id DESC
      LIMIT ${limitNum + 1}
    `, queryParams);

    const hasNextPage = trips.length > limitNum;
    const actualTrips = hasNextPage ? trips.slice(0, limitNum) : trips;
    
    let nextCursor = null;
    if (hasNextPage && actualTrips.length > 0) {
      const lastTrip = actualTrips[actualTrips.length - 1];
      nextCursor = {
        cursor_date: lastTrip.trip_date,
        cursor_id: lastTrip.trip_id
      };
    }

    const tripMap = new Map();
    
    actualTrips.forEach(trip => {
      const tripData = {
        trip_id: trip.trip_id,
        start_location: trip.start_location,
        end_location: trip.end_location,
        trip_date: trip.trip_date,
        payment: trip.amount ? {
          amount: parseFloat(trip.amount),
          payment_date: trip.payment_date
        } : null,
        rating: trip.rating_value ? {
          rating_value: parseInt(trip.rating_value),
          comment: trip.comment
        } : null
      };
      
      tripMap.set(trip.trip_id, tripData);
    });

    const tripDetails = Array.from(tripMap.values());

    const totalTrips = parseInt(driverStats.totalTrips) || 0;
    const totalEarnings = parseFloat(driverStats.totalEarnings) || 0;
    const averageRating = parseFloat(driverStats.averageRating) || 0;
    const responseData = {
      driver: {
        driver_id: driverStats.driver_id,
        driver_name: driverStats.driver_name,
        phone_number: driverStats.phone_number,
        onboarding_date: driverStats.onboarding_date
      },
      totalTrips: totalTrips,
      totalEarnings: totalEarnings,
      averageRating: averageRating,
      trips: tripDetails,
      pagination: {
        limit: limitNum,
        hasNextPage: hasNextPage,
        totalTrips: totalTrips,
        showingTrips: tripDetails.length,
        nextCursor: nextCursor
      }
    }

    res.json(responseData);

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
