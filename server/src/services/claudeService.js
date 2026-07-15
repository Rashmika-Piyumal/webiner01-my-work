const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(bot) {
  return `You are ${bot.name}, a helpful AI assistant for a business. Use the following business information to answer customer questions accurately and concisely:

---BUSINESS INFO---
${bot.businessKnowledge}
---END BUSINESS INFO---

Rules:
- Answer in the same language the customer uses (English, Sinhala, or mixed).
- Keep replies concise — 2-4 sentences typical.
- If you don't know something, say so honestly and offer to take their contact info so the team can follow up.
- If the customer asks something unrelated to the business, politely steer back.
- Never make up information not in the business info above.`;
}

async function generateReply({ bot, conversationHistory, userMessage }) {
  const messages = [
    ...conversationHistory.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: buildSystemPrompt(bot),
    messages,
  });

  return response.content[0].text;
}

module.exports = { generateReply };
