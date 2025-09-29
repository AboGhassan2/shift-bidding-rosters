import { prisma } from '../../lib/db'

export default async function handler(req, res) {
  try {
    const employeeCount = await prisma.employee.count()
    
    res.status(200).json({ 
      message: 'Database connection successful!', 
      employeeCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database error:', error)
    res.status(500).json({ error: 'Database connection failed' })
  }
}
