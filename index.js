require('dotenv').config();
const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const P = require('pino');
const path = require('path');
const express = require('express');
const app = express();
const port = process.env.PORT || 8000;

// Configuration
const config = {
    PREFIX: '.',
    MODE: 'public',
    SESSION_DIR: './session',
    OWNER: '94718461889',
    BOT_NAME: 'SUPUN-MD'
};

// Create session directory if not exists
if (!fs.existsSync(config.SESSION_DIR)) {
    fs.mkdirSync(config.SESSION_DIR, { recursive: true });
}

async function startBot() {
    console.log(`🚀 Starting ${config.BOT_NAME}...`);

    const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`Using WA v${version.join('.')}`);

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false, // Disable QR code
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
            // Enable Pair Code
            generateRegistrationOptions: (registration) => ({
                name: config.BOT_NAME,
                qrTimeout: 60 // 60 seconds
            })
        },
        browser: Browsers.ubuntu('Chrome'),
        getMessage: async () => ({}),
        generateHighQualityLinkPreview: true
    });

    // Connection updates handler
    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;
        
        if (qr) {
            console.log('\n📲 *Pair Code Instructions*:');
            console.log('1. Open WhatsApp on your phone');
            console.log('2. Go to Settings > Linked Devices > Link a Device');
            console.log('3. Enter this code:\n');
            console.log(`🔢 ${qr}\n`);
        }

        if (connection === 'open') {
            console.log('✅ Successfully connected to WhatsApp!');
            console.log(`👤 Bot ID: ${sock.user.id}`);
            
            // Send connection message to owner
            const welcomeMsg = `*${config.BOT_NAME}* is now online!\n\n` +
                             `➤ Prefix: ${config.PREFIX}\n` +
                             `➤ Mode: ${config.MODE}\n` +
                             `➤ Version: ${version.join('.')}\n\n` +
                             `_Powered by SUPUN MD_`;
            
            await sock.sendMessage(`${config.OWNER}@s.whatsapp.net`, { text: welcomeMsg });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed:', lastDisconnect.error);
            if (shouldReconnect) {
                console.log('Reconnecting in 5 seconds...');
                setTimeout(startBot, 5000);
            }
        }
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.remoteJid === 'status@broadcast') return;

        try {
            const from = m.key.remoteJid;
            const text = m.message.conversation || 
                        (m.message.extendedTextMessage?.text || '');

            if (!text.startsWith(config.PREFIX)) return;

            const cmd = text.slice(config.PREFIX.length).trim().split(' ')[0].toLowerCase();
            const args = text.trim().split(/ +/).slice(1);

            // Basic commands
            switch(cmd) {
                case 'ping':
                    await sock.sendMessage(from, { text: '🏓 Pong!' });
                    break;
                    
                case 'owner':
                    await sock.sendMessage(from, { 
                        text: `👨‍💻 Owner: ${config.OWNER}\n\nContact for support`,
                        mentions: [`${config.OWNER}@s.whatsapp.net`]
                    });
                    break;
                    
                case 'info':
                    const infoMsg = `📊 *Bot Info*\n\n` +
                                   `➤ Prefix: ${config.PREFIX}\n` +
                                   `➤ Mode: ${config.MODE}\n` +
                                   `➤ Owner: ${config.OWNER}\n` +
                                   `➤ Connected: ${new Date().toLocaleString()}`;
                    await sock.sendMessage(from, { text: infoMsg });
                    break;
                    
                default:
                    await sock.sendMessage(from, { 
                        text: `❌ Unknown command. Type ${config.PREFIX}help for commands list`
                    });
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });
}

// Start web server
app.get('/', (req, res) => {
    res.send(`${config.BOT_NAME} WhatsApp Bot - Running`);
});

app.listen(port, () => {
    console.log(`🌐 Server running on port ${port}`);
    startBot().catch(console.error);
});
