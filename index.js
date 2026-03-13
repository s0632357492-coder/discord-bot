require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

new SlashCommandBuilder()
.setName('setupverify')
.setDescription('เปิดระบบยืนยันตัวตน'),

new SlashCommandBuilder()
.setName('admcheck')
.setDescription('เช็คคนที่ยังไม่ได้รับยศ')

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
try {
console.log('กำลังลงทะเบียนคำสั่ง...');

await rest.put(
Routes.applicationGuildCommands(
process.env.CLIENT_ID,
process.env.GUILD_ID
),
{ body: commands },
);

console.log('ลงทะเบียนสำเร็จแล้ว ✅');

} catch (error) {
console.error('เกิดข้อผิดพลาด:', error);
}
})();

require("dotenv").config();

const express = require("express");
const {
Client,
GatewayIntentBits,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require("discord.js");

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
GatewayIntentBits.GuildMembers
]
});

client.once("clientReady", () => {
console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {

try {

/* ===================== SLASH COMMAND ===================== */
if (interaction.isChatInputCommand()) {

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

if (interaction.commandName === "admcheck") {

await interaction.deferReply({ ephemeral: true });

const verifiedRoles = [

"1456568276019843175",
"1470963054995832875",

"1471033043992051765",
"1471033226515447809",
"1471033642850717812",
"1471033451414290453",
"1471033971121852416",
"1471034152114720940",
"1471034320381804623",
"1471034566910410793",
"1471034832988405771",
"1471036689420914820",

"1471694828223074500",
"1471695121010397184",
"1471696205091311617",
"1471696512525533245",
"1471696656406937842",
"1471696892126691519",
"1471697294364770495",
"1471697587684774052",
"1471697745692721244",
"1471698117563912232",
"1471698431104909502",
"1471698647027679374"

];

await interaction.guild.members.fetch();

const notVerified = interaction.guild.members.cache.filter(member => {
if (member.user.bot) return false;
return !verifiedRoles.some(roleId =>
member.roles.cache.has(roleId)
);
});

if (notVerified.size === 0)
return interaction.editReply("ทุกคนได้รับยศแล้ว ✅");

let list = notVerified.map(m => `<@${m.id}>`).join("\n");

if (list.length > 1900)
list = list.substring(0, 1900) + "\n...";

return interaction.editReply(
`📋 คนที่ยังไม่ได้รับยศ (${notVerified.size} คน):\n\n${list}`
);

}

}

/* ===================== BUTTON ===================== */
if (interaction.isButton()) {

if (interaction.customId === "external") {

await interaction.deferReply({ ephemeral: true });

await interaction.member.roles.add("1470963054995832875");

return interaction.editReply({
content: "ได้รับยศแล้ว ✅"
});

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

return interaction.editReply({
content: "ได้รับยศเรียบร้อย ✅"
});

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
console.log("FORCE UPDATE v3");