const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create departments
  const operations = await prisma.department.create({
    data: { name: 'Operations' }
  });

  const maintenance = await prisma.department.create({
    data: { name: 'Maintenance' }
  });

  // Create sample employees
  for (let i = 1; i <= 100; i++) {
    await prisma.employee.create({
      data: {
        employeeId: `EMP${String(i).padStart(4, '0')}`,
        name: `Employee ${i}`,
        departmentId: i % 2 === 0 ? operations.id : maintenance.id,
        position: 'Staff'
      }
    });
  }

  console.log('Seeded 100 employees');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
