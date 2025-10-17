// pages/api/test-db.js

// Change this line:
// import { prisma } from '../../lib/db';

// To this:
import prisma from '../../lib/db'; // Import the default export

export default async function handler(req, res) {
  try {
    // Test the connection by counting roster periods (or any other model)
    const count = await prisma.rosterPeriod.count(); // Or prisma.employee.count() if you prefer

    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
}
