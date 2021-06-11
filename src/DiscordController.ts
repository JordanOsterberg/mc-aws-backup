import Discord from 'discord.js';

export class DiscordController {
  private client?: Discord.Client

  constructor(botToken?: string) {
    if (botToken === undefined) return;

    this.client = new Discord.Client();
    this.client.login(botToken);
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