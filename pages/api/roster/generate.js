import { prisma } from '../../../lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import XLSX from 'xlsx'
import fs from 'fs'
// pages/api/roster/generate.js
import prisma from '../../../lib/db';

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
    const created = await prisma.shift.createMany({
      data: shifts.map(s => ({
        id: s.id,
        role: s.role,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status
      })),
      skipDuplicates: true
    });

    res.status(200).json({ success: true, count: created.count });
  } catch (error) {
    console.error('Roster generation failed:', error);
    res.status(500).json({ error: 'Failed to generate roster' });
  }
}

const execAsync = promisify(exec)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { year, month, totalLines = 2500 } = req.body

  try {
    // Call your existing Python script
    const scriptPath = path.join(process.cwd(), 'python-scripts', 'roster_generator.py')
    const command = `python3 ${scriptPath} ${year} ${month}`
    
    await execAsync(command, { timeout: 120000 }) // 2 min timeout
    
    // Read the generated Excel file
    const excelPath = `C:\\Users\\a_abd\\Documents\\Monthly_Roster_${year}_${month.toString().padStart(2, '0')}.xlsx`
    
    if (!fs.existsSync(excelPath)) {
      return res.status(500).json({ error: 'Excel file not generated' })
    }

    const workbook = XLSX.readFile(excelPath)
    const sheetName = workbook.SheetNames[0] // 'Monthly_Roster'
    const worksheet = workbook.Sheets[sheetName]
    const rosterData = XLSX.utils.sheet_to_json(worksheet)

    // Create roster period
    const rosterPeriod = await prisma.rosterPeriod.create({
      data: {
        year,
        month,
        status: 'DRAFT',
        startDate: new Date(year, month - 1, 1),
        endDate: new Date(year, month, 0),
        totalLines: rosterData.length
      }
    })

    res.status(200).json({ 
      success: true, 
      rosterPeriodId: rosterPeriod.id,
      linesGenerated: rosterData.length,
      excelPath: excelPath
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
