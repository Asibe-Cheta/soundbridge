#!/usr/bin/env node

/**
 * Create Wise Webhook Subscription
 * 
 * This script creates a webhook subscription in Wise via API.
 * 
 * Usage:
 *   node scripts/create-wise-webhook.js
 * 
 * Environment Variables Required:
 *   - WISE_API_TOKEN: Your Wise API token
 *   - WISE_PROFILE_ID: Your Wise profile ID
 * 
 * The webhook URL is hardcoded to:
 *   https://www.soundbridge.live/api/webhooks/wise
 */

const https = require('https');

// Get environment variables
const API_TOKEN = process.env.WISE_API_TOKEN;
const PROFILE_ID = process.env.WISE_PROFILE_ID || '81429203';
// Webhook URL - can be overridden via environment variable
// Default: /api/webhooks/wise (as specified in WEB_TEAM_WISE_SETUP_REQUIRED.md)
// Alternative: /wise-webhook (simpler path, also available)
// Try simpler path first (more likely to work with Wise validation)
// Can be overridden via environment variable
const WEBHOOK_URL = process.env.WISE_WEBHOOK_URL || 'https://www.soundbridge.live/wise-webhook';

if (!API_TOKEN) {
  console.error('❌ Error: WISE_API_TOKEN environment variable is required');
  console.error('');
  console.error('Please set it before running this script:');
  console.error('  export WISE_API_TOKEN=your-token-here');
  console.error('  node scripts/create-wise-webhook.js');
  process.exit(1);
}

// Webhook configuration
const webhookConfig = {
  name: 'SoundBridge Transfer Updates',
  trigger_on: 'transfers#state-change',
  delivery: {
    version: '2.0.0',
    url: WEBHOOK_URL,
  },
};

// Create webhook subscription
const options = {
  hostname: 'api.wise.com',
  port: 443,
  path: `/v3/profiles/${PROFILE_ID}/subscriptions`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'SoundBridge-Webhook-Creator/1.0',
  },
};

console.log('📡 Creating Wise webhook subscription...');
console.log('');
console.log('Configuration:');
console.log(`  Profile ID: ${PROFILE_ID}`);
console.log(`  Webhook URL: ${WEBHOOK_URL}`);
console.log(`  Event: ${webhookConfig.trigger_on}`);
console.log('');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        console.log('✅ Webhook subscription created successfully!');
        console.log('');
        console.log('Subscription Details:');
        console.log(`  ID: ${response.id}`);
        console.log(`  Name: ${response.name}`);
        console.log(`  Status: ${response.active ? 'Active' : 'Inactive'}`);
        console.log(`  URL: ${response.delivery?.url || WEBHOOK_URL}`);
        console.log('');
        console.log('🔐 IMPORTANT: Add this to your environment variables:');
        console.log(`  WISE_WEBHOOK_SUBSCRIPTION_ID=${response.id}`);
        console.log('');
        console.log('📝 Next Steps:');
        console.log('  1. Add WISE_WEBHOOK_SUBSCRIPTION_ID to your .env file');
        console.log('  2. Add WISE_WEBHOOK_SUBSCRIPTION_ID to Vercel environment variables');
        console.log('  3. Test the webhook with: node scripts/test-wise-webhook.js ' + response.id);
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
        console.log('Raw response:', data);
        process.exit(1);
      }
    } else {
      console.error(`❌ Failed to create webhook subscription (Status: ${res.statusCode})`);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(JSON.stringify(webhookConfig));
req.end();

