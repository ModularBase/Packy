const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Create a new Discord client instance
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
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

        // Create an embed message
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Account Linking')
            .setDescription(`Please add the following sentence to your Roblox "About" section and then confirm.\n\n**Sentence:** \n"${uniqueSentence}"\n\nOnce you've added it, press the Confirm button below.`)
            .setFooter({ text: 'You have 10 minutes to complete this action.' });

        // Create buttons for confirmation
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        const filter = i => i.customId === 'confirm' || i.customId === 'cancel';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirm') {
                await i.deferUpdate();

                const response = await fetch(`https://users.roblox.com/v1/users/search?keyword=${robloxUsername}`);
                const data = await response.json();

                if (data.data && data.data.length > 0) {
                    const userId = data.data[0].id;
                    const profileResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
                    const profileData = await profileResponse.json();

                    if (profileData.description && profileData.description.includes(uniqueSentence)) {
                        // Store the linked account in Supabase
                        const { error } = await supabase
                            .from('linked_accounts')
                            .insert([
                                { discord_id: user.id, roblox_username: robloxUsername }
                            ]);

                        if (error) {
                            await i.followUp({ content: 'There was an error storing your linked account information. Please try again later.', ephemeral: true });
                        } else {
                            await i.followUp({ content: `Success! Your Discord account has been linked to Roblox account: ${robloxUsername}.`, ephemeral: true });
                        }
                    } else {
                        await i.followUp({ content: 'The sentence was not found in your "About" section. Please make sure it was added correctly.', ephemeral: true });
                    }
                } else {
                    await i.followUp({ content: 'Roblox user not found. Please check the username and try again.', ephemeral: true });
                }
            } else if (i.customId === 'cancel') {
                await i.update({ content: 'Linking process has been cancelled.', components: [], ephemeral: true });
            }
        });

        collector.on('end', collected => {
            if (!collected.size) {
                interaction.followUp({ content: 'Linking process timed out.', ephemeral: true });
            }
        });
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
