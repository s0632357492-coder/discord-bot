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
