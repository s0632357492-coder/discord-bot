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
    PermissionFlagsBits
} = require("discord.js");

/* ===================== CONFIG FILE PATH ===================== */
const configPath = path.join(__dirname, "welcome_config.json");

/* ===================== HELPER FUNCTIONS ===================== */
function readConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({}, null, 2));
            return {};
        }
        const data = fs.readFileSync(configPath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading config:", error);
        return {};
    }
}

function saveConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error("Error saving config:", error);
    }
}

/* ===================== ANTI CRASH ===================== */
process.on("unhandledRejection", err => {
    console.error("Unhandled rejection:", err);
});

process.on("uncaughtException", err => {
    console.error("Uncaught exception:", err);
});

/* ===================== WEB SERVER (สำหรับ Render) ===================== */
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
    res.status(200).send("Bot is alive!");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web server running on port ${PORT}`);
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
    console.log(`Logged in as ${client.user.tag}`);
    console.log("FORCE UPDATE v3 + Welcome System Active");
});

/* ===================== WELCOME EVENT ===================== */
client.on("guildMemberAdd", async (member) => {
    try {
        console.log(`New member joined: ${member.user.tag} in ${member.guild.name}`);
        
        const config = readConfig();
        const guildConfig = config[member.guild.id];

        if (!guildConfig || !guildConfig.enabled) {
            return console.log(`Welcome system disabled for ${member.guild.name}`);
        }

        const channel = member.guild.channels.cache.get(guildConfig.channelId);
        if (!channel) {
            return console.error(`Welcome channel ${guildConfig.channelId} not found.`);
        }

        const welcomeEmbed = new EmbedBuilder()
            .setColor("#ffb7c5")
            .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
            .setTitle(`Welcome @${member.user.username} To 【 🌸 SENSAWAI 🎐 】`)
            .setDescription(
                `✧･ﾟ: *✧･ﾟ:* **Welcome** *:･ﾟ✧*:･ﾟ✧\n\n` +
                `➥ ยินดีต้อนรับสู่ 【 🌸 **SENSAWAI COMMUNITY** 🎐 】\n\n` +
                `➥ **Name** : ${member.user.username}\n` +
                `➥ **สมาชิกคนที่** : ${member.guild.memberCount}th\n\n` +
                `➥ ขอให้มีความสุขกับที่นี่นะ มาเป็นใบไม้ต้นเดียวกันนะ 💖\n\n` +
                `➥ กดรับยศที่ห้อง <#1456565359875457134> (โปรดตรวจสอบห้องยืนยัน)`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setImage(guildConfig.imageURL)
            .setFooter({ text: `${member.user.tag}`, iconURL: member.guild.iconURL() })
            .setTimestamp();

        await channel.send({ content: `Welcome <@${member.id}>`, embeds: [welcomeEmbed] });

    } catch (error) {
        console.error("Error in guildMemberAdd event:", error);
    }
});

