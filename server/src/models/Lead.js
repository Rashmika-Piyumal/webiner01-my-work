const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  botId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bot',
    required: true,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  name: {
    type: String,
  },
  capturedAt: {
    type: Date,
    default: Date.now,
  },
});

leadSchema.index({ botId: 1 });

module.exports = mongoose.model('Lead', leadSchema);
