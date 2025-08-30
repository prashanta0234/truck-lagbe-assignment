import mysql from 'mysql2/promise';

// Single connection (no connection pool as requested)
let connection = null;

// un optimized

export async function getConnection() {
  if (!connection) {
    try {
      connection = await mysql.createConnection({
        host: 'localhost',
        user: 'my',
        password: 'root',
        database: 'driver_analytics',
        port: 3306
      });
      console.log('Connected to MySQL database');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }
  return connection;
}

  export async function query(sql, params = []) {
    try {
      const conn = await getConnection();
      const [rows] = await conn.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

// optimized

let connectionPool = null;

export async function getConnectionPool() {
  if (!connectionPool) {
    try {
      connectionPool = await mysql.createPool({
        host: 'localhost',
        user: 'my',
        password: 'root',
        database: 'driver_analytics',
        port: 3306
      });
      console.log('Connected to MySQL database');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }
  return connectionPool;
}

export async function queryOptimized(sql, params = []) {
  try {
    const conn = await getConnectionPool();
    const [rows] = await conn.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}