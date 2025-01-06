import dotenv from "dotenv";
dotenv.config();

import cron from 'node-cron'
import { DiscordController } from './DiscordController'

import startBackup from './backup'
import { BackupDestination } from "./backup/BackupDestination";
import { LocalBackupDestination } from "./backup/LocalBackupDestination";
import { S3BackupDestination } from "./backup/S3BackupDestination";

const discordController = new DiscordController(process.env.DISCORD_BOT_TOKEN);

const destinations: BackupDestination[] = [];

if (process.env.LOCAL_BACKUP_PATH) {
  console.log("Local backups configured!");
  
  destinations.push(new LocalBackupDestination(process.env.LOCAL_BACKUP_PATH));
}

if (process.env.AWS_ACCESS_ID && process.env.AWS_SECRET && process.env.AWS_BUCKET_NAME && process.env.AWS_REGION) {
  console.log("AWS backups configured!");

  destinations.push(new S3BackupDestination(
    process.env.AWS_ACCESS_ID,
    process.env.AWS_SECRET,
    process.env.AWS_BUCKET_NAME,
    process.env.AWS_REGION
  ))
}

if (destinations.length === 0) {
  console.error("No backup destinations configured, please modify .env");
  process.exit(1);
} else {
  // At 00:30 every day, https://crontab.guru/#30_0_*_*_*
  cron.schedule("30 0 * * *", () => {
    startBackup(discordController, destinations);
  })

  setTimeout(() => {
    startBackup(discordController, destinations);
  }, 1000 * 5); // wait 5 seconds after boot to backup
}