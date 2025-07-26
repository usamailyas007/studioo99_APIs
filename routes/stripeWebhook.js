const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/subscription');
const User = require('../models/User');

// Use express.raw for webhooks (required by Stripe)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // --- Webhook event handling logic ---
  // Example: customer.subscription.updated or deleted
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const stripeSubscription = event.data.object;
    const { id: stripeSubscriptionId, status, customer } = stripeSubscription;

    // Update subscription status in your DB
    await Subscription.updateMany(
      { stripeSubscriptionId },
      { status }
    );

    // Optionally update user too
    if (status !== 'active') {
      await User.updateMany(
        { stripeCustomerId: customer },
        { subscriptionStatus: 'inactive', deviceLimit: 1 }
      );
    }
  }

  res.status(200).send('Received');
});

module.exports = router;
