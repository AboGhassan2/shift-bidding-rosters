// pages/api/employees/seed.js
import { prisma } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create departments first
    const departments = await Promise.all([
      prisma.department.create({ data: { name: 'Operations' } }),
      prisma.department.create({ data: { name: 'Station Staff' } }),
      prisma.department.create({ data: { name: 'Supervisors' } }),
      prisma.department.create({ data: { name: 'Maintenance' } })
    ]);

    // Create 100 sample employees
    const employees = [];
    for (let i = 1; i <= 100; i++) {
      const dept = departments[i % departments.length];
      employees.push({
        employeeId: `EMP${String(i).padStart(4, '0')}`,
        name: `Employee ${i}`,
        departmentId: dept.id,
        seniority: Math.floor(Math.random() * 20) + 1
      });
    }

    await prisma.employee.createMany({ data: employees });

    const count = await prisma.employee.count();

    return res.status(200).json({
      success: true,
      message: `Created ${employees.length} employees`,
      totalEmployees: count
    });

  } catch (error) {
    console.error('Seeding error:', error);
    return res.status(500).json({
      error: 'Failed to seed employees',
      details: error.message
    });
  }
}
