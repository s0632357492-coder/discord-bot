require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, ChannelType } = require("discord.js");

const commands = [
    // Verification System
    new SlashCommandBuilder()
        .setName("setupverify")
        .setDescription("เปิดระบบยืนยันตัวตน (Admin Only)"),

    new SlashCommandBuilder()
        .setName("admcheck")
        .setDescription("เช็คคนที่ยังไม่ได้รับยศ (Admin Only)"),

    // Welcome System
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
                .setDescription("URL ของรูปภาพ/GIF สำหรับ Embed")
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName("stopw")
        .setDescription("ปิดระบบต้อนรับ")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("🚀 Starting Slash Commands registration...");
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );
        console.log("✅ Successfully registered all commands.");
    } catch (error) {
        console.error("❌ Registration Error:", error);
    }
})();