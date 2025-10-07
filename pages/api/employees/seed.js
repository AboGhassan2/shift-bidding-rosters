// pages/api/employees/seed.js
const prisma = require('../../../lib/db');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Delete existing data (optional - remove if you want to keep existing data)
    await prisma.employee.deleteMany({});
    await prisma.department.deleteMany({});

    // Create departments
    const departments = await Promise.all([
      prisma.department.create({ data: { name: 'Operations' } }),
      prisma.department.create({ data: { name: 'Station Staff' } }),
      prisma.department.create({ data: { name: 'Supervisors' } }),
      prisma.department.create({ data: { name: 'Maintenance' } })
    ]);

    console.log('Created departments:', departments.length);

    // Create 100 sample employees
    const employees = [];
    for (let i = 1; i <= 100; i++) {
      const dept = departments[i % departments.length];
      employees.push(
        prisma.employee.create({
          data: {
            employeeId: `EMP${String(i).padStart(4, '0')}`,
            name: `Employee ${i}`,
            departmentId: dept.id,
            position: i % 10 === 0 ? 'Senior' : 'Staff'
          }
        })
      );
    }

    await Promise.all(employees);

    const count = await prisma.employee.count();

    return res.status(200).json({
      success: true,
      message: `Successfully seeded database with ${count} employees`,
      departments: departments.length,
      employees: count
    });

  } catch (error) {
    console.error('Seeding error:', error);
    return res.status(500).json({
      error: 'Failed to seed employees',
      details: error.message
    });
  }
}
