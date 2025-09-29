import { prisma } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rosters = await prisma.rosterPeriod.findMany({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ],
      include: {
        _count: {
          select: {
            lines: true,
            bids: true,
            assignments: true
          }
        }
      }
    })

    res.status(200).json({ rosters })
  } catch (error) {
    console.error('List error:', error)
    res.status(500).json({ error: error.message })
  }
}
