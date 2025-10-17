// pages/api/roster/generate.js

// Import prisma using the ES module syntax, matching your lib/db.js export
import prisma from '../../../lib/db';

// Optional: Add logging for debugging Prisma client instantiation (remove in production)
// console.log('Prisma client instance in generate.js:', prisma);
// console.log('Type of prisma:', typeof prisma);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year, month, totalLines } = req.body;

    // Validate required fields
    if (!year || !month || !totalLines) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'year, month, and totalLines are required'
      });
    }

    // Ensure year, month, totalLines are numbers if they come as strings
    const yearNum = parseInt(year);
    const monthNum = parseInt(month); // Treat month as integer (1-12)
    const totalLinesNum = parseInt(totalLines);

    console.log(`Generating roster for ${yearNum}-${monthNum} with ${totalLinesNum} employees`);

    // Optional: Add logging to check Prisma client inside the handler
    // console.log('Inside handler - Prisma client instance:', prisma);
    // if (!prisma) {
    //   console.error('Prisma client is undefined inside handler!');
    //   return res.status(500).json({ error: 'Prisma client is undefined' });
    // }

    // Check if roster already exists
    const existingRoster = await prisma.rosterPeriod.findFirst({
      where: {
        year: yearNum,
        month: monthNum
      }
    });

    if (existingRoster) {
      return res.status(409).json({
        error: 'Roster already exists',
        details: `A roster for ${monthNum} ${yearNum} already exists`
      });
    }

    // Fetch employees from database
    const employees = await prisma.employee.findMany({
      include: {
        department: true, // Ensure department relation is included
      },
      take: totalLinesNum
    });

    if (employees.length === 0) {
      return res.status(400).json({
        error: 'No employees found',
        details: 'Please add employees to the database first'
      });
    }

    // Generate the roster using your logic
    // Pass the integer month number to the generator
    const generator = new RosterGenerator(employees, yearNum, monthNum);
    const rosterData = generator.generate();

    // Create roster period
    const rosterPeriod = await prisma.rosterPeriod.create({
      data: {
        year: yearNum,
        month: monthNum, // Store month as integer
        totalLines: employees.length,
        status: 'PUBLISHED'
      }
    });

    // Store the schedule data as JSON (or handle separately if needed)
    // For now, we return it in the response

    return res.status(200).json({
      success: true,
      rosterPeriod: rosterPeriod,
      schedule: rosterData.schedule,
      summary: rosterData.summary,
      dates: rosterData.dates,
      message: `Roster generated successfully for ${employees.length} employees`
    });

  } catch (error) {
    console.error('Roster generation error:', error);
    // It's good practice to send a more generic error message in production
    // to avoid exposing sensitive information.
    return res.status(500).json({
      error: 'Failed to generate roster',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' // Show full error only in development
    });
  }
}

// Helper function to get month name from number (if needed elsewhere)
function getMonthName(monthNumber) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
  return monthNames[monthNumber - 1]; // monthNumber is 1-based (Jan=1)
}

class RosterGenerator {
  // Constructor now expects integer month
  constructor(employees, year, monthNumber) {
    this.employees = employees;
    this.year = year;
    this.monthNumber = monthNumber; // Store the integer month number
    this.vacationPercentage = 0.1;
    this.shifts = {
      A: { name: 'Morning', start: '07:00', end: '15:00' },
      B: { name: 'Evening', start: '15:00', end: '23:00' },
      C: { name: 'Night', start: '23:00', end: '07:00' }
    };
    this.standbyPerShift = 12;
  }

  generate() {
    const monthDates = this.getMonthDates();
    const vacationEmployees = this.assignVacationEmployees();
    const availableEmployees = this.employees.filter(
      (_, idx) => !vacationEmployees.includes(idx)
    );

    console.log(`Total: ${this.employees.length}, Vacation: ${vacationEmployees.length}, Available: ${availableEmployees.length}`);

    const schedule = {};

    // Assign vacation
    vacationEmployees.forEach(idx => {
      schedule[this.employees[idx].id] = {};
      monthDates.forEach(date => {
        schedule[this.employees[idx].id][date.toISOString()] = 'VACATION';
      });
    });

    // Generate patterns for available employees
    this.employees.forEach((employee, idx) => {
      if (vacationEmployees.includes(idx)) return;

      const pattern = this.generateShiftPattern(employee, idx, monthDates);
      schedule[employee.id] = {};

      monthDates.forEach((date, dateIdx) => {
        schedule[employee.id][date.toISOString()] = pattern[dateIdx];
      });
    });

    // Assign standby
    this.assignStandby(schedule, monthDates, availableEmployees);

    // Generate summary statistics
    const summary = this.generateSummary(schedule, monthDates);

    return { schedule, summary, dates: monthDates };
  }

