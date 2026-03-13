require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

/* ================= COMMAND LIST ================= */

const commands = [

new SlashCommandBuilder()
.setName("setupverify")
.setDescription("เปิดระบบยืนยันตัวตน"),

new SlashCommandBuilder()
.setName("admcheck")
.setDescription("เช็คคนที่ยังไม่ได้รับยศ")

].map(command => command.toJSON());

/* ================= DISCORD REST ================= */

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

/* ================= DEPLOY COMMAND ================= */

(async () => {

try {

if (!process.env.TOKEN)
throw new Error("TOKEN not found in .env");

if (!process.env.CLIENT_ID)
throw new Error("CLIENT_ID not found in .env");

if (!process.env.GUILD_ID)
throw new Error("GUILD_ID not found in .env");

console.log("🚀 เริ่มลงทะเบียน Slash Commands...");

await rest.put(
Routes.applicationGuildCommands(
process.env.CLIENT_ID,
process.env.GUILD_ID
),
{ body: commands }
);

console.log("✅ ลงทะเบียนคำสั่งสำเร็จแล้ว");

} catch (error) {

console.error("❌ Deploy command error:");
console.error(error);

}

})();