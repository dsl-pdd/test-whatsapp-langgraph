require('dotenv').config();
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;


const express = require('express');
const { graph } = require('./langgraphClient');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// GET route for webhook verification
app.get('/', (req, res) => {
    const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.status(403).end();
    }
});

// POST route for incoming messages
app.post('/', async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
        console.log(`\nWebhook received ${timestamp}\n`);
        console.log(JSON.stringify(req.body, null, 2));

        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0]?.value;
        const message = change?.messages?.[0];

        if (!message) return res.sendStatus(200);

        const userId = message.from;
        const userText = message.text?.body || '';

        // Call LangGraph Cloud agent
        const agentResponse = await graph.invoke({
            input: userText,
            thread_id: `whatsapp_${userId}`,
        });

        const reply = agentResponse.output_text || "Sorry, I didn't understand that.";

        // Send reply back to WhatsApp
        await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: userId,
                type: 'text',
                text: { body: reply },
            }),
        });

        res.sendStatus(200);
    } catch (err) {
        console.error('Error handling webhook:', err);
        res.sendStatus(500);
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
