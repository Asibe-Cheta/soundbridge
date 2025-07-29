#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing .env.local file encoding...');
console.log('=====================================\n');

const envPath = path.join(process.cwd(), '.env.local');
const backupPath = path.join(process.cwd(), '.env.local.backup');

try {
  // Check if file exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found!');
    console.log('   Please create the file first using: node scripts/setup-env.js');
    process.exit(1);
  }

  // Create backup
  console.log('📋 Creating backup...');
  fs.copyFileSync(envPath, backupPath);
  console.log('✅ Backup created: .env.local.backup');

  // Read the corrupted file with different encodings
  console.log('\n🔍 Reading file with different encodings...');
  
  let content = '';
  let encoding = '';
  
  // Try different encodings
  const encodings = ['utf8', 'utf16le', 'latin1', 'ascii'];
  
  for (const enc of encodings) {
    try {
      const testContent = fs.readFileSync(envPath, enc);
      // Check if it looks like valid env file content
      if (testContent.includes('=') && testContent.includes('SUPABASE')) {
        content = testContent;
        encoding = enc;
        console.log(`✅ Successfully read with ${enc} encoding`);
        break;
      }
    } catch (e) {
      console.log(`❌ Failed to read with ${enc} encoding`);
    }
  }

  if (!content) {
    console.log('❌ Could not read file with any encoding!');
    console.log('   Please check the file manually.');
    process.exit(1);
  }

  // Parse and clean the content
  console.log('\n🧹 Cleaning content...');
  
  // Split into lines and clean each line
  const lines = content.split('\n').map(line => {
    // Remove null characters and other encoding artifacts
    return line.replace(/\u0000/g, '').trim();
  }).filter(line => {
    // Keep only valid environment variable lines
    return line && line.includes('=') && !line.startsWith('#');
  });

  // Create new content
  const newContent = lines.join('\n') + '\n';
  
  console.log(`📝 Found ${lines.length} valid environment variables:`);
  lines.forEach(line => {
    const [key] = line.split('=');
    console.log(`   ${key}`);
  });

  // Write the fixed file
  console.log('\n💾 Writing fixed file...');
  fs.writeFileSync(envPath, newContent, 'utf8');
  
  console.log('✅ .env.local file fixed!');
  console.log('🔄 Please restart your development server');
  
  console.log('\n📋 Next steps:');
  console.log('   1. Restart your development server: npm run dev');
  console.log('   2. Test the API route: http://localhost:3000/api/test-db');
  console.log('   3. If issues persist, check the backup file: .env.local.backup');

} catch (error) {
  console.error('❌ Error fixing .env.local file:', error.message);
  console.log('\n📋 Manual fix instructions:');
  console.log('   1. Open .env.local in a text editor');
  console.log('   2. Save it as UTF-8 encoding');
  console.log('   3. Make sure there are no BOM characters at the start');
  console.log('   4. Ensure each variable is on its own line');
  console.log('   5. Restart your development server');
} 