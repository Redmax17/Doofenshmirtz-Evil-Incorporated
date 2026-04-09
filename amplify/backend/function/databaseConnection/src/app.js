const express = require('express');
const mysql = require('mysql2/promise');

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: 'doofenshmirtz-evil-inc-db.cnei26s2ov1h.us-east-2.rds.amazonaws.com',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: true }
    });
    
    await connection.ping();
    await connection.end();
    
    res.json({ status: 'Connected to RDS successfully!' });
  } catch (error) {
    res.status(500).json({ 
      status: 'Connection failed', 
      error: error.message 
    });
  }
});

module.exports = router;