#!/usr/bin/env node

/**
 * Get Wise Webhook Subscription ID
 * 
 * Lists all webhook subscriptions for your profile
 * 
 * Usage:
 *   node scripts/get-wise-webhook-id.js
 * 
 * Environment Variables Required:
 *   - WISE_API_TOKEN: Your Wise API token
 *   - WISE_PROFILE_ID: Your Wise profile ID (optional, defaults to 81429203)
 */

const https = require('https');

// Get environment variables
const API_TOKEN = process.env.WISE_API_TOKEN;
const PROFILE_ID = process.env.WISE_PROFILE_ID || '81429203';

if (!API_TOKEN) {
  console.error('❌ Error: WISE_API_TOKEN environment variable is required');
  console.error('');
  console.error('Please set it before running this script:');
  console.error('  export WISE_API_TOKEN=your-token-here');
  console.error('  node scripts/get-wise-webhook-id.js');
  process.exit(1);
}

// Get webhook subscriptions
const options = {
  hostname: 'api.wise.com',
  port: 443,
  path: `/v3/profiles/${PROFILE_ID}/subscriptions`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'SoundBridge-Webhook-Getter/1.0',
  },
};

console.log('📡 Fetching Wise webhook subscriptions...');
console.log('');
console.log('Configuration:');
console.log(`  Profile ID: ${PROFILE_ID}`);
console.log('');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const subscriptions = JSON.parse(data);
        
        if (!subscriptions || subscriptions.length === 0) {
          console.log('❌ No webhook subscriptions found');
          process.exit(1);
        }

        console.log('✅ Found webhook subscriptions:');
        console.log('');

        subscriptions.forEach((sub, index) => {
          console.log(`Webhook ${index + 1}:`);
          console.log(`  ID: ${sub.id}`);
          console.log(`  Name: ${sub.name || 'N/A'}`);
          console.log(`  URL: ${sub.delivery?.url || 'N/A'}`);
          console.log(`  Active: ${sub.active ? 'Yes' : 'No'}`);
          console.log(`  Created: ${sub.created_time || 'N/A'}`);
          console.log('');
        });

        // Find SoundBridge webhook
        const soundbridgeWebhook = subscriptions.find(sub => 
          sub.name && sub.name.toLowerCase().includes('soundbridge')
        ) || subscriptions.find(sub =>
          sub.delivery?.url && sub.delivery.url.includes('soundbridge')
        );

        if (soundbridgeWebhook) {
          console.log('🎯 SoundBridge Webhook Found:');
          console.log(`  Subscription ID: ${soundbridgeWebhook.id}`);
          console.log('');
          console.log('🔐 Add this to your Vercel environment variables:');
          console.log(`  WISE_WEBHOOK_SUBSCRIPTION_ID=${soundbridgeWebhook.id}`);
        } else {
          console.log('💡 Copy the ID from one of the webhooks above');
          console.log('   and add it to Vercel as:');
          console.log('   WISE_WEBHOOK_SUBSCRIPTION_ID=<id>');
        }

      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data);
        process.exit(1);
      }
    } else {
      console.error(`❌ Failed to fetch webhooks (Status: ${res.statusCode})`);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.end();

