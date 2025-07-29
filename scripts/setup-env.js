#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 SoundBridge Environment Setup');
console.log('================================\n');

// Check if .env.local already exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('⚠️  .env.local already exists!');
  console.log('   If you want to recreate it, delete the existing file first.\n');
  
  // Read and display current content (without values for security)
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    console.log('📋 Current .env.local variables:');
    lines.forEach(line => {
      if (line.includes('=')) {
        const [key] = line.split('=');
        const isSet = line.split('=')[1] && line.split('=')[1].trim() !== '';
        console.log(`   ${key}: ${isSet ? '✅ Set' : '❌ Empty'}`);
      }
    });
  } catch (error) {
    console.log('   Could not read existing .env.local file');
  }
} else {
  console.log('📝 Creating .env.local template...');
  
  const template = `# SoundBridge Environment Variables
# Add your Supabase credentials below

# Supabase Configuration (REQUIRED)
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
# - Restart your development server after editing this file
`;

  try {
    fs.writeFileSync(envPath, template);
    console.log('✅ Created .env.local template');
    console.log('📝 Please edit the file and add your actual Supabase credentials');
    console.log('🔄 Restart your development server after editing the file');
  } catch (error) {
    console.error('❌ Failed to create .env.local:', error.message);
  }
}

console.log('\n🔗 Useful links:');
console.log('   Supabase Dashboard: https://supabase.com/dashboard');
console.log('   Environment Setup Guide: ENVIRONMENT_SETUP.md');
console.log('   Test API Route: http://localhost:3000/api/test-db');
console.log('   Debug API Route: http://localhost:3000/api/debug-env');

console.log('\n📋 Next steps:');
console.log('   1. Edit .env.local with your Supabase credentials');
console.log('   2. Restart your development server');
console.log('   3. Test the API route: http://localhost:3000/api/test-db');
console.log('   4. Check debug info: http://localhost:3000/api/debug-env'); 