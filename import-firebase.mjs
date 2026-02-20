import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// You will need to download your Firebase Service Account Key JSON
// from the Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
// and save it as "service-account.json" in the root directory.
const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Cannot find service-account.json");
    console.error("Please download it from Firebase Console -> Project Settings -> Service Accounts");
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
const CSV_DIR = path.join(__dirname, 'csv-import');

const IMPORT_ORDER = [
    { table: 'branches', skip: false },
    { table: 'employing_companies', skip: false },
    { table: 'seniority_levels', skip: false },
    { table: 'leaving_reasons', skip: false },
    { table: 'job_roles', skip: false },
    { table: 'projects', skip: false },
    { table: 'employees', skip: false },
];

function parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = parseLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length === 0) continue;

        const row = {};
        headers.forEach((h, idx) => {
            let val = values[idx] ?? '';
            if (val === '') val = null;
            if (val !== null && /^-?\d+(\.\d+)?$/.test(val)) val = Number(val);
            if (val === 'true') val = true;
            if (val === 'false') val = false;
            row[h] = val;
        });
        rows.push(row);
    }
    return rows;
}

function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ';' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function findCSVFile(tableName) {
    const files = fs.readdirSync(CSV_DIR);
    const match = files.find(f => f.startsWith(tableName + '-export') && f.endsWith('.csv'));
    return match ? path.join(CSV_DIR, match) : null;
}

async function insertRows(collectionName, rows) {
    if (rows.length === 0) return { count: 0 };

    const batch = db.batch();
    const collectionRef = db.collection(collectionName);

    // Convert array fields or fix id naming
    rows.forEach(row => {
        let docId = row.id;
        // Don't save undefined values
        Object.keys(row).forEach(key => row[key] === undefined && delete row[key]);
        const docRef = docId ? collectionRef.doc(docId) : collectionRef.doc();
        batch.set(docRef, row, { merge: true });
    });

    await batch.commit();
    return { count: rows.length };
}

async function importCollection(config) {
    const { table, skip } = config;
    if (skip) return;

    const csvFile = findCSVFile(table);
    if (!csvFile) {
        console.log(`\n⚠️  ${table}: CSV file not found`);
        return;
    }

    console.log(`\n📄 Importing to Firestore Collection: ${table}`);
    const content = fs.readFileSync(csvFile, 'utf-8');
    const rows = parseCSV(content);

    if (rows.length === 0) {
        console.log(`   ℹ️  No rows found in CSV`);
        return;
    }

    const { count } = await insertRows(table, rows);
    console.log(`   ✅ Successfully imported ${count} documents`);
}

async function main() {
    console.log("==============================================");
    console.log("  People Power Hub - FIREBASE Import Script   ");
    console.log("==============================================");
    for (const config of IMPORT_ORDER) {
        await importCollection(config);
    }
    console.log("==============================================");
    console.log("  ✅ Firebase Import complete!                ");
    console.log("==============================================");
}

main().catch(console.error);
