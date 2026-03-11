/**
 * One-off script: create the Founding Member 10% forever coupon via Stripe API.
 * Dashboard and API may both return: "You cannot create a script coupon with a service period duration."
 * If that happens, ask Stripe Support to create the coupon or enable "forever" on your account
 * (no new products/prices in Stripe, App Store, or Play Store).
 *
 * Run from apps/web:
 *   node scripts/create-founding-member-coupon.js
 *
 * Loads STRIPE_SECRET_KEY from .env.local. Add the printed coupon ID to your env as:
 *   STRIPE_FOUNDING_MEMBER_COUPON_ID=<id>
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const Stripe = require('stripe');

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('Missing STRIPE_SECRET_KEY in .env.local');
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: '2025-08-27.basil' });

  try {
    const coupon = await stripe.coupons.create({
      name: 'Founding Member 10%',
      percent_off: 10,
      duration: 'forever',
    });
    console.log('Coupon created successfully.');
    console.log('ID:', coupon.id);
    console.log('\nAdd to .env.local and Vercel:');
    console.log('STRIPE_FOUNDING_MEMBER_COUPON_ID=' + coupon.id);
  } catch (err) {
    console.error('Stripe error:', err.message);
    if (err.code) console.error('Code:', err.code);
    console.error('\nIf you see "script coupon with a service period duration":');
    console.error('Contact Stripe Support and ask them to create a 10% forever coupon for Founding Members');
    console.error('or to enable forever/repeating coupons on your account. No new products or prices needed.');
    process.exit(1);
  }
}

main();
