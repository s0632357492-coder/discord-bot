require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('setupverify')
    .setDescription('ตั้งค่าข้อความยืนยันตัวตน'),

  new SlashCommandBuilder()
    .setName('admcheck')
    .setDescription('เช็คคนที่ไม่ได้รับยศ')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands },
    );
    console.log('Deploy สำเร็จ');
  } catch (error) {
    console.error(error);
  }
})();