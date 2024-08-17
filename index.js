const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
const http = require('http');

// Create a new Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Intent for receiving guild events
    ],
});

// Define the command
const commands = [
    new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account with your Roblox account')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your Roblox username')
                .setRequired(true))
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Event listener for when the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Event listener for interaction (slash commands)
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, user } = interaction;

    if (commandName === 'link') {
        const robloxUsername = options.getString('username');
        const uniqueSentence = `Linking my Discord: ${user.tag}`;

        await interaction.reply(`Please add the following sentence to your Roblox "About" section: \n\n"${uniqueSentence}"`);

        setTimeout(async () => {
            const response = await fetch(`https://users.roblox.com/v1/users/search?keyword=${robloxUsername}`);
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                const userId = data.data[0].id;
                const profileResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
                const profileData = await profileResponse.json();

                if (profileData.description && profileData.description.includes(uniqueSentence)) {
                    await interaction.followUp(`Success! Your account has been linked to ${robloxUsername}.`);
                } else {
                    await interaction.followUp('The sentence was not found in your "About" section. Please make sure it was added correctly.');
                }
            } else {
                await interaction.followUp('Roblox user not found. Please check the username and try again.');
            }
        }, 10000);
    }
});

// Bind to a port to avoid the "Port scan timeout" error
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
}).listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// Log in to Discord with your bot's token
client.login(process.env.TOKEN);
