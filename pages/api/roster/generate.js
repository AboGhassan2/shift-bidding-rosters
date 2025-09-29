import { prisma } from '../../../lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { year, month, totalLines = 2500 } = req.body

  try {
    // Call your Python script
    const scriptPath = path.join(process.cwd(), 'python-scripts', 'roster_generator.py')
    const command = `python3 ${scriptPath} ${year} ${month} ${totalLines}`
    
    const { stdout } = await execAsync(command)
    const rosterData = JSON.parse(stdout)

    // Save to database
    const rosterPeriod = await prisma.rosterPeriod.create({
      data: {
        year,
        month,
        status: 'DRAFT',
        startDate: new Date(year, month - 1, 1),
        endDate: new Date(year, month, 0),
        totalLines
      }
    })

    res.status(200).json({ 
      success: true, 
      rosterPeriodId: rosterPeriod.id,
      linesGenerated: rosterData.length 
    })
  } catch (error) {
    console.error('Generation error:', error)
    res.status(500).json({ error: error.message })
  }
}
