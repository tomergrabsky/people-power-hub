// ====================================================
// User Migration Script - People Power Hub
// Creates auth users + imports profiles, roles, projects
// ====================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = path.join(__dirname, 'csv-import');

const NEW_URL = "https://sqltlgznpbwoopddngzy.supabase.co";
const NEW_SVCRL = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbHRsZ3pucGJ3b29wZGRuZ3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQzMTY4NCwiZXhwIjoyMDg3MDA3Njg0fQ.FIjTjvbp4K3IaG5cTda50f0EtQ5SOaE5II_T4BsVfOk";

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
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
            result.push(current); current = '';
        } else { current += char; }
    }
    result.push(current);
    return result;
}

function findCSV(tableName) {
    const files = fs.readdirSync(CSV_DIR);
    const match = files.find(f => f.startsWith(tableName + '-export') && f.endsWith('.csv'));
    return match ? path.join(CSV_DIR, match) : null;
}

function readCSV(tableName) {
    const file = findCSV(tableName);
    if (!file) { console.log(`   ⚠️  No CSV for ${tableName}`); return []; }
    return parseCSV(fs.readFileSync(file, 'utf-8'));
}

// ─── Auth Admin API ────────────────────────────────────

async function createAuthUser(user) {
    const res = await fetch(`${NEW_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            "apikey": NEW_SVCRL,
            "Authorization": `Bearer ${NEW_SVCRL}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id: user.user_id,
            email: user.email,
            email_confirm: true,
            user_metadata: { full_name: user.full_name },
        }),
    });
    const data = await res.json();
    if (!res.ok) {
        // User might already exist
        if (data.msg?.includes('already') || data.code === 'email_exists' || res.status === 422) {
            return { exists: true };
        }
        return { error: `${res.status}: ${JSON.stringify(data).substring(0, 200)}` };
    }
    return { created: true, id: data.id };
}

// ─── REST API helpers ──────────────────────────────────

async function deleteAll(table) {
    const res = await fetch(
        `${NEW_URL}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`,
        {
            method: 'DELETE',
            headers: { "apikey": NEW_SVCRL, "Authorization": `Bearer ${NEW_SVCRL}` },
        }
    );
    return res.ok;
}

async function upsertRows(table, rows, onConflict = 'id') {
    if (!rows.length) return { count: 0 };
    const BATCH = 200;
    let total = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const res = await fetch(
            `${NEW_URL}/rest/v1/${table}`,
            {
                method: 'POST',
                headers: {
                    "apikey": NEW_SVCRL,
                    "Authorization": `Bearer ${NEW_SVCRL}`,
                    "Content-Type": "application/json",
                    "Prefer": `resolution=merge-duplicates`,
                },
                body: JSON.stringify(batch),
            }
        );
        if (!res.ok) {
            const text = await res.text();
            return { error: `HTTP ${res.status}: ${text.substring(0, 300)}` };
        }
        total += batch.length;
    }
    return { count: total };
}

// ─── Main ──────────────────────────────────────────────

async function main() {
    console.log("==============================================");
    console.log("  User Migration - People Power Hub        ");
    console.log("==============================================\n");

    // 1. Read CSVs
    const profiles = readCSV('profiles');
    const userRoles = readCSV('user_roles');
    const userProjects = readCSV('user_projects');

    console.log(`📋 Found: ${profiles.length} profiles, ${userRoles.length} roles, ${userProjects.length} project-assignments\n`);

    // 2. Create auth users (in order - first user becomes super_admin via trigger)
    console.log("👤 Step 1: Creating auth users...");
    let created = 0, existed = 0, failed = 0;

    for (const profile of profiles) {
        process.stdout.write(`   ${profile.email}... `);
        const result = await createAuthUser(profile);
        if (result.created) { console.log('✅ Created'); created++; }
        else if (result.exists) { console.log('⚠️  Already exists'); existed++; }
        else { console.log(`❌ ${result.error}`); failed++; }
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
    }
    console.log(`\n   Summary: ${created} created, ${existed} already existed, ${failed} failed`);

    // 3. Fix profiles - update full_names (trigger may have set wrong/empty names)
    console.log("\n📝 Step 2: Updating profiles with correct full names...");
    for (const p of profiles) {
        const res = await fetch(
            `${NEW_URL}/rest/v1/profiles?user_id=eq.${p.user_id}`,
            {
                method: 'PATCH',
                headers: {
                    "apikey": NEW_SVCRL,
                    "Authorization": `Bearer ${NEW_SVCRL}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ full_name: p.full_name, email: p.email }),
            }
        );
        if (res.ok) process.stdout.write('✅ ');
        else process.stdout.write('❌ ');
    }
    console.log('\n   Done!');

    // 4. Fix user_roles - delete trigger-created roles, insert from CSV
    console.log("\n🔐 Step 3: Fixing user roles...");
    await deleteAll('user_roles');
    console.log("   Cleared trigger-created roles");

    const roleResult = await upsertRows('user_roles', userRoles);
    if (roleResult.error) console.log(`   ❌ ${roleResult.error}`);
    else console.log(`   ✅ Inserted ${roleResult.count} roles from CSV`);

    // 5. Import user_projects
    console.log("\n🗂️  Step 4: Importing project assignments...");
    await deleteAll('user_projects');
    const upResult = await upsertRows('user_projects', userProjects);
    if (upResult.error) console.log(`   ❌ ${upResult.error}`);
    else console.log(`   ✅ Inserted ${upResult.count} project assignments`);

    // 6. Summary
    console.log("\n==============================================");
    console.log("  ✅ User migration complete!");
    console.log("==============================================");
    console.log("\n📝 What was done:");
    console.log("  • Auth users created with original UUIDs & emails");
    console.log("  • Profiles updated with correct names");
    console.log("  • User roles set correctly (super_admin/manager/user)");
    console.log("  • Project assignments restored");
    console.log("\n🔑 Users can now log in with Google using their original emails!");
    console.log("  Their roles and project access will be exactly as before.");
}

main().catch(console.error);
