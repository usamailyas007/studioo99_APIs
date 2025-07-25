const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  stripeSubscriptionId: { type: String },       
  status: { type: String },                       
  planId: { type: String },                       
  priceId: { type: String },                     
  startDate: { type: Date },                       
  endDate: { type: Date },
  cancelDate: { type: Date },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    amount: { type: Number, default: 0 },         
  currency: { type: String, default: 'USD' },  
}, { timestamps: true }); 

module.exports = mongoose.model('Subscription', subscriptionSchema);
