const fs = require('fs');
const path = require('path');

console.log('🔧 Recreating .env.local file...');

// Delete the corrupted file
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.unlinkSync(envPath);
  console.log('✅ Deleted corrupted .env.local file');
}

// Create new file with proper UTF-8 encoding
const envContent = `# SoundBridge Environment Variables
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Development settings
NODE_ENV=development

# =============================================================================
# HOW TO GET YOUR SUPABASE KEYS:
# =============================================================================
# 1. Go to https://supabase.com/dashboard
# 2. Select your project
# 3. Go to Settings → API
# 4. Copy the Project URL (NEXT_PUBLIC_SUPABASE_URL)
# 5. Copy the anon public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
# 6. Copy the service_role key (SUPABASE_SERVICE_ROLE_KEY)
# =============================================================================

# IMPORTANT NOTES:
# - No spaces around the = sign
# - No quotes around the values
# - File must be saved as UTF-8 encoding
# - Restart your development server after editing this file
`;

// Write with explicit UTF-8 encoding
fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });

console.log('✅ Created new .env.local file with UTF-8 encoding');
console.log('📝 Please edit the file and add your actual Supabase credentials');
console.log('🔄 Restart your development server after editing the file');

// Verify the file was created correctly
const fileContent = fs.readFileSync(envPath, 'utf8');
console.log('\n📋 File verification:');
console.log('   Size:', fileContent.length, 'characters');
console.log('   First line:', fileContent.split('\n')[0]);
console.log('   Contains SUPABASE:', fileContent.includes('SUPABASE'));
console.log('   Encoding test:', fileContent.includes('') ? '❌ Corrupted' : '✅ Clean'); 