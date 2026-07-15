const express = require('express');
const Bot = require('../models/Bot');
const Lead = require('../models/Lead');
const auth = require('../middleware/auth');

const router = express.Router();

function csvField(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get('/bots/:botId/leads', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.botId, userId: req.userId });
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const leads = await Lead.find({ botId: bot._id }).sort({ capturedAt: -1 });

    res.json(leads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/bots/:botId/leads/export', auth, async (req, res) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.botId, userId: req.userId });
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const leads = await Lead.find({ botId: bot._id }).sort({ capturedAt: -1 });

    const rows = [
      ['Name', 'Email', 'Phone', 'Captured At', 'Conversation ID'],
      ...leads.map((lead) => [
        lead.name,
        lead.email,
        lead.phone,
        lead.capturedAt.toISOString(),
        lead.conversationId,
      ]),
    ];

    const csv = rows.map((row) => row.map(csvField).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${bot._id}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

module.exports = router;
