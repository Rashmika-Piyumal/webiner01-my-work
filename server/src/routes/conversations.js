const express = require('express');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/bots/:botId/conversations', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.botId, userId: req.userId });
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const conversations = await Conversation.find({ botId: bot._id })
      .sort({ lastMessageAt: -1 })
      .limit(50);

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const bot = await Bot.findOne({ _id: conversation.botId, userId: req.userId });
    if (!bot) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
