// pages/api/roster/list.js
import prisma from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all roster periods, ordered by newest first
    const rosters = await prisma.rosterPeriod.findMany({
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return res.status(200).json({
      success: true,
      rosters: rosters,
      count: rosters.length
    });

  } catch (error) {
    console.error('Error fetching rosters:', error);
    return res.status(500).json({
      error: 'Failed to fetch rosters',
      details: error.message
    });
  }
}
