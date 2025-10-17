// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx'); // Import the xlsx library

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  try {
    // --- 1. Read the Excel File ---
    const excelFilePath = 'C:\\Users\\a_abd\\PyCharmMiscProject\\generate_employee_list.xlsx'; // Use the provided path
    console.log(`Reading Excel file from: ${excelFilePath}`);

    // Read the workbook
    const workbook = XLSX.readFile(excelFilePath);

    // Assuming the data is in the first sheet, get its name
    const firstSheetName = workbook.SheetNames[0];
    console.log(`Using sheet: ${firstSheetName}`);

    // Get the worksheet
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert the worksheet to JSON (array of objects)
    const excelData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${excelData.length} rows in the Excel file.`);

    if (excelData.length === 0) {
      console.log('No data found in the Excel file. Skipping database update.');
      return; // Exit if no data
    }

    // --- 2. Prepare Data for Database Insertion ---
    // Map the Excel columns to your Prisma Employee model fields
    const employeesToCreate = excelData.map(row => {
      // Combine First Name and Last Name if your Employee model has a single 'name' field
      // Adjust the mapping based on your exact Prisma schema
      const fullName = `${row['First Name']} ${row['Last Name']}`.trim();

      return {
        employeeId: row['Emp. ID'].toString(), // Ensure it's a string if your schema requires it
        name: fullName, // Or just row['First Name'], row['Last Name'] separately if you have those fields
        department: row['Department'], // Map to the correct field name in your schema
        // Add other fields if your Employee model has them (e.g., position, email)
        // position: row['SomePositionColumn'] || 'Staff', // Example with default
      };
    });

    console.log(`Prepared ${employeesToCreate.length} employee records for database insertion.`);

    // --- 3. Insert/Update Data in the Database ---
    // Option A: Delete existing employees and insert new ones (Clears old data)
    // console.log('Deleting existing employees...');
    // await prisma.employee.deleteMany({});

    // Option B: Upsert employees (Update if exists by ID, Create if not)
    // This is generally safer if you have related data (like Bids, Assignments)
    console.log('Upserting employee records...');
    for (const employeeData of employeesToCreate) {
      await prisma.employee.upsert({
        where: { employeeId: employeeData.employeeId }, // Use employeeId as the unique field
        update: {
          // Only update fields that might have changed
          name: employeeData.name,
          department: employeeData.department,
          // Add other fields to update if necessary
        },
        create: employeeData, // Create the record if it doesn't exist
      });
    }
    console.log(`Upserted ${employeesToCreate.length} employee records.`);

    // Option C: Create many (if you are sure there are no duplicates and no related data will be affected)
    // console.log('Creating new employee records...');
    // await prisma.employee.createMany({
    //   data: employeesToCreate,
    //   skipDuplicates: true, // Skip if an employee with the same 'employeeId' already exists
    // });
    // console.log(`Created/ignored ${employeesToCreate.length} employee records.`);


    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('An error occurred during seeding:', error);
    process.exit(1); // Exit with an error code
  } finally {
    await prisma.$disconnect(); // Disconnect the Prisma client
  }
}

main()
  .then(async () => {
    console.log('Seeding finished.');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
