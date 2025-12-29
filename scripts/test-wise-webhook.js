#!/usr/bin/env node

/**
 * Test Wise Webhook Subscription
 * 
 * This script sends a test notification to a Wise webhook subscription.
 * 
 * Usage:
 *   node scripts/test-wise-webhook.js <subscription-id>
 * 
 * Environment Variables Required:
 *   - WISE_API_TOKEN: Your Wise API token
 *   - WISE_PROFILE_ID: Your Wise profile ID (optional, defaults to 81429203)
 * 
 * Example:
 *   node scripts/test-wise-webhook.js abc-123-def-456
 */

const https = require('https');

// Get command line arguments
const subscriptionId = process.argv[2];

if (!subscriptionId) {
  console.error('❌ Error: Subscription ID is required');
  console.error('');
  console.error('Usage:');
  console.error('  node scripts/test-wise-webhook.js <subscription-id>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/test-wise-webhook.js abc-123-def-456');
  process.exit(1);
}

// Get environment variables
const API_TOKEN = process.env.WISE_API_TOKEN;
const PROFILE_ID = process.env.WISE_PROFILE_ID || '81429203';

if (!API_TOKEN) {
  console.error('❌ Error: WISE_API_TOKEN environment variable is required');
  console.error('');
  console.error('Please set it before running this script:');
  console.error('  export WISE_API_TOKEN=your-token-here');
  console.error('  node scripts/test-wise-webhook.js ' + subscriptionId);
  process.exit(1);
}

// Send test notification
const options = {
  hostname: 'api.wise.com',
  port: 443,
  path: `/v3/profiles/${PROFILE_ID}/subscriptions/${subscriptionId}/test-notifications`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'SoundBridge-Webhook-Tester/1.0',
  },
};

console.log('📡 Sending test notification to Wise webhook...');
console.log('');
console.log('Configuration:');
console.log(`  Profile ID: ${PROFILE_ID}`);
console.log(`  Subscription ID: ${subscriptionId}`);
console.log('');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
      console.log('✅ Test notification sent successfully!');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('  1. Check your Vercel logs for the webhook event');
      console.log('  2. Look for: "Wise webhook POST request received"');
      console.log('  3. Verify the webhook was processed correctly');
      console.log('');
      if (data) {
        try {
          const response = JSON.parse(data);
          console.log('Response:', JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('Response:', data);
        }
      }
    } else {
      console.error(`❌ Failed to send test notification (Status: ${res.statusCode})`);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(JSON.stringify({}));
req.end();

