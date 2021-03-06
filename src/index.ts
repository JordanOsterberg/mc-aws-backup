import dotenv from "dotenv";
dotenv.config();

import cron from 'node-cron'
import { DiscordController } from './DiscordController'

import startBackup from './backup'

const discordController = new DiscordController(
  process.env.DISCORD_BOT_TOKEN, 
  process.env.DISCORD_LISTEN_FOR_START_BACKUP_COMMAND === 'true',
  () => {
    startBackup(discordController);
  }
);

// At 00:30 on Sunday, Tuesday, and Thursday, https://crontab.guru/#30_0_*_*_0,2,4
cron.schedule("30 0 * * 0,2,4", () => {
  startBackup(discordController);
})

setTimeout(() => {
  startBackup(discordController);
}, 1000 * 5); // wait 5 seconds after boot to backup