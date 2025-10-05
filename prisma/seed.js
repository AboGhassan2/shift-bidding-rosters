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

  const support = await prisma.department.create({
    data: { name: 'Support' }
  });

  // Create sample employees
  for (let i = 1; i <= 100; i++) {
    await prisma.employee.create({
      data: {
        employeeId: `EMP${String(i).padStart(4, '0')}`,
        name: `Employee ${i}`,
        departmentId: i % 3 === 0 ? operations.id : i % 3 === 1 ? maintenance.id : support.id,
        position: 'Staff'
      }
    });
  }

  console.log('✅ Seeded 100 employees in 3 departments');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
