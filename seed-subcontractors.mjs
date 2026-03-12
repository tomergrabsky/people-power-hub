import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const SUBCONTRACTORS = [
    "product go",
    "אינפיניטי",
    "עצמאי",
    "sqlink",
    "אחר",
    "לא רלוונטי"
];

async function seedSubcontractors() {
    console.log("Seeding subcontractors/plans...");
    const collectionRef = db.collection('projects');
    
    for (const name of SUBCONTRACTORS) {
        const query = await collectionRef.where('name', '==', name).get();
        if (query.empty) {
            await collectionRef.add({
                name: name,
                description: "נוסף באופן אוטומטי",
                created_at: new Date().toISOString()
            });
            console.log(`✅ Added: ${name}`);
        } else {
            console.log(`ℹ️ Already exists: ${name}`);
        }
    }
    console.log("Done!");
}

seedSubcontractors().catch(console.error);
