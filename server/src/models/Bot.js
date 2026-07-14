const mongoose = require('mongoose');
const crypto = require('crypto');

const botSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  welcomeMessage: {
    type: String,
    default: 'Hi! How can I help you today?',
  },
  businessKnowledge: {
    type: String,
    maxlength: 8000,
    default: '',
  },
  primaryColor: {
    type: String,
    default: '#4F46E5',
  },
  embedKey: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(16).toString('hex'),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

botSchema.index({ embedKey: 1 }, { unique: true });

module.exports = mongoose.model('Bot', botSchema);
