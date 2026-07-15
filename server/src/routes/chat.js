const express = require('express');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Lead = require('../models/Lead');
const { generateReply } = require('../services/claudeService');
const { detectLead } = require('../services/leadDetector');
const { getIo } = require('../socket');

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

    const io = getIo();
    const room = `bot:${bot._id}`;

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
      io.to(room).emit('conversation:new', { conversation, botId: bot._id });
    }

    const history = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(10);

    const userMessage = await Message.create({ conversationId: conversation._id, role: 'user', content: message });
    io.to(room).emit('message:new', { message: userMessage, conversationId: conversation._id, botId: bot._id });

    const reply = await generateReply({ bot, conversationHistory: history, userMessage: message });

    const assistantMessage = await Message.create({ conversationId: conversation._id, role: 'assistant', content: reply });
    io.to(room).emit('message:new', { message: assistantMessage, conversationId: conversation._id, botId: bot._id });

    conversation.lastMessageAt = new Date();
    conversation.messageCount += 2;
    await conversation.save();

    const { email, phone } = detectLead(message);
    if (email || phone) {
      const existingLead = await Lead.findOne({ conversationId: conversation._id });
      let lead;
      if (existingLead) {
        if (email) existingLead.email = email;
        if (phone) existingLead.phone = phone;
        lead = await existingLead.save();
      } else {
        lead = await Lead.create({
          botId: bot._id,
          conversationId: conversation._id,
          email,
          phone,
          capturedAt: new Date(),
        });
      }
      io.to(room).emit('lead:new', { lead, botId: bot._id });
    }

    res.json({ conversationId: conversation._id, reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

module.exports = router;
