const cron = require('node-cron');
const Subscription = require('../models/subscription');
const User = require('../models/User');

// Run every day at 1:10am
cron.schedule('10 1 * * *', async () => {
  try {
    const now = new Date();
    // Find all active subscriptions that are past their end date
    const expiredSubs = await Subscription.find({ endDate: { $lt: now }, status: 'active' });

    for (const sub of expiredSubs) {
      sub.status = 'inactive';
      await sub.save();

      // Also update user's subscription status and device limit
      await User.updateOne({ _id: sub.userId }, { subscriptionStatus: 'inactive', deviceLimit: 1 });
    }

    if (expiredSubs.length) {
      console.log(`${expiredSubs.length} subscriptions expired and updated.`);
    }
  } catch (err) {
    console.error('Error in subscription expiry cron job:', err);
  }
});