  getMonthDates() {
    const dates = [];
    // Use the stored integer month number (0-based for Date constructor)
    const date = new Date(this.year, this.monthNumber - 1, 1); // monthNumber is 1-based, Date constructor needs 0-based

    while (date.getMonth() === this.monthNumber - 1) { // Check against 0-based month
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }

    return dates;
  }

  assignVacationEmployees() {
    const vacationCount = Math.floor(this.employees.length * this.vacationPercentage);
    const indices = Array.from({ length: this.employees.length }, (_, i) => i);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return indices.slice(0, vacationCount);
  }

  generateShiftPattern(employee, empIdx, monthDates) {
    const department = employee.department?.name || 'General';
    const specialDepartments = ['Station Staff', 'Supervisors'];

    if (specialDepartments.includes(department)) {
      return this.generate2ShiftPattern(empIdx, monthDates.length);
    } else {
      return this.generate3ShiftPattern(empIdx, monthDates.length);
    }
  }

  generate2ShiftPattern(empIdx, totalDays) {
    const pattern = [];
    const shifts = ['A', 'B'];
    const baseCycle = [];

    for (let shiftIdx = 0; shiftIdx < 2; shiftIdx++) {
      const currentShift = shifts[(empIdx + shiftIdx) % 2];
      const workDays = (empIdx + shiftIdx) % 2 === 0 ? 5 : 6;

      for (let i = 0; i < workDays; i++) {
        baseCycle.push(currentShift);
      }

      baseCycle.push('OFF', 'OFF');
    }

    const offset = empIdx % baseCycle.length;
    const offsetCycle = [...baseCycle.slice(offset), ...baseCycle.slice(0, offset)];

    for (let i = 0; i < totalDays; i++) {
      pattern.push(offsetCycle[i % offsetCycle.length]);
    }

    return pattern;
  }

  generate3ShiftPattern(empIdx, totalDays) {
    const pattern = [];
    const shifts = ['A', 'B', 'C'];
    const baseCycle = [];

    for (let shiftIdx = 0; shiftIdx < 3; shiftIdx++) {
      const currentShift = shifts[(empIdx + shiftIdx) % 3];
      const workDays = (empIdx + shiftIdx) % 2 === 0 ? 5 : 6;

      for (let i = 0; i < workDays; i++) {
        baseCycle.push(currentShift);
      }

      baseCycle.push('OFF', 'OFF');
    }

    const offset = empIdx % baseCycle.length;
    const offsetCycle = [...baseCycle.slice(offset), ...baseCycle.slice(0, offset)];

    for (let i = 0; i < totalDays; i++) {
      pattern.push(offsetCycle[i % offsetCycle.length]);
    }

    return pattern;
  }

  assignStandby(schedule, monthDates, availableEmployees) {
    const employeeStandbyCount = {};

    monthDates.forEach(date => {
      const dateKey = date.toISOString();

      ['A', 'B', 'C'].forEach(shift => {
        const shiftEmployees = availableEmployees
          .filter(emp => schedule[emp.id][dateKey] === shift)
          .map(emp => emp.id);

        shiftEmployees.sort((a, b) =>
          (employeeStandbyCount[a] || 0) - (employeeStandbyCount[b] || 0)
        );

        const toAssign = Math.min(this.standbyPerShift, shiftEmployees.length);
        for (let i = 0; i < toAssign; i++) {
          const empId = shiftEmployees[i];
          if ((employeeStandbyCount[empId] || 0) < 3) {
            schedule[empId][dateKey] = `STANDBY_${shift}`;
            employeeStandbyCount[empId] = (employeeStandbyCount[empId] || 0) + 1;
          }
        }
      });
    });
  }

  generateSummary(schedule, monthDates) {
    const summary = {
      totalEmployees: this.employees.length,
      totalDays: monthDates.length,
      dailyCoverage: [],
      employeeStats: {}
    };

    monthDates.forEach(date => {
      const dateKey = date.toISOString();
      const coverage = { date: date.toISOString().split('T')[0], A: 0, B: 0, C: 0, OFF: 0, VACATION: 0 };

      Object.values(schedule).forEach(empSchedule => {
        const assignment = empSchedule[dateKey];
        if (assignment === 'A' || assignment === 'B' || assignment === 'C') {
          coverage[assignment]++;
        } else if (assignment === 'OFF') {
          coverage.OFF++;
        } else if (assignment === 'VACATION') {
          coverage.VACATION++;
        }
      });

      summary.dailyCoverage.push(coverage);
    });

    this.employees.forEach(employee => {
      const empSchedule = schedule[employee.id];
      const stats = { A: 0, B: 0, C: 0, OFF: 0, VACATION: 0, STANDBY: 0 };

      Object.values(empSchedule).forEach(assignment => {
        if (assignment.startsWith('STANDBY_')) {
          stats.STANDBY++;
        } else if (stats.hasOwnProperty(assignment)) {
          stats[assignment]++;
        }
      });

      summary.employeeStats[employee.id] = stats;
    });

    return summary;
  }
}
