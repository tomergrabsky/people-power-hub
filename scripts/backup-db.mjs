import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Initialize with Service Account for administrative access (bypasses security rules)
// The service account JSON should be provided as a string in the environment variable
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKey) {
    console.error("❌ שגיאה: המפתח FIREBASE_SERVICE_ACCOUNT חסר בהגדרות ה-Secrets של GitHub.");
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey))
    });
} catch (error) {
    console.error("❌ שגיאה באתחול Firebase Admin:", error);
    process.exit(1);
}

const db = admin.firestore();

// רשימת הקולקציות שאנחנו רוצים לגבות
const collectionsToBackup = [
    'employees',
    'job_roles',
    'projects',
    'branches',
    'employing_companies',
    'seniority_levels',
    'leaving_reasons',
    'performance_levels',
    'profiles',
    'user_roles',
    'user_projects'
];

async function runBackup() {
    console.log("🚀 מתחיל תהליך גיבוי (Admin Mode)...");
    const backupData = {
        timestamp: new Date().toISOString(),
        collections: {}
    };

    try {
        for (const colName of collectionsToBackup) {
            console.log(`📦 קורא נתונים מקולקציית: ${colName}...`);
            const snapshot = await db.collection(colName).get();
            backupData.collections[colName] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;
        const dir = './backups';

        if (!fs.existsSync(dir)) fs.mkdirSync(dir);

        fs.writeFileSync(path.join(dir, fileName), JSON.stringify(backupData, null, 2));
        console.log(`✅ הגיבוי הושלם בהצלחה (באומצעות Admin SDK) ונשמר כקובץ: ${fileName}`);
    } catch (error) {
        console.error("❌ שגיאה במהלך הגיבוי:", error);
        process.exit(1);
    }
}

runBackup();
