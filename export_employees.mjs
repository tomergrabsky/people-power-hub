import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Cannot find service-account.json");
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function exportEmployees() {
    console.log("Fetching employees from Firestore...");
    const snapshot = await db.collection('employees').get();

    const employees = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        employees.push({
            'שם מלא': data.full_name || '',
            'תעודת זהות': data.id_number || '',
            'מספר טלפון': data.phone || ''
        });
    });

    console.log(`Found ${employees.length} employees (including those who left).`);

    const worksheet = XLSX.utils.json_to_sheet(employees);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

    const outputPath = path.join(__dirname, 'employees_export.xlsx');
    XLSX.writeFile(workbook, outputPath);

    console.log(`✅ Export complete! File saved to: ${outputPath}`);
}

exportEmployees().catch(err => {
    console.error("❌ Error during export:", err);
    process.exit(1);
});
