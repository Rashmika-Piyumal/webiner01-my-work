const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  botId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bot',
    required: true,
  },
  visitorId: {
    type: String,
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  messageCount: {
    type: Number,
    default: 0,
  },
});

conversationSchema.index({ botId: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
