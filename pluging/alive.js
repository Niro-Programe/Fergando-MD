const config = require('../config')
const {cmd , commands} = require('../command')

cmd({
    pattern: "alive",
    alias: ["menu"],
    desc: "Check bot online or no.",
    category: "main",
    react: "😈",
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{

let des = `*👋 Welcome,Fergando - MD 👺*

*╭─「 FERGANDO-MD 」*
*│◈ 𝙱𝙾𝚃 𝙽𝙰𝙼𝙴* : ​*FERGA{NDO - MD*
*│◈ 𝙾𝚆𝙽𝙴𝚁 𝙽𝙰𝙼𝙴* : Fergando x Akshu
*│◈ 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿 :* 0765382939 x 0741984208
*╰────────────────────
*╭──────────●●►*
 │ Hey I'm Fergando MD
 │ Step Into the unknown with me as I 
 │ Explore haunted places, performeerie
 │ rituals, and uncover the supernatural.
 │ No Script, No Fakes Just Raw Paranormal
 │ Encounters.
 | 
 | Youtube Channel - https://www.youtube.com/@FergandoOfficial
 | Whatsapp Channel - https://whatsapp.com/channel/0029Va5wOosAe5VjldZ4hA3D
 | Instagrame Page - https://www.instagram.com/FergandoOfficial
 | FaceBook Page - https://www.facebook.com/FergandoOfficial
 | TikTok Page - https://www.tiktok.com/@FergandoOfficial
 | Our Discord - https://discord.gg/uKVEXafxJw
*╰──────────●●►*

> *Fergando - MD By Fergando Generals*
`
return await conn.sendMessage(from,{image: {url: "https://files.catbox.moe/qlyo6i.jpg"},caption: des},{quoted: mek})
}catch(e)
console.log(e)
reply(`${e}`)
}
})
