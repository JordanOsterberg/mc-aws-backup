import Discord from 'discord.js';

export class DiscordController {
  private client?: Discord.Client

  constructor(botToken: string | undefined, shouldHandleStartCommand: boolean = true, startBackupCommandProcessor: () => void) {
    if (botToken === undefined) return;

    this.client = new Discord.Client();
    this.client.login(botToken);
    if (shouldHandleStartCommand) {
      console.log("Allowed to handle start command");
      
      this.client.on("message", (message: Discord.Message) => {
        if (message.channel.id !== process.env.DISCORD_BACKUPS_CHANNEL_ID) return;
        if (message.content.toLowerCase() !== "!startbackup") return;
        if (!message.member?.guild.member(message.author)?.hasPermission('ADMINISTRATOR')) return;

        startBackupCommandProcessor()
      });
    }
  }

  public sendMessage = async (
    message: Discord.MessageEmbed, 
    guildId?: string, 
    channelId?: string
  ) => {
    if (this.client === undefined) {
      return console.warn("Discord bot token was not supplied. Failed to send message.")
    }

    if (guildId === undefined || channelId === undefined) {
      return console.warn("Failed to send message- guildId or channelId supplie was undefined")
    }

    const guild = await this.client.guilds.fetch(guildId);
    if (guild === undefined) {
      return console.warn(`Failed to send message to guild channel with id ${guildId}/${channelId}`)
    }

    let channel = guild.channels.cache.get(channelId);
    if (channel?.isText) {
      (channel as Discord.TextChannel)
        .send(message)
    } else {
      console.log(`Not a text chanel, or undefined ${channelId}, ${guild.name}`)
    }
  }
}