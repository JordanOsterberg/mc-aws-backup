import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

import { DiscordController } from './DiscordController';
import Discord from 'discord.js'

import { BackupDestination } from './backup/BackupDestination';
import formatBytes from './util/formatBytes';

export default (discordController: DiscordController, backupDestinations: BackupDestination[]) => {
  const targetFolderPath = process.env.SERVER_FOLDER;
  if (targetFolderPath === undefined) {
    console.error("No SERVER_FOLDER environment variable supplied.")
    return;
  }

  const timestamp = Math.floor(new Date().getTime() / 1000);
  const backupFolderName = "backup" + timestamp;
  fs.mkdirSync(targetFolderPath + backupFolderName);

  console.log("[BACKUP] Copying all folders that start with `world` in " + targetFolderPath + " to `" + backupFolderName + "`");

  const files = fs.readdirSync(targetFolderPath);
  for (const file of files) {
    const path = targetFolderPath + file;

    const info = fs.lstatSync(path);
    if (!info.isDirectory()) continue;

    if (file.toLowerCase().startsWith("world")) {
      const destPath = targetFolderPath + backupFolderName + "/" + file;
      copyRecursiveSync(path, destPath);
      console.log("[BACKUP] Copied " + file + " into backup folder");
    }
  }

  const outputPath = targetFolderPath + backupFolderName + ".zip";
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  output.on('close', async function () {
    console.log('[BACKUP] Archive is ' + archive.pointer() + ' total bytes');

    for (const dest of backupDestinations) {
      discordController.sendMessage(
        new Discord.MessageEmbed()
          .setTitle(`${dest.name} Backup Starting...`)
          .setDescription(`File size is ${formatBytes(archive.pointer())}`),
        process.env.DISCORD_GUILD_ID,
        process.env.DISCORD_BACKUPS_CHANNEL_ID
      );

      const backupLocation = await dest.backup(outputPath);

      let embed = new Discord.MessageEmbed()
        .setTitle(`${dest.name} Backup Complete!`)
        .setColor("#00ff00")
        .setDescription(`Total zipped file size is ${formatBytes(archive.pointer())}`)
        .setFooter(backupLocation);

      if (backupLocation.startsWith("http") || backupLocation.startsWith("https")) {
        embed = embed.setURL(backupLocation);
      }

      discordController.sendMessage(
        embed,
        process.env.DISCORD_GUILD_ID,
        process.env.DISCORD_BACKUPS_CHANNEL_ID
      );
    }

    try {
      console.log("[BACKUP] Nuking backup folder & zip")

      deleteFolderRecursive(backupFolderName);
      fs.unlinkSync(outputPath);
    } catch (error) {
      console.error(error);
    }

    console.log(`[BACKUP] Backup successful`);
  });

  archive.on('error', function (err) {
    throw err;
  });

  archive.directory(targetFolderPath + backupFolderName, false);

  archive.pipe(output);
  archive.finalize();

  function copyRecursiveSync(src: any, dest: any) {
    var exists = fs.existsSync(src);
    if (!exists) return;

    var stats = exists && fs.statSync(src);
    var isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
      fs.mkdirSync(dest);
      fs.readdirSync(src).forEach(function (childItemName) {
        copyRecursiveSync(path.join(src, childItemName),
          path.join(dest, childItemName));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };
}

function deleteFolderRecursive(path: any) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};