require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, ChannelType } = require("discord.js");

/* ================= COMMAND LIST ================= */

const commands = [
    // Existing Commands
    new SlashCommandBuilder()
        .setName("setupverify")
        .setDescription("เปิดระบบยืนยันตัวตน"),

    new SlashCommandBuilder()
        .setName("admcheck")
        .setDescription("เช็คคนที่ยังไม่ได้รับยศ"),

    // NEW: Welcome System Commands
    new SlashCommandBuilder()
        .setName("welcome")
        .setDescription("ตั้งค่าระบบต้อนรับ")
        .addChannelOption(option => 
            option.setName("channel")
                .setDescription("ห้องที่ต้องการให้ส่งข้อความต้อนรับ")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option => 
            option.setName("image")
                .setDescription("URL ของรูปภาพ Embed (GIF/PNG/JPG)")
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName("stopw")
        .setDescription("ปิดระบบต้อนรับ")

].map(command => command.toJSON());

/* ================= DISCORD REST ================= */

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

/* ================= DEPLOY COMMAND ================= */

(async () => {
    try {
        if (!process.env.TOKEN) throw new Error("TOKEN not found in .env");
        if (!process.env.CLIENT_ID) throw new Error("CLIENT_ID not found in .env");
        if (!process.env.GUILD_ID) throw new Error("GUILD_ID not found in .env");

        console.log("🚀 เริ่มลงทะเบียน Slash Commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✅ ลงทะเบียนคำสั่งสำเร็จแล้ว (รวมระบบ Welcome)");

    } catch (error) {
        console.error("❌ Deploy command error:");
        console.error(error);
    }
})();