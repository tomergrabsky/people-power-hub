import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

// הגדרות Firebase - הסקריפט ימשוך אותן ממשתני הסביבה בתוך GitHub
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    console.log("🚀 מתחיל תהליך גיבוי...");
    const backupData = {
        timestamp: new Date().toISOString(),
        collections: {}
    };

    try {
        for (const colName of collectionsToBackup) {
            console.log(`📦 קורא נתונים מקולקציית: ${colName}...`);
            const querySnapshot = await getDocs(collection(db, colName));
            backupData.collections[colName] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;
        const dir = './backups';
        
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        
        fs.writeFileSync(path.join(dir, fileName), JSON.stringify(backupData, null, 2));
        console.log(`✅ הגיבוי הושלם בהצלחה ונשמר כקובץ: ${fileName}`);
    } catch (error) {
        console.error("❌ שגיאה במהלך הגיבוי:", error);
        process.exit(1);
    }
}

runBackup();
