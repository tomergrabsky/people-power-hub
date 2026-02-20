import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, 'service-account.json');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

async function setAdmin() {
    try {
        const listUsersResult = await auth.listUsers(10);
        const users = listUsersResult.users;

        if (users.length === 0) {
            console.log("No users found in Firebase Auth. Please sign up first.");
            return;
        }

        console.log("Users found:");
        users.forEach(u => console.log(`- API UID: ${u.uid} | Email: ${u.email}`));

        // Set the first user to super_admin as default
        const targetUser = users[0];

        await db.collection('user_roles').doc(targetUser.uid).set({
            role: 'super_admin'
        }, { merge: true });

        console.log(`\n✅ Successfully set user ${targetUser.email} (UID: ${targetUser.uid}) to super_admin in user_roles collection.`);

    } catch (e) {
        console.error("Error setting admin:", e);
    }
}

setAdmin();
