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
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

/* ===================== CONFIGURATION & CONSTANTS ===================== */
// Render uses process.env.PORT. Fallback to 3000 for local.
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, "welcome_config.json");

// CRITICAL: Check Environment Variables on startup
console.log("[STARTUP] TOKEN STATUS:", process.env.TOKEN ? "✅ OK" : "❌ MISSING");
if (!process.env.TOKEN) {
    console.error("[CRITICAL] TOKEN is missing in environment variables. Exiting...");
    process.exit(1);
}

// ============================================================
// VERIFIED ROLE IDs (branch roles + base verified role)
// ============================================================
const VERIFIED_ROLES = [
    "1456568276019843175", // ✅ Verified (base role)
    "1470963054995832875", // บุคคลภายนอก
    "1471033043992051765", // ปวช. การบัญชี
    "1471033226515447809", // ปวช. การตลาด
    "1471033642850717812", // ปวช. เทคโนโลยีสารสนเทศ
    "1471033451414290453", // ปวช. เทคโนโลยีธุรกิจดิจิทัล
    "1471033971121852416", // ปวช. ช่างยนต์
    "1471034152114720940", // ปวช. ช่างยานยนต์ไฟฟ้า
    "1471034320381804623", // ปวช. ช่างไฟฟ้า
    "1471034566910410793", // ปวช. ช่างอิเล็กทรอนิกส์
    "1471034832988405771", // ปวช. ช่างกลโรงงาน
    "1471036689420914820", // ปวช. ช่างเมคคาทรอนิกส์
    "1471694828223074500", // ปวส. การบัญชี
    "1471695121010397184", // ปวส. การตลาด
    "1471696205091311617", // ปวส. เทคโนโลยีธุรกิจดิจิทัล
    "1471696512525533245", // ปวส. ธุรกิจอีคอมเมิร์ซ
    "1471696656406937842", // ปวส. เทคโนโลยีสารสนเทศ
    "1471696892126691519", // ปวส. คอมพิวเตอร์เกมและแอนิเมชัน
    "1471697294364770495", // ปวส. เทคนิคเครื่องกล
    "1471697587684774052", // ปวส. เทคนิคยานยนต์ไฟฟ้า
    "1471697745692721244", // ปวส. ไฟฟ้า
    "1471698117563912232", // ปวส. เทคโนโลยีอิเล็กทรอนิกส์
    "1471698431104909502", // ปวส. เทคนิคอุตสาหกรรม
    "1471698647027679374"  // ปวส. เมคคาทรอนิกส์และหุ่นยนต์
];

/* ===================== SAFE CONFIG MANAGER ===================== */
const ConfigManager = {
    read() {
        try {
            if (!fs.existsSync(CONFIG_PATH)) {
                console.log("[CONFIG] File not found, creating new welcome_config.json");
                fs.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2));
                return {};
            }
            const data = fs.readFileSync(CONFIG_PATH, "utf8");
            return JSON.parse(data || "{}");
        } catch (error) {
            console.error(`[CONFIG ERROR] Read Failure: ${error.message}`);
            return {};
        }
    },
    save(config) {
        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error(`[CONFIG ERROR] Save Failure: ${error.message}`);
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

        if (!role) throw new Error(`Role ID ${roleId} not found in this guild.`);
        if (member.roles.cache.has(roleId)) return { success: true, alreadyHas: true };

        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            throw new Error("Bot is missing 'Manage Roles' permission.");
        }

        if (botMember.roles.highest.position <= role.position) {
            throw new Error(`Hierarchy Error: Bot role is below or equal to '${role.name}'. Move the bot role higher.`);
        }

        await member.roles.add(role);
        console.log(`[ROLE] ✅ Gave role '${role.name}' to ${member.user.tag}`);
        return { success: true, alreadyHas: false };
    } catch (error) {
        console.error(`[ROLE ERROR] User: ${member.user.tag} | Role: ${roleId} | Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/* ===================== WEB SERVER (KEEP-ALIVE FOR RENDER) ===================== */
const app = express();
app.get("/", (req, res) => res.status(200).send("Bot is alive ✅"));
app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYSTEM] Express server running on 0.0.0.0:${PORT}`);
});

