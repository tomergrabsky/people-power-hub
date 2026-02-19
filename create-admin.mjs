import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sqltlgznpbwoopddngzy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbHRsZ3pucGJ3b29wZGRuZ3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQzMTY4NCwiZXhwIjoyMDg3MDA3Njg0fQ.FIjTjvbp4K3IaG5cTda50f0EtQ5SOaE5II_T4BsVfOk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const userId = '48134f1d-9887-4406-8d52-9d412e785599';

    const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'super_admin' })
        .eq('user_id', userId);

    if (roleError) {
        console.error("Error setting role:", roleError);
    } else {
        console.log("Role updated successfully to super_admin!");
    }
}

main();
