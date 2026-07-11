// ==========================================================
// index.js
// BotVerse Cloud Functions
// - Gemini AI Auto Reply
// - WhatsApp / Facebook / Instagram Webhooks
// - Admin: Delete Auth User
// ==========================================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// ==========================================================
// !! මෙතන ඔයාගේ Gemini API Key එක දාන්න !!
// Google AI Studio (aistudio.google.com) එකෙන් Free API key එකක් ගන්න පුළුවන්
// ==========================================================
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ==========================================================
// !! Meta (WhatsApp/FB/Instagram) Webhook Verify Token එක !!
// ඔයාම හදාගන්න string එකක් (Meta Developer console එකේදී මේකම දාන්න ඕන)
// ==========================================================
const WEBHOOK_VERIFY_TOKEN = "botverse_verify_2026";

// ==========================================================
// Helper: Gemini AI එකෙන් Reply එකක් හදාගැනීම
// ==========================================================
async function generateAIReply(userMessage, businessInfo, welcomeMessage) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const systemPrompt = `
ඔයා AI customer support assistant කෙනෙක්. පහත දුන්නු business/personal විස්තර අනුව customer ට reply කරන්න.

BUSINESS/PERSONAL විස්තර:
${businessInfo || 'විස්තර දාලා නැහැ - සාමාන්‍ය ආචාරශීලී reply එකක් දෙන්න.'}

රීති:
- කෙටියෙන්, ආචාරශීලීව, උපකාරී විදිහට reply කරන්න
- Customer කතා කරන භාෂාවෙන්ම (සිංහල/ඉංග්‍රීසි/සිංග්ලිශ්) reply කරන්න
- Business විස්තරයේ නැති දේවල් ගැන අනුමාන කරන්න එපා
- WhatsApp/Facebook message එකක් විදිහට කෙටියෙන් reply කරන්න (paragraph ලොකු කරන්න එපා)
`;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "තේරුණා. Customer message එකට ඒ අනුව reply කරන්නම්." }] }
      ]
    });

    const result = await chat.sendMessage(userMessage);
    return result.response.text();

  } catch (error) {
    console.error('Gemini AI Error:', error);
    return "සමාවෙන්න, දැනට reply එකක් දෙන්න බැරි උනා. ටිකකින් අපි contact කරන්නම්.";
  }
}

// ==========================================================
// TEST AI REPLY (Admin dashboard එකෙන් call කරන්නෙ)
// ==========================================================
exports.testAIReply = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { message, businessInfo, welcomeMessage } = req.body;
    const reply = await generateAIReply(message, businessInfo, welcomeMessage);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================================
// WHATSAPP WEBHOOK
// ==========================================================

