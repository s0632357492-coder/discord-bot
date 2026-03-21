require('dotenv').config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

/* ===================== CONFIGURATION & CONSTANTS ===================== */
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, "welcome_config.json");
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    console.error("[CRITICAL] Missing TOKEN in environment variables!");
    process.exit(1);
}

// Hardcoded Role IDs for the verification system
const VERIFIED_ROLES = [
    "1456568276019843175", "1470963054995832875", "1471033043992051765",
    "1471033226515447809", "1471033642850717812", "1471033451414290453",
    "1471033971121852416", "1471034152114720940", "1471034320381804623",
    "1471034566910410793", "1471034832988405771", "1471036689420914820",
    "1471694828223074500", "1471695121010397184", "1471696205091311617",
    "1471696512525533245", "1471696656406937842", "1471696892126691519",
    "1471697294364770495", "1471697587684774052", "1471697745692721244",
    "1471698117563912232", "1471698431104909502", "1471698647027679374"
];

/* ===================== SAFE CONFIG MANAGER ===================== */
const ConfigManager = {
    read() {
        try {
            if (!fs.existsSync(CONFIG_PATH)) {
                fs.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2));
                return {};
            }
            const data = fs.readFileSync(CONFIG_PATH, "utf8");
            return JSON.parse(data || "{}");
        } catch (error) {
            console.error(`[CRITICAL] Config Read Failure: ${error.message}`);
            return {};
        }
    },
    save(config) {
        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error(`[CRITICAL] Config Save Failure: ${error.message}`);
            return false;
        }
    }
};

/* ===================== PERMISSION & HIERARCHY GUARDS ===================== */
async function safelyAddRole(member, roleId) {
    try {
        const guild = member.guild;
        const botMember = await guild.members.fetchMe();
        const role = await guild.roles.fetch(roleId);

        if (!role) throw new Error("Role not found in guild.");
        if (member.roles.cache.has(roleId)) return { success: true, alreadyHas: true };

        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            throw new Error("Bot lacks 'Manage Roles' permission.");
        }

        if (botMember.roles.highest.position <= role.position) {
            throw new Error(`Hierarchy Error: Cannot manage role '${role.name}' (Position too high).`);
        }

        await member.roles.add(role);
        return { success: true, alreadyHas: false };
    } catch (error) {
        console.error(`[ROLE ERROR] User: ${member.user.tag} | Role: ${roleId} | Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/* ===================== WEB SERVER (RENDER KEEP-ALIVE) ===================== */
const app = express();
app.get("/", (req, res) => res.status(200).send("Bot is alive"));
app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYSTEM] Web server listening on port ${PORT}`);
});

/* ===================== DISCORD CLIENT ===================== */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

client.once("ready", () => {
    console.log(`[SYSTEM] Logged in as ${client.user.tag}`);
    console.log(`[SYSTEM] Production monitoring active on port ${PORT}`);
});

/* ===================== WELCOME EVENT ===================== */
client.on("guildMemberAdd", async (member) => {
    try {
        const config = ConfigManager.read();
        const guildConfig = config[member.guild.id];

        if (!guildConfig || !guildConfig.enabled || !guildConfig.channelId) return;

        const channel = await member.guild.channels.fetch(guildConfig.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const imageURL = (guildConfig.imageURL && guildConfig.imageURL.startsWith("http")) 
            ? guildConfig.imageURL 
            : null;

        const welcomeEmbed = new EmbedBuilder()
            .setColor("#ff7dfb")
            .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
            .setTitle(`Welcome to 【 🌸 SENSAWAI 🎐 】`)
            .setDescription(
                `✧･ﾟ: *✧･ﾟ:* **Welcome** *:･ﾟ✧*:･ﾟ✧\n\n` +
                `➥ ยินดีต้อนรับสู่ 【 🌸 **SENSAWAI COMMUNITY** 🎐 】\n\n` +
                `➥ **Name** : ${member.user.username}\n` +
                `➥ **สมาชิกคนที่** : ${member.guild.memberCount}th\n\n` +
                `➥ ขอให้มีความสุขกับที่นี่นะ มาเป็นใบไม้ต้นเดียวกันนะ 💖\n\n` +
                `➥ กดรับยศที่ห้อง <#1476986144318034017>`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `${member.user.tag}`, iconURL: member.guild.iconURL() })
            .setTimestamp();

        if (imageURL) welcomeEmbed.setImage(imageURL);

        await channel.send({ content: `Welcome <@${member.id}>`, embeds: [welcomeEmbed] });
    } catch (error) {
        console.error(`[EVENT ERROR] Welcome Join failed for ${member.user.tag}: ${error.message}`);
    }
});

