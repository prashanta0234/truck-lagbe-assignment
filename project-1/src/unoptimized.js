import express from 'express';
import  {query}  from '../db.js';

const app = express();
const PORT = 5000;

app.use(express.json());


app.get('/api/v1/drivers/:driverId/analytics', async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const sql = `
      SELECT 
        d.driver_id, d.driver_name, d.phone_number, d.onboarding_date,
        t.trip_id, t.start_location, t.end_location, t.trip_date,
        p.amount, p.payment_date,
        r.rating_value, r.comment
      FROM drivers d
      JOIN trips t ON d.driver_id = t.driver_id
      LEFT JOIN payments p ON t.trip_id = p.trip_id
      LEFT JOIN ratings r ON t.trip_id = r.trip_id
      WHERE d.driver_id = ?
    `;
    
    const rows = await query(sql, [driverId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }
    
    const driver = {
      driver_id: rows[0].driver_id,
      driver_name: rows[0].driver_name,
      phone_number: rows[0].phone_number,
      onboarding_date: rows[0].onboarding_date
    };
    
    const trips = [];
    let totalEarnings = 0;
    let totalRating = 0;
    let ratingCount = 0;
    
    rows.forEach(row => {
      const trip = {
        trip_id: row.trip_id,
        start_location: row.start_location,
        end_location: row.end_location,
        trip_date: row.trip_date,
        payment: row.amount ? {
          amount: row.amount,
          payment_date: row.payment_date
        } : null,
        rating: row.rating_value ? {
          rating_value: row.rating_value,
          comment: row.comment
        } : null
      };
      
      trips.push(trip);
      
      if (row.amount) {
        totalEarnings += parseFloat(row.amount);
      }
      
      if (row.rating_value) {
        totalRating += row.rating_value;
        ratingCount++;
      }
    });
    
    const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0;
    
    const response = {
      success: true,
      driver,
      totalTrips: trips.length,
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      averageRating: parseFloat(averageRating),
      trips
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Analytics endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
