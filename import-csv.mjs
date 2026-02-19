// ====================================================
// CSV Import Script - People Power Hub
// Reads CSV files and loads into NEW Supabase DB only
// ====================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NEW_URL = "https://sqltlgznpbwoopddngzy.supabase.co";
const NEW_SVCRL = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbHRsZ3pucGJ3b29wZGRuZ3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQzMTY4NCwiZXhwIjoyMDg3MDA3Njg0fQ.FIjTjvbp4K3IaG5cTda50f0EtQ5SOaE5II_T4BsVfOk";
const CSV_DIR = path.join(__dirname, 'csv-import');

// Import order: parents before children (FK dependencies)
const IMPORT_ORDER = [
    { table: 'branches', skip: false, note: '' },
    { table: 'employing_companies', skip: false, note: '' },
    { table: 'seniority_levels', skip: false, note: '' },
    { table: 'leaving_reasons', skip: false, note: '' },
    { table: 'job_roles', skip: false, note: '' },
    { table: 'projects', skip: false, note: '' },
    { table: 'employees', skip: false, note: '' },
    // The following tables depend on auth.users which must exist first
    { table: 'profiles', skip: true, note: 'Requires auth.users - users must sign up first' },
    { table: 'user_roles', skip: true, note: 'Requires auth.users - users must sign up first' },
    { table: 'user_projects', skip: true, note: 'Requires auth.users - users must sign up first' },
    { table: 'user_form_preferences', skip: true, note: 'Requires auth.users - users must sign up first' },
];

// Parse semicolon-separated CSV with quoted fields support
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
            // Convert empty strings to null
            if (val === '') val = null;
            // Parse numbers where applicable
            if (val !== null && /^-?\d+(\.\d+)?$/.test(val)) {
                val = Number(val);
            }
            // Parse booleans
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

async function deleteExistingRows(table) {
    // Clear existing rows in new DB (e.g. branches/employing_companies already imported)
    const res = await fetch(`${NEW_URL}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: {
            "apikey": NEW_SVCRL,
            "Authorization": `Bearer ${NEW_SVCRL}`,
        },
    });
    return res.ok;
}

async function insertRows(table, rows) {
    if (rows.length === 0) return { error: null, count: 0 };

    // Insert in batches of 500
    const BATCH = 500;
    let total = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const url = `${NEW_URL}/rest/v1/${table}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                "apikey": NEW_SVCRL,
                "Authorization": `Bearer ${NEW_SVCRL}`,
                "Content-Type": "application/json",
                "Prefer": "resolution=ignore-duplicates",
            },
            body: JSON.stringify(batch),
        });

        if (!res.ok) {
            const text = await res.text();
            return { error: `HTTP ${res.status}: ${text.substring(0, 300)}`, count: total };
        }
        total += batch.length;
    }

    return { error: null, count: total };
}

async function importTable(tableConfig) {
    const { table, skip, note } = tableConfig;

    if (skip) {
        console.log(`\n⏭️  Skipping ${table}`);
        console.log(`   Reason: ${note}`);
        return;
    }

    const csvFile = findCSVFile(table);
    if (!csvFile) {
        console.log(`\n⚠️  ${table}: CSV file not found`);
        return;
    }

    console.log(`\n📄 Importing: ${table}`);

    const content = fs.readFileSync(csvFile, 'utf-8');
    const rows = parseCSV(content);

    if (rows.length === 0) {
        console.log(`   ℹ️  No rows found in CSV`);
        return;
    }

    console.log(`   📊 Found ${rows.length} rows in CSV`);

    // Clear existing data first (to avoid duplicates from earlier partial imports)
    await deleteExistingRows(table);

    const { error, count } = await insertRows(table, rows);
    if (error) {
        console.log(`   ❌ Error: ${error}`);
    } else {
        console.log(`   ✅ Successfully imported ${count} rows`);
    }
}

async function main() {
    console.log("==============================================");
    console.log("  People Power Hub - CSV Import Script      ");
    console.log("==============================================");
    console.log(`  Target DB: ${NEW_URL}`);
    console.log(`  CSV Folder: ${CSV_DIR}`);
    console.log("==============================================");

    for (const tableConfig of IMPORT_ORDER) {
        await importTable(tableConfig);
    }

    console.log("\n==============================================");
    console.log("  ✅ Import complete!");
    console.log("==============================================");
    console.log("\n📝 Next steps:");
    console.log("  1. Sign up/log in to the NEW app at http://localhost:3001");
    console.log("  2. The first user to sign up automatically becomes super_admin");
    console.log("  3. Your employees, projects & all data are now in the new DB!");
    console.log("\n⚠️  Note: User accounts (profiles, roles) were NOT imported.");
    console.log("   Users need to create new accounts in the new system.");
    console.log("   The admin can then assign roles from the admin panel.");
}

main().catch(console.error);
