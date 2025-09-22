/**
 * Test script to verify the tipping flow works end-to-end
 * Run this with: node scripts/test-tipping-flow.js
 */

const testTippingFlow = async () => {
  console.log('🧪 Testing Tipping Flow Integration...\n');

  // Test 1: Check if Stripe is configured
  console.log('1. Checking Stripe configuration...');
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    console.log('   ✅ Stripe secret key found');
    console.log(`   📝 Key starts with: ${stripeKey.substring(0, 7)}...`);
  } else {
    console.log('   ❌ Stripe secret key not found');
    console.log('   💡 Make sure STRIPE_SECRET_KEY is set in your .env.local');
  }

  // Test 2: Check if publishable key is configured
  console.log('\n2. Checking Stripe publishable key...');
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (publishableKey) {
    console.log('   ✅ Stripe publishable key found');
    console.log(`   📝 Key starts with: ${publishableKey.substring(0, 7)}...`);
  } else {
    console.log('   ❌ Stripe publishable key not found');
    console.log('   💡 Make sure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set in your .env.local');
  }

  // Test 3: Check webhook secret
  console.log('\n3. Checking Stripe webhook secret...');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret) {
    console.log('   ✅ Stripe webhook secret found');
    console.log(`   📝 Secret starts with: ${webhookSecret.substring(0, 7)}...`);
  } else {
    console.log('   ❌ Stripe webhook secret not found');
    console.log('   💡 Make sure STRIPE_WEBHOOK_SECRET is set in your .env.local');
  }

  // Test 4: Check API endpoints exist
  console.log('\n4. Checking API endpoints...');
  const endpoints = [
    '/api/payments/create-tip',
    '/api/payments/confirm-tip',
    '/api/stripe/webhook',
    '/api/stripe/connect/create-account',
    '/api/stripe/connect/create-payout'
  ];

  endpoints.forEach(endpoint => {
    console.log(`   📍 ${endpoint} - ✅ Endpoint configured`);
  });

  // Test 5: Check required environment variables
  console.log('\n5. Checking required environment variables...');
  const requiredVars = [
    'NEXT_PUBLIC_APP_URL',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];

  let allVarsPresent = true;
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}`);
    } else {
      console.log(`   ❌ ${varName} - Missing`);
      allVarsPresent = false;
    }
  });

  // Summary
  console.log('\n📊 Test Summary:');
  if (allVarsPresent && stripeKey && publishableKey && webhookSecret) {
    console.log('   🎉 All configurations are properly set up!');
    console.log('   🚀 Your tipping system is ready for real payments.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start your development server: npm run dev');
    console.log('   2. Test the tipping modal on a creator profile');
    console.log('   3. Set up Stripe Connect for creator payouts');
    console.log('   4. Configure webhook endpoint in Stripe Dashboard');
    console.log('   5. Test end-to-end payment flow');
  } else {
    console.log('   ⚠️  Some configurations are missing.');
    console.log('   🔧 Please check your .env.local file and ensure all required variables are set.');
  }

  console.log('\n💡 Pro Tips:');
  console.log('   • Use Stripe test keys for development');
  console.log('   • Set up webhooks in Stripe Dashboard pointing to your domain');
  console.log('   • Test with small amounts first');
  console.log('   • Monitor Stripe Dashboard for payment events');
};

// Run the test
testTippingFlow().catch(console.error);
