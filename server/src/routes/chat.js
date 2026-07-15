const express = require('express');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Lead = require('../models/Lead');
const { generateReply } = require('../services/claudeService');
const { detectLead } = require('../services/leadDetector');

const router = express.Router();

router.post('/:embedKey/message', async (req, res) => {
  try {
    const { visitorId, conversationId, message } = req.body;

    if (!visitorId || !message) {
      return res.status(400).json({ error: 'visitorId and message are required' });
    }

    const bot = await Bot.findOne({ embedKey: req.params.embedKey });
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    let conversation = null;
    if (conversationId) {
      const existing = await Conversation.findById(conversationId);
      if (existing && String(existing.botId) === String(bot._id) && existing.visitorId === visitorId) {
        conversation = existing;
      }
    }
    if (!conversation) {
      conversation = await Conversation.create({
        botId: bot._id,
        visitorId,
        startedAt: new Date(),
      });
    }

    const history = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(10);

    await Message.create({ conversationId: conversation._id, role: 'user', content: message });

    const reply = await generateReply({ bot, conversationHistory: history, userMessage: message });

    await Message.create({ conversationId: conversation._id, role: 'assistant', content: reply });

    conversation.lastMessageAt = new Date();
    conversation.messageCount += 2;
    await conversation.save();

    const { email, phone } = detectLead(message);
    if (email || phone) {
      const existingLead = await Lead.findOne({ conversationId: conversation._id });
      if (existingLead) {
        if (email) existingLead.email = email;
        if (phone) existingLead.phone = phone;
        await existingLead.save();
      } else {
        await Lead.create({
          botId: bot._id,
          conversationId: conversation._id,
          email,
          phone,
          capturedAt: new Date(),
        });
      }
    }

    res.json({ conversationId: conversation._id, reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

module.exports = router;