/* ===================== INTERACTION HANDLER ===================== */
client.on("interactionCreate", async (interaction) => {
    const safeReply = async (content, ephemeral = true) => {
        if (interaction.replied || interaction.deferred) {
            return interaction.editReply({ content }).catch(() => null);
        }
        return interaction.reply({ content, ephemeral }).catch(() => null);
    };

    try {
        if (interaction.isChatInputCommand()) {
            const { commandName, member, guildId, options } = interaction;

            if (commandName === "welcome") {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return safeReply("คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌");
                }

                const channel = options.getChannel("channel");
                const imageURL = options.getString("image");

                if (!channel || !channel.isTextBased()) return safeReply("กรุณาเลือก Text Channel ที่ถูกต้อง ❌");
                if (!imageURL.startsWith("http")) return safeReply("กรุณาใส่ Image URL ที่ถูกต้อง (http/https) ❌");

                const config = ConfigManager.read();
                config[guildId] = { enabled: true, channelId: channel.id, imageURL };
                
                if (ConfigManager.save(config)) return safeReply("ตั้งค่าระบบ welcome สำเร็จแล้ว ✅");
                return safeReply("เกิดข้อผิดพลาดในการบันทึกข้อมูล ❌");
            }

            if (commandName === "stopw") {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return safeReply("คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌");
                }

                const config = ConfigManager.read();
                if (config[guildId]) {
                    config[guildId].enabled = false;
                    ConfigManager.save(config);
                }
                return safeReply("ปิดระบบต้อนรับเรียบร้อยแล้ว ❌");
            }

            if (commandName === "setupverify") {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return safeReply("คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌");
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("pvc").setLabel("นักศึกษา ปวช.").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("pvs").setLabel("นักศึกษา ปวส.").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("external").setLabel("บุคคลภายนอก").setStyle(ButtonStyle.Secondary)
                );
                return interaction.reply({ content: "กรุณาเลือกประเภท:", components: [row] });
            }

            if (commandName === "admcheck") {
                await interaction.deferReply({ ephemeral: true });
                await interaction.guild.members.fetch();

                const notVerified = interaction.guild.members.cache.filter(m => 
                    !m.user.bot && !VERIFIED_ROLES.some(roleId => m.roles.cache.has(roleId))
                );

                if (notVerified.size === 0) return safeReply("ทุกคนได้รับยศแล้ว ✅");

                let list = notVerified.map(m => `<@${m.id}>`).join("\n");
                if (list.length > 1900) list = list.substring(0, 1900) + "\n...";

                return safeReply(`📋 คนที่ยังไม่ได้รับยศ (${notVerified.size} คน):\n\n${list}`);
            }
        }

        if (interaction.isButton()) {
            const member = interaction.member;

            if (interaction.customId === "external") {
                await interaction.deferReply({ ephemeral: true });
                const result = await safelyAddRole(member, "1470963054995832875");
                
                if (result.success) return safeReply(result.alreadyHas ? "คุณมียศนี้อยู่แล้ว ✅" : "ได้รับยศแล้ว ✅");
                return safeReply(`ไม่สามารถให้ยศได้: ${result.error} ❌`);
            }

            if (interaction.customId === "pvc" || interaction.customId === "pvs") {
                const isPVC = interaction.customId === "pvc";
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(isPVC ? "pvc_select" : "pvs_select")
                    .setPlaceholder(`เลือกสาขา ${isPVC ? "ปวช." : "ปวส."}`)
                    .addOptions(isPVC ? [
                        { label: "การบัญชี", value: "1471033043992051765" },
                        { label: "การตลาด", value: "1471033226515447809" },
                        { label: "เทคโนโลยีสารสนเทศ", value: "1471033642850717812" },
                        { label: "เทคโนโลยีธุรกิจดิจิทัล", value: "1471033451414290453" },
                        { label: "ช่างยนต์", value: "1471033971121852416" },
                        { label: "ช่างยานยนต์ไฟฟ้า", value: "1471034152114720940" },
                        { label: "ช่างไฟฟ้า", value: "1471034320381804623" },
                        { label: "ช่างอิเล็กทรอนิกส์", value: "1471034566910410793" },
                        { label: "ช่างกลโรงงาน", value: "1471034832988405771" },
                        { label: "ช่างเมคคาทรอนิกส์", value: "1471036689420914820" }
                    ] : [
                        { label: "การบัญชี", value: "1471694828223074500" },
                        { label: "การตลาด", value: "1471695121010397184" },
                        { label: "เทคโนโลยีธุรกิจดิจิทัล", value: "1471696205091311617" },
                        { label: "ธุรกิจอีคอมเมิร์ซ", value: "1471696512525533245" },
                        { label: "เทคโนโลยีสารสนเทศ", value: "1471696656406937842" },
                        { label: "คอมพิวเตอร์เกมและแอนิเมชัน", value: "1471696892126691519" },
                        { label: "เทคนิคเครื่องกล", value: "1471697294364770495" },
                        { label: "เทคนิคยานยนต์ไฟฟ้า", value: "1471697587684774052" },
                        { label: "ไฟฟ้า", value: "1471697745692721244" },
                        { label: "เทคโนโลยีอิเล็กทรอนิกส์", value: "1471698117563912232" },
                        { label: "เทคนิคอุตสาหกรรม", value: "1471698431104909502" },
                        { label: "เมคคาทรอนิกส์และหุ่นยนต์", value: "1471698647027679374" }
                    ]);

                return interaction.reply({
                    content: `กรุณาเลือกสาขา ${isPVC ? "ปวช." : "ปวส."}:`,
                    components: [new ActionRowBuilder().addComponents(menu)],
                    ephemeral: true
                });
            }
        }

        if (interaction.isStringSelectMenu()) {
            await interaction.deferReply({ ephemeral: true });
            const member = interaction.member;
            const roleId = interaction.values[0];
            const verifiedRole = "1456568276019843175";

            const res1 = await safelyAddRole(member, roleId);
            const res2 = await safelyAddRole(member, verifiedRole);

            if (res1.success && res2.success) return safeReply("ได้รับยศและยืนยันตัวตนเรียบร้อย ✅");
            return safeReply(`เกิดปัญหาบางส่วน: ${res1.error || res2.error} ❌`);
        }

    } catch (err) {
        console.error(`[INTERACTION ERROR] User: ${interaction.user?.tag} | Error: ${err.message}`);
        return safeReply("เกิดข้อผิดพลาดร้ายแรงภายในระบบ ❌");
    }
});

/* ===================== GLOBAL SAFETY NETS ===================== */
process.on("unhandledRejection", (reason, promise) => {
    console.error("[ANTI-CRASH] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("[ANTI-CRASH] Uncaught Exception:", err);
});

/* ===================== LOGIN ===================== */
client.login(TOKEN).catch(err => {
    console.error(`[CRITICAL] Login Failed: ${err.message}`);
    process.exit(1);
});