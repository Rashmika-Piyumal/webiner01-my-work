const express = require('express');
const Bot = require('../models/Bot');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Lead = require('../models/Lead');
const auth = require('../middleware/auth');

const router = express.Router();

const EDITABLE_FIELDS = ['name', 'welcomeMessage', 'businessKnowledge', 'primaryColor'];

function toPublicBot(bot, counts = {}) {
  return {
    _id: bot._id,
    userId: bot.userId,
    name: bot.name,
    welcomeMessage: bot.welcomeMessage,
    businessKnowledge: bot.businessKnowledge,
    primaryColor: bot.primaryColor,
    embedKey: bot.embedKey,
    createdAt: bot.createdAt,
    messageCount: counts.messageCount || 0,
    leadCount: counts.leadCount || 0,
  };
}

// Public endpoint — no auth. Must be registered before /:id to avoid "public" being read as an id.
router.get('/public/:embedKey', async (req, res) => {
  try {
    const bot = await Bot.findOne({ embedKey: req.params.embedKey });
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    res.json({
      name: bot.name,
      welcomeMessage: bot.welcomeMessage,
      primaryColor: bot.primaryColor,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, welcomeMessage, businessKnowledge, primaryColor } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const bot = await Bot.create({
      userId: req.userId,
      name: name.trim(),
      welcomeMessage: welcomeMessage || 'Hi! How can I help?',
      businessKnowledge: businessKnowledge || '',
      primaryColor: primaryColor || '#4F46E5',
    });

    res.status(201).json(toPublicBot(bot));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const bots = await Bot.find({ userId: req.userId }).sort({ createdAt: -1 });
    const botIds = bots.map((bot) => bot._id);

    const [messageAgg, leadAgg] = await Promise.all([
      Conversation.aggregate([
        { $match: { botId: { $in: botIds } } },
        { $group: { _id: '$botId', total: { $sum: '$messageCount' } } },
      ]),
      Lead.aggregate([
        { $match: { botId: { $in: botIds } } },
        { $group: { _id: '$botId', total: { $sum: 1 } } },
      ]),
    ]);

    const messageCountByBot = new Map(messageAgg.map((row) => [String(row._id), row.total]));
    const leadCountByBot = new Map(leadAgg.map((row) => [String(row._id), row.total]));

    res.json(
      bots.map((bot) =>
        toPublicBot(bot, {
          messageCount: messageCountByBot.get(String(bot._id)) || 0,
          leadCount: leadCountByBot.get(String(bot._id)) || 0,
        })
      )
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    res.json(toPublicBot(bot));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        bot[field] = req.body[field];
      }
    }

    await bot.save();
    res.json(toPublicBot(bot));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update bot' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.userId });
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const conversations = await Conversation.find({ botId: bot._id }, '_id');
    const conversationIds = conversations.map((c) => c._id);

    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    await Conversation.deleteMany({ botId: bot._id });
    await Lead.deleteMany({ botId: bot._id });
    await bot.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

module.exports = router;
