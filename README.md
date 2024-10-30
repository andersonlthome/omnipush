# OmniPush - Sync [ Push | Discord | Telegram ] - Hackaton Push Protocol

Backend application to sync messages between specific channels (group to Telegram and Push, and channel to Discord).

## How to run

```bash
npm install
npm run dev
```

### Get your Telegram and Discord tokens

- [Telegram](https://core.telegram.org/bots#botfather)
- [Discord](https://discord.com/developers/docs/intro)

## How to use

1. Create a new config for your channel (group), on the [PushApp](https://app.push.org/), sending the command `/create-channel` to the bot (PUBLIC KEY of the bot wallet).
2. Add the Discord token and channel id to the config, sending the command `/add-config-discord` to the bot.
3. Add the Telegram token and chat id to the config, sending the command `/add-config-telegram` to the bot.
