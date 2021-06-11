import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

import AWS from 'aws-sdk';
import { DiscordController } from './DiscordController';
import Discord from 'discord.js'

export default (discordController: DiscordController) => {
  const { AWS_ACCESS_ID, AWS_SECRET, AWS_BUCKET_NAME, AWS_REGION } = process.env;

  AWS.config.update({
    accessKeyId: AWS_ACCESS_ID,
    secretAccessKey: AWS_SECRET,
    region: AWS_REGION
  })

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

  const output = fs.createWriteStream(targetFolderPath + backupFolderName + ".zip");
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  output.on('close', function () {
    console.log('[BACKUP] Archive is ' + archive.pointer() + ' total bytes');

    discordController.sendMessage(
      new Discord.MessageEmbed()
        .setTitle("Backup Upload Starting...")
        .setDescription(`File size is ${formatBytes(archive.pointer())}`),
      process.env.DISCORD_GUILD_ID,
      process.env.DISCORD_BACKUPS_CHANNEL_ID
    );

    uploadToS3(
      fs.readFileSync(targetFolderPath + backupFolderName + ".zip"),
      backupFolderName + ".zip",
      targetFolderPath + backupFolderName
    );
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

  function uploadToS3(zip: Buffer, fileName: string, backupFolder: string) {
    const s3 = new AWS.S3();

    const params = {
      Bucket: AWS_BUCKET_NAME ?? "",
      Key: fileName,
      Body: zip,
      ACL: 'public-read'
    };

    s3.upload(params, (err: any, data: any) => {
      try {
        console.log("[BACKUP] Nuking backup folder & zip")

        deleteFolderRecursive(backupFolder);
        fs.rmSync(backupFolder + ".zip");
      } catch (error) {
        console.error(error);
      }

      if (err) {
        throw err;
      }

      console.log(`[BACKUP] Upload successful. Location: ${data.Location}. See you in a few days`);
      discordController.sendMessage(
        new Discord.MessageEmbed()
          .setTitle("Backup Complete!")
          .setColor("#00ff00")
          .setDescription(`Total zipped file size is ${formatBytes(archive.pointer())}`)
          .setFooter(data.Location)
          .setURL(data.Location),
        process.env.DISCORD_GUILD_ID,
        process.env.DISCORD_BACKUPS_CHANNEL_ID
      );
    });
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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