/* ===================== INTERACTION HANDLER ===================== */
client.on("interactionCreate", async interaction => {
    try {
        /* ===================== SLASH COMMANDS ===================== */
        if (interaction.isChatInputCommand()) {
            
            // NEW: Setup Welcome
            if (interaction.commandName === "welcome") {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: "คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌", ephemeral: true });
                }

                const channel = interaction.options.getChannel("channel");
                const imageURL = interaction.options.getString("image");

                const config = readConfig();
                config[interaction.guildId] = {
                    enabled: true,
                    channelId: channel.id,
                    imageURL: imageURL
                };

                saveConfig(config);
                console.log(`Welcome configured for guild: ${interaction.guildId}`);
                
                return interaction.reply({ content: "ตั้งค่าระบบ welcome สำเร็จแล้ว ✅", ephemeral: true });
            }

            // NEW: Stop Welcome
            if (interaction.commandName === "stopw") {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: "คุณไม่มีสิทธิ์ใช้คำสั่งนี้ ❌", ephemeral: true });
                }

                const config = readConfig();
                if (config[interaction.guildId]) {
                    config[interaction.guildId].enabled = false;
                    saveConfig(config);
                }

                console.log(`Welcome disabled for guild: ${interaction.guildId}`);
                return interaction.reply({ content: "ปิดระบบต้อนรับเรียบร้อยแล้ว ❌", ephemeral: true });
            }

            // EXISTING: setupverify
            if (interaction.commandName === "setupverify") {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("pvc")
                        .setLabel("นักศึกษา ปวช.")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("pvs")
                        .setLabel("นักศึกษา ปวส.")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId("external")
                        .setLabel("บุคคลภายนอก")
                        .setStyle(ButtonStyle.Secondary)
                );

                return interaction.reply({
                    content: "กรุณาเลือกประเภท:",
                    components: [row]
                });
            }

            // EXISTING: admcheck
            if (interaction.commandName === "admcheck") {
                await interaction.deferReply({ ephemeral: true });

                const verifiedRoles = [
                    "1456568276019843175", "1470963054995832875", "1471033043992051765",
                    "1471033226515447809", "1471033642850717812", "1471033451414290453",
                    "1471033971121852416", "1471034152114720940", "1471034320381804623",
                    "1471034566910410793", "1471034832988405771", "1471036689420914820",
                    "1471694828223074500", "1471695121010397184", "1471696205091311617",
                    "1471696512525533245", "1471696656406937842", "1471696892126691519",
                    "1471697294364770495", "1471697587684774052", "1471697745692721244",
                    "1471698117563912232", "1471698431104909502", "1471698647027679374"
                ];

                await interaction.guild.members.fetch();
                const notVerified = interaction.guild.members.cache.filter(member => {
                    if (member.user.bot) return false;
                    return !verifiedRoles.some(roleId => member.roles.cache.has(roleId));
                });

                if (notVerified.size === 0) return interaction.editReply("ทุกคนได้รับยศแล้ว ✅");

                let list = notVerified.map(m => `<@${m.id}>`).join("\n");
                if (list.length > 1900) list = list.substring(0, 1900) + "\n...";

                return interaction.editReply(`📋 คนที่ยังไม่ได้รับยศ (${notVerified.size} คน):\n\n${list}`);
            }
        }

        /* ===================== BUTTONS ===================== */
        if (interaction.isButton()) {
            if (interaction.customId === "external") {
                await interaction.deferReply({ ephemeral: true });
                await interaction.member.roles.add("1470963054995832875");
                return interaction.editReply({ content: "ได้รับยศแล้ว ✅" });
            }

            if (interaction.customId === "pvc") {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId("pvc_select")
                    .setPlaceholder("เลือกสาขา ปวช.")
                    .addOptions([
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
                    ]);
                return interaction.reply({
                    content: "เลือกสาขา:",
                    components: [new ActionRowBuilder().addComponents(menu)],
                    ephemeral: true
                });
            }

            if (interaction.customId === "pvs") {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId("pvs_select")
                    .setPlaceholder("เลือกสาขา ปวส.")
                    .addOptions([
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
                    content: "เลือกสาขา:",
                    components: [new ActionRowBuilder().addComponents(menu)],
                    ephemeral: true
                });
            }
        }

        /* ===================== DROPDOWN ===================== */
        if (interaction.isStringSelectMenu()) {
            await interaction.deferReply({ ephemeral: true });
            const roleId = interaction.values[0];
            await interaction.member.roles.add(roleId);
            await interaction.member.roles.add("1456568276019843175");
            return interaction.editReply({ content: "ได้รับยศเรียบร้อย ✅" });
        }

    } catch (err) {
        console.error("Interaction Error:", err);
        if (interaction.deferred || interaction.replied) {
            interaction.editReply("เกิดข้อผิดพลาด ❌");
        } else {
            interaction.reply({ content: "เกิดข้อผิดพลาด ❌", ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);