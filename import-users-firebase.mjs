import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

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

const auth = getAuth();
const db = getFirestore();
const CSV_DIR = path.join(__dirname, 'csv-import');

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

async function migrateUsers() {
    console.log("==============================================");
    console.log("  People Power Hub - FIREBASE Users Import    ");
    console.log("==============================================");

    const profilesFile = findCSVFile('profiles');
    const rolesFile = findCSVFile('user_roles');
    const projectsFile = findCSVFile('user_projects');

    if (!profilesFile) {
        console.error("No profiles CSV found!");
        return;
    }

    const profilesData = parseCSV(fs.readFileSync(profilesFile, 'utf8'));
    const rolesData = rolesFile ? parseCSV(fs.readFileSync(rolesFile, 'utf8')) : [];
    const projectsData = projectsFile ? parseCSV(fs.readFileSync(projectsFile, 'utf8')) : [];

    console.log(`Found ${profilesData.length} profiles to import.`);

    let successCount = 0;

    // Check existing auth users to avoid duplicates
    let existingAuthUsers = [];
    try {
        const listUsersResult = await auth.listUsers();
        existingAuthUsers = listUsersResult.users;
    } catch (e) {
        console.error("Could not fetch user list", e);
    }

    const mapOldUserToNewUid = {};

    // 1. Create Auth Users and Profiles
    for (const profile of profilesData) {
        if (!profile.email) continue;
        const email = profile.email.toLowerCase();

        let firebaseUser = existingAuthUsers.find(u => u.email === email);

        if (!firebaseUser) {
            try {
                // generate random password
                const randomPassword = crypto.randomBytes(8).toString('hex') + 'A1!';
                firebaseUser = await auth.createUser({
                    email: email,
                    password: randomPassword,
                    displayName: profile.full_name || '',
                });
                console.log(`Created Auth User: ${email}`);
            } catch (error) {
                console.error(`Failed to create auth user ${email}:`, error.message);
                continue;
            }
        } else {
            console.log(`Auth User already exists: ${email}`);
        }

        const uid = firebaseUser.uid;
        mapOldUserToNewUid[profile.user_id] = uid; // Map Supabase user_id to Firebase uid

        // Write to `profiles` collection using UID
        await db.collection('profiles').doc(uid).set({
            user_id: uid,
            email: email,
            full_name: profile.full_name || '',
            created_at: profile.created_at || new Date().toISOString()
        }, { merge: true });

        successCount++;
    }

    // 2. Migrate User Roles
    console.log("\nMigrating Roles...");
    let rolesCount = 0;
    for (const role of rolesData) {
        const uid = mapOldUserToNewUid[role.user_id];
        if (uid) {
            await db.collection('user_roles').doc(uid).set({
                role: role.role || 'user'
            }, { merge: true });
            rolesCount++;
        }
    }
    console.log(`Migrated ${rolesCount} roles.`);

    // 3. Migrate User Projects
    console.log("\nMigrating User Projects...");
    let projectsCount = 0;

    // we need to delete existing user_projects first, to prevent duplicates on rerun
    const upSnap = await db.collection('user_projects').get();
    const batchDelete = db.batch();
    upSnap.docs.forEach(doc => batchDelete.delete(doc.ref));
    await batchDelete.commit();

    // insert new
    const batchInsert = db.batch();
    for (const userProject of projectsData) {
        const uid = mapOldUserToNewUid[userProject.user_id];
        if (uid && userProject.project_id) {
            const docRef = db.collection('user_projects').doc();
            batchInsert.set(docRef, {
                user_id: uid,
                project_id: userProject.project_id
            });
            projectsCount++;
        }
    }
    await batchInsert.commit();
    console.log(`Migrated ${projectsCount} user projects.`);

    console.log("\n==============================================");
    console.log(`  ✅ Successfully processed ${successCount} users!`);
    console.log("  Note: Passwords were automatically generated.");
    console.log("  Users will need to reset their passwords to login (if they didn't sign up already).");
    console.log("==============================================");
}

migrateUsers().catch(console.error);
