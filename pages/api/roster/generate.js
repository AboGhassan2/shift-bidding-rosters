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

  // Validate input
  if (!year || !month || year < 2020 || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Invalid year or month' })
  }

  try {
    // Check if roster already exists
    const existing = await prisma.rosterPeriod.findUnique({
      where: { 
        year_month: { year, month }
      }
    })

    if (existing) {
      return res.status(400).json({ 
        error: `Roster for ${year}-${month} already exists` 
      })
    }

    // Call Python script to generate roster
    const scriptPath = path.join(process.cwd(), 'python-scripts', 'roster_generator.py')
    const command = `python3 ${scriptPath} ${year} ${month} ${totalLines}`
    
    console.log('Executing:', command)
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000 // 60 second timeout
    })

    if (stderr) {
      console.error('Python stderr:', stderr)
    }

    // Parse Python output (should be JSON)
    let rosterData
    try {
      rosterData = JSON.parse(stdout)
    } catch (parseError) {
      console.error('Failed to parse Python output:', stdout)
      return res.status(500).json({ 
        error: 'Failed to parse roster data',
        details: parseError.message
      })
    }

    // Create roster period in database
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

    // Save roster lines to database (if Python provides them)
    if (Array.isArray(rosterData) && rosterData.length > 0) {
      const linesToCreate = rosterData.map(line => ({
        lineNumber: line.lineNumber,
        rosterPeriodId: rosterPeriod.id,
        date: new Date(line.date),
        shift: line.shift,
        department: line.department || 'General',
        isAvailable: true
      }))

      await prisma.rosterLine.createMany({
        data: linesToCreate
      })
    }

    res.status(200).json({ 
      success: true, 
      rosterPeriodId: rosterPeriod.id,
      linesGenerated: rosterData.length,
      year,
      month
    })

  } catch (error) {
    console.error('Generation error:', error)
    res.status(500).json({ 
      error: 'Roster generation failed',
      details: error.message 
    })
  }
}
