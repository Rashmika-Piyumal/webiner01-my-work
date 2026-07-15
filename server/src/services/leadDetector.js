const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w{2,}/i;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s-]?)?(?:0)?\d{9,11}/;

function detectLead(text) {
  const emailMatch = text.match(EMAIL_REGEX);
  const phoneMatch = text.match(PHONE_REGEX);

  return {
    email: emailMatch ? emailMatch[0] : undefined,
    phone: phoneMatch ? phoneMatch[0] : undefined,
  };
}

module.exports = { detectLead };
