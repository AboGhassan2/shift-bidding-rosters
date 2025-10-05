// pages/api/roster/generate.js
import { prisma } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { days = 7 } = req.body;
    
    // Simple JS roster generator (replaces Python)
    const shifts = [];
    const roles = ['Nurse', 'Tech', 'Admin'];
    const startDate = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      roles.forEach(role => {
        shifts.push({
          id: `${role}-${date.toISOString().split('T')[0]}`,
          role,
          date: date.toISOString().split('T')[0],
          startTime: '08:00',
          endTime: '16:00',
          status: 'open'
        });
      });
    }

    // Save to database
    // The original code had a duplicate 'const created = await ...' line and incorrect object structure.
    // It should be a single call to prisma.shift.createMany with a 'data' property.
    const created = await prisma.shift.createMany({
      data: shifts.map(s => ({
        id: s.id,
        role: s.role,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status
      })),
      skipDuplicates: true // Optional: Prevents errors if shifts with the same 'id' already exist
    });

    res.status(200).json({ success: true, count: created.count });
  } catch (error) {
    console.error('Roster generation API route error:', error);
    // It's good practice to send a more specific error message in development,
    // but be careful not to expose sensitive information in production.
    res.status(500).json({ error: 'Failed to generate roster', details: error.message });
  }
}
