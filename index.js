import { Client, GatewayIntentBits } from "discord.js";
import TelegramBot from "node-telegram-bot-api";
import { PushAPI, CONSTANTS } from "@pushprotocol/restapi";
import ethers from "ethers";
import dotenv from "dotenv";

dotenv.config();

class MessageRelaySystem {
  constructor(config) {
    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.telegramBot = new TelegramBot(config.telegramToken, { polling: true });
    this.discordChannelId = config.discordChannelId;
    this.telegramChatId = config.telegramChatId;

    // Initialize Push Protocol signer
    this.signer = new ethers.Wallet(config.pushPrivateKey);
    this.pushChannelAddress = config.pushChannelAddress;
  }

  async initialize() {
    try {
      // Initialize Push user with proper configuration
      this.pushUser = await PushAPI.initialize(this.signer, {
        env: process.env.PUSH_ENV || CONSTANTS.ENV.PROD,
      });

      // Initialize Push stream
      const pushStream = await this.pushUser.initStream([
        CONSTANTS.STREAM.CHAT,
      ]);

      // Set up stream event listeners
      pushStream.on(CONSTANTS.STREAM.CONNECT, () => {
        console.log("Push Protocol stream connected");
      });

      pushStream.on(CONSTANTS.STREAM.DISCONNECT, () => {
        console.log("Push Protocol stream disconnected");
      });

      pushStream.on(CONSTANTS.STREAM.CHAT, this.handlePushMessage.bind(this));

      // Connect the stream
      await pushStream.connect();

      // Store stream reference for cleanup
      this.pushStream = pushStream;

      // Set up Discord bot
      this.discordClient.on("messageCreate", async (message) => {
        console.log("Received Discord message:", {
          author: message.author.username,
          channelId: message.channelId,
          content: message.content,
        });

        if (message.author.bot) return;

        await this.handleDiscordMessage(message);
      });

      // Set up Telegram bot with debug mode
      this.telegramBot.on("message", async (message) => {
        console.log("Received Telegram message:", {
          chatId: message.chat.id,
          configuredChatId: this.telegramChatId,
          text: message.text,
          from: message.from,
        });

        // Remove toString() and use strict equality
        if (message.chat.id === Number(this.telegramChatId)) {
          await this.handleTelegramMessage(message);
        } else {
          console.log("Message ignored - chat ID mismatch");
        }
      });

      // Add error handler for Telegram bot
      this.telegramBot.on("error", (error) => {
        console.error("Telegram bot error:", error);
      });

      // Add polling error handler
      this.telegramBot.on("polling_error", (error) => {
        console.error("Telegram polling error:", error);
      });

      // Connect to Discord
      await this.discordClient.login(config.discordToken);
    } catch (error) {
      console.error("Failed to initialize Push Protocol:", error);
      throw error;
    }
  }

  // Add cleanup method
  async cleanup() {
    if (this.pushStream) {
      await this.pushStream.disconnect();
    }
  }

  // Handle message from Push Protocol
  async handlePushMessage(message) {
    console.log(message);
    // Skip self-messages or non-chat events
    if (
      (message.origin === "self" && message.message.content.startsWith("[")) ||
      (message.event !== "chat.request" && message.event !== "chat.message")
    ) {
      return;
    }

    // Format wallet address to show only first 6 and last 4 characters
    const walletAddress = message.from.split(":")[1];
    const shortWallet = `${walletAddress.substring(
      0,
      6
    )}...${walletAddress.substring(walletAddress.length - 4)}`;

    const formattedMessage = `[Push] [${shortWallet}]\n${message.message.content}`;
    console.log(`00`, formattedMessage);
    console.log(0, this.discordClient.channels);
    // Send to Discord - Fix the channel send method
    const channel = this.discordClient.channels.cache.get(
      this.discordChannelId
    );
    if (channel) {
      const resDiscord = await channel.send(formattedMessage);
      console.log(resDiscord);
    } else {
      console.error("Discord channel not found");
    }

    // Send to Telegram
    await this.telegramBot.sendMessage(this.telegramChatId, formattedMessage);
  }

  // Handle message from Discord
  async handleDiscordMessage(message) {
    try {
      const formattedMessage = `[Discord] [${message.author.username}]\n${message.content}`;
      console.log(formattedMessage);

      // Send to Telegram
      const resTelegram = await this.telegramBot.sendMessage(
        this.telegramChatId,
        formattedMessage
      );
      console.log(4, resTelegram);

      // Send to Push Protocol
      const resPush = await this.pushUser.chat.send(this.pushChannelAddress, {
        content: formattedMessage,
        type: "Text",
      });
      console.log(3, resPush);
    } catch (error) {
      console.error("Error in handleDiscordMessage:", error);
    }
  }

  // Handle message from Telegram
  async handleTelegramMessage(message) {
    try {
      const formattedMessage = `[Telegram] [${message.from.username}]\n${message.text}`;

      const channel = this.discordClient.channels.cache.get(
        this.discordChannelId
      );
      if (channel) {
        const resDiscord = await channel.send(formattedMessage);
        console.log(2, resDiscord);
      } else {
        console.error("Discord channel not found");
      }

      // Send to Push Protocol
      const resPush = await this.pushUser.chat.send(this.pushChannelAddress, {
        content: formattedMessage,
        type: "Text",
      });
      console.log({ resPush });
    } catch (error) {
      console.error("Error in handleTelegramMessage:", error);
    }
  }
}

// Usage example
const config = {
  discordToken: process.env.DISCORD_TOKEN,
  discordChannelId: process.env.DISCORD_CHANNEL_ID,
  telegramToken: process.env.TELEGRAM_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  pushPrivateKey: process.env.PUSH_PRIVATE_KEY,
  pushChannelAddress: process.env.PUSH_CHANNEL_ADDRESS,
};

const relay = new MessageRelaySystem(config);

// Handle process termination
process.on("SIGINT", async () => {
  console.log("Cleaning up...");
  await relay.cleanup();
  process.exit(0);
});

// Initialize the relay
relay.initialize().catch((error) => {
  console.error("Failed to initialize relay:", error);
  process.exit(1);
});