/* ===================== DISCORD CLIENT ===================== */
// NOTE: Enable 'Server Members Intent' in Discord Developer Portal → Bot → Privileged Gateway Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

client.once("ready", () => {
    console.log(`[BOT] ✅ Online as: ${client.user.tag}`);
    console.log(`[BOT] Client ID: ${client.user.id}`);
});

/* ===================== WELCOME EVENT ===================== */
client.on("guildMemberAdd", async (member) => {
    try {
        const config = ConfigManager.read();
        const guildConfig = config[member.guild.id];

        if (!guildConfig || !guildConfig.enabled || !guildConfig.channelId) return;

        const channel = await member.guild.channels.fetch(guildConfig.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.warn(`[WELCOME WARN] Channel invalid for guild ${member.guild.id}`);
            return;
        }

        const imageURL = (guildConfig.imageURL && guildConfig.imageURL.startsWith("http"))
            ? guildConfig.imageURL
            : null;

        const welcomeEmbed = new EmbedBuilder()
            .setColor("#ff7dfb")
            .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
            .setTitle("Welcome to 【 🌸 SENSAWAI 🎐 】")
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
        console.error(`[WELCOME ERROR] Failed for ${member.user.tag}: ${error.message}`);
    }
});

/* ===================== INTERACTION HANDLER ===================== */
client.on("interactionCreate", async (interaction) => {

    // ── Safe Reply Helper ──────────────────────────────────────────────────────
    // Always use this instead of interaction.reply() directly to avoid double-reply errors.
    const safeReply = async (content, ephemeral = true) => {
        try {
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply({ content });
            }
            return await interaction.reply({ content, ephemeral });
        } catch (e) {
            console.error(`[SAFE REPLY ERROR] ${e.message}`);
        }
    };

    try {

        // ══════════════════════════════════════════════════════════════════════
        //  SLASH COMMANDS
        // ══════════════════════════════════════════════════════════════════════
        if (interaction.isChatInputCommand()) {
            const { commandName, member, guildId, options } = interaction;

            // ── /welcome ──────────────────────────────────────────────────────
            if (commandName === "welcome") {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return safeReply("คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌");
                }

                const channel = options.getChannel("channel");
                const imageURL = options.getString("image");

                if (!channel || !channel.isTextBased()) return safeReply("กรุณาเลือก Text Channel ที่ถูกต้อง ❌");
                if (!imageURL || !imageURL.startsWith("http")) return safeReply("กรุณาใส่ Image URL ที่ถูกต้อง (http/https) ❌");

                const config = ConfigManager.read();
                config[guildId] = { enabled: true, channelId: channel.id, imageURL };

                if (ConfigManager.save(config)) return safeReply(`ตั้งค่าระบบ welcome สำเร็จ → <#${channel.id}> ✅`);
                return safeReply("เกิดข้อผิดพลาดในการบันทึกข้อมูล ❌");
            }

            // ── /stopw ────────────────────────────────────────────────────────
            if (commandName === "stopw") {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return safeReply("คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌");
                }

                const config = ConfigManager.read();
                if (config[guildId]) {
                    config[guildId].enabled = false;
                    ConfigManager.save(config);
                }
                return safeReply("ปิดระบบต้อนรับเรียบร้อยแล้ว ✅");
            }

            // ── /setupverify ──────────────────────────────────────────────────
            // FIX: customId ของปุ่มต้องตรงกับ handler ด้านล่างทุกตัว
            // ✅ pvc         → handler: isButton() "pvc"
            // ✅ pvs         → handler: isButton() "pvs"
            // ✅ external    → handler: isButton() "external"
            if (commandName === "setupverify") {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return safeReply("คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌");
                }

                const verifyEmbed = new EmbedBuilder()
                    .setColor(0xFFC0CB)
                    .setTitle("👾 เลือกยศให้ตรงกับตัวเอง 👾")
                    .setDescription("กรุณาเลือกประเภทด้านล่าง")
                    .setImage("https://media.tenor.com/x5B-vDGxlNIAAAAC/banner-kawaii.gif");

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("pvc")           // ← ตรงกับ handler "pvc"
                        .setLabel("นักศึกษา ปวช.")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("pvs")           // ← ตรงกับ handler "pvs"
                        .setLabel("นักศึกษา ปวส.")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("external")      // ← ตรงกับ handler "external"
                        .setLabel("บุคคลภายนอก")
                        .setStyle(ButtonStyle.Secondary)
                );

                return interaction.reply({ embeds: [verifyEmbed], components: [row] });
            }

            // ── /admcheck ─────────────────────────────────────────────────────
            if (commandName === "admcheck") {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return safeReply("คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌");
                }

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

        // ══════════════════════════════════════════════════════════════════════
        //  BUTTONS
        // ══════════════════════════════════════════════════════════════════════
        if (interaction.isButton()) {
            const { customId, member } = interaction;
            console.log(`[BUTTON] customId: "${customId}" | User: ${interaction.user.tag}`);

            // ── pvc: นักศึกษา ปวช. → เปิด Select Menu ──────────────────────
            if (customId === "pvc") {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId("pvc_select")        // ← ตรงกับ handler "pvc_select"
                    .setPlaceholder("เลือกสาขา ปวช.")
                    .addOptions([
                        { label: "การบัญชี",               value: "1471033043992051765" },
                        { label: "การตลาด",                value: "1471033226515447809" },
                        { label: "เทคโนโลยีสารสนเทศ",      value: "1471033642850717812" },
                        { label: "เทคโนโลยีธุรกิจดิจิทัล", value: "1471033451414290453" },
                        { label: "ช่างยนต์",               value: "1471033971121852416" },
                        { label: "ช่างยานยนต์ไฟฟ้า",       value: "1471034152114720940" },
                        { label: "ช่างไฟฟ้า",              value: "1471034320381804623" },
                        { label: "ช่างอิเล็กทรอนิกส์",    value: "1471034566910410793" },
                        { label: "ช่างกลโรงงาน",           value: "1471034832988405771" },
                        { label: "ช่างเมคคาทรอนิกส์",     value: "1471036689420914820" }
                    ]);

                return await interaction.reply({
                    content: "กรุณาเลือกสาขา ปวช. ของคุณ:",
                    components: [new ActionRowBuilder().addComponents(menu)],
                    ephemeral: true
                });
            }

            // ── pvs: นักศึกษา ปวส. → เปิด Select Menu ──────────────────────
            if (customId === "pvs") {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId("pvs_select")        // ← ตรงกับ handler "pvs_select"
                    .setPlaceholder("เลือกสาขา ปวส.")
                    .addOptions([
                        { label: "การบัญชี",                    value: "1471694828223074500" },
                        { label: "การตลาด",                     value: "1471695121010397184" },
                        { label: "เทคโนโลยีธุรกิจดิจิทัล",    value: "1471696205091311617" },
                        { label: "ธุรกิจอีคอมเมิร์ซ",          value: "1471696512525533245" },
                        { label: "เทคโนโลยีสารสนเทศ",          value: "1471696656406937842" },
                        { label: "คอมพิวเตอร์เกมและแอนิเมชัน", value: "1471696892126691519" },
                        { label: "เทคนิคเครื่องกล",             value: "1471697294364770495" },
                        { label: "เทคนิคยานยนต์ไฟฟ้า",         value: "1471697587684774052" },
                        { label: "ไฟฟ้า",                      value: "1471697745692721244" },
                        { label: "เทคโนโลยีอิเล็กทรอนิกส์",   value: "1471698117563912232" },
                        { label: "เทคนิคอุตสาหกรรม",           value: "1471698431104909502" },
                        { label: "เมคคาทรอนิกส์และหุ่นยนต์",  value: "1471698647027679374" }
                    ]);

                return await interaction.reply({
                    content: "กรุณาเลือกสาขา ปวส. ของคุณ:",
                    components: [new ActionRowBuilder().addComponents(menu)],
                    ephemeral: true
                });
            }

            // ── external: บุคคลภายนอก → เปิด Modal ──────────────────────────
            // FIX: ต้องใช้ showModal() และ ห้าม deferReply() ก่อน showModal()
            if (customId === "external") {
                const modal = new ModalBuilder()
                    .setCustomId("external_apply_modal") // ← ตรงกับ handler "external_apply_modal"
                    .setTitle("สมัครบุคคลภายนอก");

                const fullNameInput = new TextInputBuilder()
                    .setCustomId("fullname_input")
                    .setLabel("ชื่อ-นามสกุล (Full Name)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const ageInput = new TextInputBuilder()
                    .setCustomId("age_input")
                    .setLabel("อายุ (Age)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const relationInput = new TextInputBuilder()
                    .setCustomId("relation_input")
                    .setLabel("ความเกี่ยวข้องกับวิทยาลัย")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const inviteInput = new TextInputBuilder()
                    .setCustomId("invite_input")
                    .setLabel("ผู้แนะนำ (ใส่ - หากไม่มี)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder("-");

                const reasonInput = new TextInputBuilder()
                    .setCustomId("reason_input")
                    .setLabel("เหตุผลที่เข้ามา")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(fullNameInput),
                    new ActionRowBuilder().addComponents(ageInput),
                    new ActionRowBuilder().addComponents(relationInput),
                    new ActionRowBuilder().addComponents(inviteInput),
                    new ActionRowBuilder().addComponents(reasonInput)
                );

                // showModal() ห้าม deferReply() ก่อน — ต้อง return ทันที
                return await interaction.showModal(modal);
            }

            // ── Unknown Button ────────────────────────────────────────────────
            // Catch-all: ป้องกัน "Interaction Failed" สำหรับปุ่มที่ไม่รู้จัก
            console.warn(`[BUTTON WARN] Unhandled customId: "${customId}"`);
            return safeReply("ปุ่มนี้ไม่รองรับแล้ว กรุณาติดต่อ Admin ❌");
        }

        // ══════════════════════════════════════════════════════════════════════
        //  MODAL SUBMIT
        // ══════════════════════════════════════════════════════════════════════
        if (interaction.isModalSubmit()) {
            const { customId } = interaction;
            console.log(`[MODAL] customId: "${customId}" | User: ${interaction.user.tag}`);

            // ── external_apply_modal ─────────────────────────────────────────
            if (customId === "external_apply_modal") {
                await interaction.deferReply({ ephemeral: true });

                const fullName  = interaction.fields.getTextInputValue("fullname_input");
                const age       = interaction.fields.getTextInputValue("age_input");
                const relation  = interaction.fields.getTextInputValue("relation_input");
                const invitedBy = interaction.fields.getTextInputValue("invite_input") || "-";
                const reason    = interaction.fields.getTextInputValue("reason_input");

                // ส่ง Embed ไปห้องสมัคร
                const applicationChannel = await interaction.client.channels
                    .fetch("1496161996670767234")
                    .catch(() => null);

                if (!applicationChannel || !applicationChannel.isTextBased()) {
                    return safeReply("ไม่พบห้องรับใบสมัคร กรุณาติดต่อ Admin ❌");
                }

                const embed = new EmbedBuilder()
                    .setTitle("📋 ใบสมัครบุคคลภายนอก")
                    .setColor(0xFFC0CB)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: "👤 ชื่อ-นามสกุล",            value: fullName,  inline: false },
                        { name: "🎂 อายุ",                     value: age,       inline: false },
                        { name: "🏫 ความเกี่ยวข้องกับวิทยาลัย", value: relation,  inline: false },
                        { name: "👥 ผู้แนะนำ",                 value: invitedBy, inline: false },
                        { name: "📝 เหตุผลที่เข้ามา",          value: reason,    inline: false }
                    )
                    .setFooter({ text: `User: ${interaction.user.tag} | ID: ${interaction.user.id}` })
                    .setTimestamp();

                await applicationChannel.send({
                    content: `<@${interaction.user.id}> <@&1460282155413278863>`,
                    embeds: [embed]
                });

                console.log(`[MODAL] External application submitted by ${interaction.user.tag}`);
                return safeReply("ส่งใบสมัครเรียบร้อยแล้ว ✅ Admin จะติดต่อกลับในเร็วๆ นี้");
            }

            // ── Unknown Modal ─────────────────────────────────────────────────
            console.warn(`[MODAL WARN] Unhandled customId: "${customId}"`);
            return safeReply("Modal นี้ไม่รองรับ กรุณาติดต่อ Admin ❌");
        }

        // ══════════════════════════════════════════════════════════════════════
        //  SELECT MENUS
        // ══════════════════════════════════════════════════════════════════════
        if (interaction.isStringSelectMenu()) {
            const { customId, member } = interaction;
            console.log(`[SELECT] customId: "${customId}" | User: ${interaction.user.tag} | Value: ${interaction.values[0]}`);

            // ── pvc_select & pvs_select ───────────────────────────────────────
            if (customId === "pvc_select" || customId === "pvs_select") {
                await interaction.deferReply({ ephemeral: true });

                const roleId       = interaction.values[0];
                const verifiedRole = "1456568276019843175"; // ✅ Verified (base role)

                const [res1, res2] = await Promise.all([
                    safelyAddRole(member, roleId),
                    safelyAddRole(member, verifiedRole)
                ]);

                if (res1.success && res2.success) {
                    const msg = res1.alreadyHas
                        ? "คุณมียศสาขานี้อยู่แล้ว แต่ได้รับยศ Verified เรียบร้อย ✅"
                        : "ได้รับยศสาขาและยืนยันตัวตนเรียบร้อยแล้ว ✅";
                    return safeReply(msg);
                }

                const errMsg = res1.error || res2.error || "Unknown Error";
                return safeReply(`เกิดปัญหาในการให้ยศ: ${errMsg} ❌`);
            }

            // ── Unknown Select Menu ───────────────────────────────────────────
            console.warn(`[SELECT WARN] Unhandled customId: "${customId}"`);
            return safeReply("Select menu นี้ไม่รองรับ กรุณาติดต่อ Admin ❌");
        }

    } catch (err) {
        const id = interaction.customId || interaction.commandName || "Unknown";
        console.error(`[INTERACTION ERROR] id: "${id}" | User: ${interaction.user?.tag} | ${err.stack}`);
        // พยายาม reply error ให้ผู้ใช้แทนที่จะปล่อยให้ timeout
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply("เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่ ❌");
            } else if (interaction.isModalSubmit && !interaction.isModalSubmit()) {
                await interaction.reply({ content: "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่ ❌", ephemeral: true });
            }
        } catch (_) { /* ignore secondary error */ }
    }
});

/* ===================== GLOBAL SAFETY NETS (ANTI-CRASH) ===================== */
process.on("unhandledRejection", err => {
    console.error(`[ANTI-CRASH] Unhandled Rejection:\n${err?.stack || err}`);
});
process.on("uncaughtException", err => {
    console.error(`[ANTI-CRASH] Uncaught Exception:\n${err?.stack || err}`);
});

/* ===================== BOT LOGIN ===================== */
client.login(process.env.TOKEN).catch(err => {
    console.error(`[CRITICAL] Discord Login Failed: ${err.message}`);
    process.exit(1);
});
