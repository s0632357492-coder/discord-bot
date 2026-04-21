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

// CRITICAL: Check Environment Variables
console.log("TOKEN STATUS:", process.env.TOKEN ? "OK" : "MISSING");
if (!process.env.TOKEN) {
    console.error("[CRITICAL] TOKEN is missing in environment variables. Exiting...");
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

        if (!role) throw new Error(`Role ID ${roleId} not found.`);
        if (member.roles.cache.has(roleId)) return { success: true, alreadyHas: true };

        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            throw new Error("Missing 'Manage Roles' permission.");
        }

        if (botMember.roles.highest.position <= role.position) {
            throw new Error(`Hierarchy Error: Bot role is below '${role.name}'.`);
        }

        await member.roles.add(role);
        return { success: true, alreadyHas: false };
    } catch (error) {
        console.error(`[ROLE ERROR] User: ${member.user.tag} | Role: ${roleId} | Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/* ===================== WEB SERVER (KEEP-ALIVE) ===================== */
const app = express();
app.get("/", (req, res) => res.status(200).send("Bot is alive"));
app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYSTEM] Express server bound to 0.0.0.0:${PORT}`);
});

/* ===================== DISCORD CLIENT ===================== */
// NOTE: Ensure 'Server Members Intent' is ENABLED in the Discord Developer Portal
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

client.once("ready", () => {
    console.log("BOT ONLINE:", client.user.tag);
    console.log(`[SYSTEM] Client ID: ${client.user.id}`);
});

/* ===================== WELCOME EVENT ===================== */
client.on("guildMemberAdd", async (member) => {
    try {
        const config = ConfigManager.read();
        const guildConfig = config[member.guild.id];

        if (!guildConfig || !guildConfig.enabled || !guildConfig.channelId) return;

        const channel = await member.guild.channels.fetch(guildConfig.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            console.warn(`[EVENT WARN] Welcome channel for guild ${member.guild.id} is invalid.`);
            return;
        }

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
        console.error(`[EVENT ERROR] guildMemberAdd failed for ${member.user.tag}: ${error.message}`);
    }
});

/* ===================== INTERACTION HANDLER ===================== */
client.on("interactionCreate", async (interaction) => {
    const safeReply = async (content, ephemeral = true) => {
        try {
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply({ content });
            }
            return await interaction.reply({ content, ephemeral });
        } catch (e) {
            console.error(`[INTERACTION LOG] Failed to reply: ${e.message}`);
        }
    };

    try {
        // --- SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const { commandName, member, guildId, options } = interaction;

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

            // START setupverify
            if (commandName === "setupverify") {
                if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return safeReply("คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌");
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("external_apply_button")
                        .setLabel("Apply for External Rank")
                        .setStyle(ButtonStyle.Primary)
                );
                return interaction.reply({ content: "กดปุ่มด้านล่างเพื่อสมัครขอยศบุคคลภายนอก:", components: [row] });
            }
            // END setupverify

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

        // --- BUTTONS ---
        if (interaction.isButton()) {
            const member = interaction.member;

            // START setupverify – button handler
            if (interaction.customId === "external_apply_button") {
                const modal = new ModalBuilder()
                    .setCustomId("external_apply_modal")
                    .setTitle("External Rank Application");

                const fullNameInput = new TextInputBuilder()
                    .setCustomId("fullname_input")
                    .setLabel("Full Name")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const ageInput = new TextInputBuilder()
                    .setCustomId("age_input")
                    .setLabel("Age")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const relationInput = new TextInputBuilder()
                    .setCustomId("relation_input")
                    .setLabel("Relation to the college")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const inviteInput = new TextInputBuilder()
                    .setCustomId("invite_input")
                    .setLabel("Invited by (ใส่ - หากไม่มี)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder("-");

                const reasonInput = new TextInputBuilder()
                    .setCustomId("reason_input")
                    .setLabel("Reason for joining")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(fullNameInput),
                    new ActionRowBuilder().addComponents(ageInput),
                    new ActionRowBuilder().addComponents(relationInput),
                    new ActionRowBuilder().addComponents(inviteInput),
                    new ActionRowBuilder().addComponents(reasonInput)
                );

                return interaction.showModal(modal);
            }
            // END setupverify – button handler

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

                return await interaction.reply({
                    content: `กรุณาเลือกสาขา ${isPVC ? "ปวช." : "ปวส."}:`,
                    components: [new ActionRowBuilder().addComponents(menu)],
                    ephemeral: true
                });
            }
        }

        // START setupverify – modal submit handler
        if (interaction.isModalSubmit() && interaction.customId === "external_apply_modal") {
            await interaction.deferReply({ ephemeral: true });

            const fullName = interaction.fields.getTextInputValue("fullname_input");
            const age      = interaction.fields.getTextInputValue("age_input");
            const relation = interaction.fields.getTextInputValue("relation_input");
            const invitedBy = interaction.fields.getTextInputValue("invite_input") || "-";
            const reason   = interaction.fields.getTextInputValue("reason_input");

            const applicationChannel = await interaction.client.channels.fetch("1496161996670767234").catch(() => null);
            if (!applicationChannel || !applicationChannel.isTextBased()) {
                return safeReply("ไม่พบห้องสำหรับรับใบสมัคร กรุณาติดต่อ Admin ❌");
            }

            const embed = new EmbedBuilder()
                .setTitle("External Rank Application")
                .setColor(0xFFC0CB)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: "Full Name",               value: fullName,  inline: false },
                    { name: "Age",                     value: age,       inline: false },
                    { name: "Relation to the college", value: relation,  inline: false },
                    { name: "Invited by",              value: invitedBy, inline: false },
                    { name: "Reason for joining",      value: reason,    inline: false }
                )
                .setFooter({ text: `User ID: ${interaction.user.id}` })
                .setTimestamp();

            await applicationChannel.send({
                content: `<@${interaction.user.id}> <@&1460282155413278863>`,
                embeds: [embed]
            });

            return safeReply("ส่งใบสมัครของคุณเรียบร้อยแล้ว ✅ Admin จะติดต่อกลับในเร็วๆ นี้");
        }
        // END setupverify – modal submit handler

        // --- SELECT MENUS ---
        if (interaction.isStringSelectMenu()) {
            await interaction.deferReply({ ephemeral: true });
            const member = interaction.member;
            const roleId = interaction.values[0];
            const verifiedRole = "1456568276019843175";

            const res1 = await safelyAddRole(member, roleId);
            const res2 = await safelyAddRole(member, verifiedRole);

            if (res1.success && res2.success) return safeReply("ได้รับยศและยืนยันตัวตนเรียบร้อย ✅");
            return safeReply(`เกิดปัญหาบางส่วน: ${res1.error || res2.error || "Unknown Error"} ❌`);
        }

    } catch (err) {
        console.error(`[INTERACTION ERROR] Action: ${interaction.customId || interaction.commandName || "Unknown"} | User: ${interaction.user?.tag} | Error: ${err.message}`);
        return safeReply("เกิดข้อผิดพลาดร้ายแรงภายในระบบ ❌");
    }
});

/* ===================== GLOBAL SAFETY NETS ===================== */
process.on("unhandledRejection", err => console.error(`[ANTI-CRASH] Unhandled Rejection: ${err.stack}`));
process.on("uncaughtException", err => console.error(`[ANTI-CRASH] Uncaught Exception: ${err.stack}`));

/* ===================== BOT LOGIN ===================== */
client.login(process.env.TOKEN).catch(err => {
    console.error(`[CRITICAL] Discord Login Failed: ${err.message}`);
    process.exit(1);
});