// Webhook Verification (Meta Developer Console එකෙන් setup කරද්දී)
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {

  // GET request = Meta verify කරන එක
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Verification failed');
    }
    return;
  }

  // POST request = actual message එකක් ආවම
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const message = value?.messages?.[0];

        if (message) {
          const fromNumber = message.from;
          const messageText = message.text?.body || '';
          const phoneNumberId = value.metadata?.phone_number_id;

          // ඒ phone_number_id එකට අදාළ user කෙනා Firestore එකෙන් හොයනවා
          const usersSnapshot = await db.collection('users')
            .where('connectedPlatforms.whatsapp.phoneId', '==', phoneNumberId)
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();

            // Bot ON ද, Account Approved ද කියලා check කරනවා
            if (userData.botStatus && userData.accountApproved) {
              const accessToken = userData.connectedPlatforms.whatsapp.accessToken;

              // Gemini AI එකෙන් reply එක හදාගන්නවා
              const aiReply = await generateAIReply(
                messageText,
                userData.businessInfo,
                userData.welcomeMessage
              );

              // WhatsApp API එකට reply එක යවනවා
              await axios.post(
                `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
                {
                  messaging_product: "whatsapp",
                  to: fromNumber,
                  text: { body: aiReply }
                },
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              // Message log එකක් Firestore එකේ save කරනවා (history සඳහා)
              await db.collection('messageLogs').add({
                userId: userDoc.id,
                platform: 'whatsapp',
                from: fromNumber,
                incomingMessage: messageText,
                aiReply: aiReply,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('WhatsApp Webhook Error:', error);
      res.status(200).send('EVENT_RECEIVED'); // Meta ට 200 නැත්නම් retry කරනවා
    }
  }
});

// ==========================================================
// FACEBOOK MESSENGER WEBHOOK
// ==========================================================
exports.facebookWebhook = functions.https.onRequest(async (req, res) => {

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Verification failed');
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.object === 'page') {
        for (const entry of body.entry) {
          const pageId = entry.id;
          const messagingEvent = entry.messaging?.[0];

          if (messagingEvent && messagingEvent.message) {
            const senderId = messagingEvent.sender.id;
            const messageText = messagingEvent.message.text || '';

            const usersSnapshot = await db.collection('users')
              .where('connectedPlatforms.facebook.pageId', '==', pageId)
              .limit(1)
              .get();

            if (!usersSnapshot.empty) {
              const userDoc = usersSnapshot.docs[0];
              const userData = userDoc.data();

              if (userData.botStatus && userData.accountApproved) {
                const accessToken = userData.connectedPlatforms.facebook.accessToken;

                const aiReply = await generateAIReply(
                  messageText,
                  userData.businessInfo,
                  userData.welcomeMessage
                );

                await axios.post(
                  `https://graph.facebook.com/v20.0/me/messages`,
                  {
                    recipient: { id: senderId },
                    message: { text: aiReply }
                  },
                  {
                    params: { access_token: accessToken }
                  }
                );

                await db.collection('messageLogs').add({
                  userId: userDoc.id,
                  platform: 'facebook',
                  from: senderId,
                  incomingMessage: messageText,
                  aiReply: aiReply,
                  timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            }
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Facebook Webhook Error:', error);
      res.status(200).send('EVENT_RECEIVED');
    }
  }
});

// ==========================================================
// INSTAGRAM WEBHOOK
// ==========================================================
exports.instagramWebhook = functions.https.onRequest(async (req, res) => {

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Verification failed');
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.object === 'instagram') {
        for (const entry of body.entry) {
          const igAccountId = entry.id;
          const messagingEvent = entry.messaging?.[0];

          if (messagingEvent && messagingEvent.message) {
            const senderId = messagingEvent.sender.id;
            const messageText = messagingEvent.message.text || '';

            const usersSnapshot = await db.collection('users')
              .where('connectedPlatforms.instagram.accountId', '==', igAccountId)
              .limit(1)
              .get();

            if (!usersSnapshot.empty) {
              const userDoc = usersSnapshot.docs[0];
              const userData = userDoc.data();

              if (userData.botStatus && userData.accountApproved) {
                const accessToken = userData.connectedPlatforms.instagram.accessToken;

                const aiReply = await generateAIReply(
                  messageText,
                  userData.businessInfo,
                  userData.welcomeMessage
                );

                await axios.post(
                  `https://graph.facebook.com/v20.0/me/messages`,
                  {
                    recipient: { id: senderId },
                    message: { text: aiReply }
                  },
                  {
                    params: { access_token: accessToken }
                  }
                );

                await db.collection('messageLogs').add({
                  userId: userDoc.id,
                  platform: 'instagram',
                  from: senderId,
                  incomingMessage: messageText,
                  aiReply: aiReply,
                  timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            }
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Instagram Webhook Error:', error);
      res.status(200).send('EVENT_RECEIVED');
    }
  }
});

// ==========================================================
// ADMIN: Delete User (Firebase Auth එකෙන්ම සම්පූර්ණයෙන් ඉවත් කිරීම)
// ==========================================================
exports.deleteUserCompletely = functions.https.onCall(async (data, context) => {
  // Admin කෙනාද කියලා check කරනවා
  if (!context.auth || context.auth.token.email !== "isharaktii@gmail.com") {
    throw new functions.https.HttpsError('permission-denied', 'Admin කෙනාට විතරයි මේක කරන්න පුළුවන්');
  }

  const { userId } = data;

  try {
    // Firebase Authentication එකෙන් account එක delete කරනවා
    await admin.auth().deleteUser(userId);

    // Firestore එකෙන් document එකත් delete කරනවා
    await db.collection('users').doc(userId).delete();

    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
