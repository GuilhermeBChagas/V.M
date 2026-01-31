
const { createClient } = require('@supabase/supabase-client');
const fs = require('fs');

// Read supabase creds from some file if possible, or just look at supabaseClient.ts
const supabaseUrl = 'https://tonkhlnwlmtcuaiczytn.supabase.co';
// I need the key. It's usually in services/supabaseClient.ts
const content = fs.readFileSync('c:/Users/Guilherme/Downloads/registro-de-alterações/services/supabaseClient.ts', 'utf8');
const keyMatch = content.match(/const supabaseKey = ['"]([^'"]+)['"]/);
const supabaseKey = keyMatch ? keyMatch[1] : null;

if (!supabaseKey) {
    console.error('Could not find supabaseKey');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data, error } = await supabase.from('vehicles').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log('Columns in vehicles table:', Object.keys(data[0] || {}));
    }
}

inspect();
