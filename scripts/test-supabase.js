const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vljdthpanckrahdmddqc.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsamR0aHBhbmNrcmFoZG1kZHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgwODYsImV4cCI6MjA4MzY4NDA4Nn0.K4-zPKzNUL7HJkgPSfk2umVeJWD3PYW9p-w9t5K8xMk';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('Testing connection to', supabaseUrl);

    // Try a simple select
    const { data: profiles, error: selectError } = await supabase
        .from('user_profiles')
        .select('id,email')
        .limit(1);

    if (selectError) {
        console.error('Select error:', selectError);
    } else {
        console.log('Select OK, sample:', profiles);
    }

    // Try an insert with a generated UUID id (won't conflict)
    let testId;
    try {
        testId = require('crypto').randomUUID();
    } catch (e) {
        testId = `test_${Date.now()}`;
    }
    const { data: insertData, error: insertError } = await supabase
        .from('user_profiles')
        .insert({ id: testId, email: `${testId}@example.com` });

    if (insertError) {
        console.error('Insert error:', insertError);
    } else {
        console.log('Insert OK:', insertData);

        // Cleanup: delete the test row
        const { error: deleteError } = await supabase.from('user_profiles').delete().eq('id', testId);
        if (deleteError) console.error('Cleanup delete error:', deleteError);
        else console.log('Cleanup OK');
    }
}

run().catch((e) => console.error(e));