// pages/api/roster/list.js

// Change this line:
// import { prisma } from '../../../lib/db';

// To this:
import prisma from '../../../lib/db'; // Import the default export

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all roster periods, ordered by newest first
    const rosters = await prisma.rosterPeriod.findMany({
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' } // Order by creation date as a secondary sort if year is the same
      ]
    });

    return res.status(200).json({
      success: true,
      rosters: rosters,
      count: rosters.length
    });

  } catch (error) {
    console.error('Error fetching rosters:', error);
    // It's good practice to send a more generic error message in production
    // to avoid exposing sensitive information.
    return res.status(500).json({
      error: 'Failed to fetch rosters',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' // Show full error only in development
    });
  }
}
