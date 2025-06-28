const {
    default: makeWASocket,
    useSingleFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys')
const fs = require('fs')
const P = require('pino')
const qrcode = require('qrcode-terminal')
const express = require('express')

// Configuration
const config = {
    PREFIX: '.',
    MODE: 'public',
    SUDO: '94718461889',
    SESSION_FILE: './session/auth_info.json'
}

// Initialize Express
const app = express()
const port = process.env.PORT || 8000

async function startBot() {
    console.log("🚀 Starting SUPUN-MD WhatsApp Bot...")

    // Load or create auth state
    const { state, saveCreds } = await useSingleFileAuthState(config.SESSION_FILE)

    // Create WhatsApp connection
    const { version } = await fetchLatestBaileysVersion()
    console.log(`Using WA v${version.join('.')}`)

    const sock = makeWASocket({
        version: version,
        logger: P({ level: 'error' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'error' })),
        },
        browser: Browsers.ubuntu('Chrome'),
        getMessage: async () => ({})
    })

    // Connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, qr, isNewLogin, lastDisconnect } = update
        
        if (qr) {
            console.log('\n📲 Scan this QR code with your phone or use the link code:')
            qrcode.generate(qr, { small: true })
            console.log(`🔢 Link Code: ${qr}\n`)
        }

        if (connection === 'open') {
            console.log('✅ Successfully connected to WhatsApp!')
            console.log(`👤 Bot number: ${sock.user.id.replace(/:.*@/, '@')}`)
            
            // Send connection notification
            const welcomeMsg = `🤖 *SUPUN-MD* is now online!\n\n` +
                              `➤ Prefix: ${config.PREFIX}\n` +
                              `➤ Mode: ${config.MODE}\n` +
                              `➤ Version: ${version.join('.')}\n\n` +
                              `_Powered by SUPUN MD_`
            
            sock.sendMessage(sock.user.id, { 
                text: welcomeMsg,
                mentions: [sock.user.id]
            }).catch(console.error)
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed:', lastDisconnect.error)
            if (shouldReconnect) {
                console.log('Reconnecting...')
                setTimeout(startBot, 5000)
            }
        }
    })

    // Save credentials
    sock.ev.on('creds.update', saveCreds)

    // Message handling
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return

        try {
            const from = m.key.remoteJid
            const type = Object.keys(m.message)[0]
            const text = type === 'conversation' ? m.message.conversation : 
                        (type === 'extendedTextMessage' ? m.message.extendedTextMessage.text : '')
            
            if (!text?.startsWith(config.PREFIX)) return

            const command = text.slice(config.PREFIX.length).trim().split(' ')[0].toLowerCase()
            const args = text.trim().split(/ +/).slice(1)

            // Basic commands
            switch(command) {
                case 'ping':
                    await sock.sendMessage(from, { text: '🏓 Pong!' })
                    break
                    
                case 'jid':
                    await sock.sendMessage(from, { text: `👤 Your JID: ${from}` })
                    break
                    
                case 'info':
                    const infoMsg = `📊 *Bot Info*\n\n` +
                                  `➤ Prefix: ${config.PREFIX}\n` +
                                  `➤ Mode: ${config.MODE}\n` +
                                  `➤ Owner: ${config.SUDO}\n` +
                                  `➤ Connected: ${new Date().toLocaleString()}`
                    await sock.sendMessage(from, { text: infoMsg })
                    break
                    
                default:
                    await sock.sendMessage(from, { 
                        text: `❌ Unknown command: ${command}\n` +
                              `Type ${config.PREFIX}info for help`
                    })
            }
        } catch (error) {
            console.error('Error handling message:', error)
        }
    })
}

// Start server
app.get('/', (req, res) => res.send('SUPUN-MD WhatsApp Bot'))
app.listen(port, () => {
    console.log(`🌐 Server running on http://localhost:${port}`)
    startBot().catch(console.error)
})
