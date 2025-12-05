// backend/utils/translator.js
// Automatic translation utility for client communications
// Uses official Google Cloud Translate API

const { Translate } = require('@google-cloud/translate').v2;
const path = require('path');

// Initialize the client with credentials
// Use absolute path to ensure it works from any working directory
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : path.resolve(__dirname, '..', 'google-translate-credentials.json');

const translate = new Translate({
  keyFilename: credentialsPath
});

/**
 * Translate text to target language using Google Cloud Translate API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code ('es', 'en', etc.)
 * @returns {Promise<string>} Translated text
 */
async function translateText(text, targetLang = 'es') {
  try {
    // Don't translate if target is English or text is empty
    if (!text || targetLang === 'en' || targetLang === 'English') {
      return text;
    }

    // Convert language names to codes
    const langCode = targetLang.toLowerCase() === 'spanish' ? 'es' : targetLang;

    console.log(`🌐 Translating to ${langCode}: "${text.substring(0, 50)}..."`);

    // Call Google Cloud Translate API
    const [translation] = await translate.translate(text, langCode);

    console.log(`✅ Translation result: "${translation.substring(0, 50)}..."`);

    return translation;
  } catch (error) {
    console.error('❌ Translation error:', error.message);
    // If translation fails, return original text
    return text;
  }
}

/**
 * Detect if text needs translation based on client's preferred language
 * @param {string} clientLanguage - Client's preferred language ('Spanish', 'es', etc.)
 * @param {string} text - Text to potentially translate
 * @returns {Promise<string>} Original or translated text
 */
async function autoTranslate(clientLanguage, text) {
  if (!clientLanguage || !text) {
    return text;
  }

  const lang = clientLanguage.toLowerCase();

  // Check if client prefers Spanish
  if (lang === 'spanish' || lang === 'es' || lang === 'español') {
    return await translateText(text, 'es');
  }

  // Add more languages here as needed
  // if (lang === 'french' || lang === 'fr') {
  //   return await translateText(text, 'fr');
  // }

  return text;
}

module.exports = {
  translateText,
  autoTranslate
};
