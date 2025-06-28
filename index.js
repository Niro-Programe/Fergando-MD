const {
    default: makeWASocket,
    useSingleFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
    makeInMemoryStore,
    proto
} = require('@whiskeysockets/baileys')
const fs = require('fs')
const P = require('pino')
const qrcode = require('qrcode-terminal')
const NodeCache = require('node-cache')
const express = require('express')
const app = express()
const port = process.env.PORT || 8000

// Configuration
const config = {
    PREFIX: '.',
    MODE: 'public',
    AUTO_READ_STATUS: 'true',
    SUDO: '94718461889'
}

// Initialize store and cache
const msgRetryCounterCache = new NodeCache()
const store = makeInMemoryStore({ logger: P().child({ level: 'silent', stream: 'store' }) })

async function connectToWA() {
    console.log("Starting SUPUN-MD...")
    
    const { state, saveCreds } = await useSingleFileAuthState('./session/auth_info.json')
    
    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
        },
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: true,
        msgRetryCounterCache,
        getMessage: async key => {
            return store.loadMessage(key.remoteJid, key.id) || {}
        }
    })

    store.bind(conn.ev)

    // Connection updates
    conn.ev.on('connection.update', async (update) => {
        const { connection, qr, isNewLogin } = update
        
        if (qr) {
            console.log('Scan this QR code with your phone or use the link code below:')
            qrcode.generate(qr, { small: true })
            console.log(`Link Code: ${qr}`)
        }
        
        if (connection === 'open') {
            console.log('✅ Successfully connected to WhatsApp')
            
            // Send connection success message
            const botNumber = conn.user.id
            const welcomeMsg = `SUPUN-MD CONNECTED SUCCESSFULLY!\n\n• Prefix: ${config.PREFIX}\n• Mode: ${config.MODE}\n• Number: ${botNumber.split('@')[0]}\n\n> Powered by SUPUN MD`
            
            await conn.sendMessage(botNumber, { 
                text: welcomeMsg,
                contextInfo: {
                    externalAdReply: {
                        title: 'SUPUN MD',
                        body: 'WhatsApp Bot',
                        thumbnailUrl: 'https://i.ibb.co/bHXBV08/9242c844b83f7bf9.jpg',
                        sourceUrl: ''
                    }
                }
            })
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut)
            console.log('Connection closed, reconnecting...', lastDisconnect.error)
            if (shouldReconnect) {
                setTimeout(connectToWA, 5000)
            }
        }
    })

    // Creds update
    conn.ev.on('creds.update', saveCreds)

    // Messages handling
    conn.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return
        
        try {
            const sender = m.key.fromMe ? conn.user.id : m.key.participant || m.key.remoteJid
            const content = JSON.stringify(m.message)
            const type = Object.keys(m.message)[0]
            const isGroup = m.key.remoteJid.endsWith('@g.us')
            const body = (type === 'conversation') ? m.message.conversation : 
                        (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : ''
            
            // Basic commands
            if (body?.startsWith(config.PREFIX)) {
                const command = body.slice(config.PREFIX.length).trim().split(' ')[0].toLowerCase()
                const args = body.trim().split(/ +/).slice(1)
                
                switch(command) {
                    case 'ping':
                        await conn.sendMessage(m.key.remoteJid, { text: 'Pong! 🏓' })
                        break
                    case 'jid':
                        await conn.sendMessage(m.key.remoteJid, { text: m.key.remoteJid })
                        break
                    case 'owner':
                        await conn.sendMessage(m.key.remoteJid, { 
                            text: '👨‍💻 *Owner*: +94718461889\n\nContact for bot support',
                            contextInfo: {
                                mentionedJid: ['94718461889@s.whatsapp.net']
                            }
                        })
                        break
                }
            }
        } catch (error) {
            console.error('Error processing message:', error)
        }
    })

    // Status updates
    conn.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.status >= proto.WebMessageInfo.Status.DELIVERY_ACK) {
                console.log(`Message ${update.key.id} delivered to ${update.key.remoteJid}`)
            }
        }
    })
}

// Start Express server
app.get("/", (req, res) => {
    res.send("SUPUN MD WhatsApp Bot - Running")
})

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
    connectToWA()
})