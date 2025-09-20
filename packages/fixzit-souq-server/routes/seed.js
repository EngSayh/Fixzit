const express = require('express');
const { seedDatabase } = require('../seed-data');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ 
      success: true, 
      message: 'Database seeded successfully with comprehensive sample data' 
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;

