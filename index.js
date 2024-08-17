const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Create a new Discord client instance
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// Define the commands
const commands = [
    new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account with your Roblox account')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your Roblox username')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('plan')
        .setDescription('Shows you your plan (Packy Premium or Free Packy)'),

    new SlashCommandBuilder()
        .setName('unlink')
        .setDescription('Unlink your Roblox account from your Discord account'),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get an invite link to the support server'),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Function to generate a random sentence
function generateRandomSentence() {
    const subjects = ['The cat', 'A dog', 'My friend', 'An elephant', 'The sun', 'A bird'];
    const verbs = ['jumps over', 'runs around', 'flies above', 'sits on', 'looks at', 'hides behind'];
    const objects = ['the fence', 'the tree', 'the house', 'a car', 'the sky', 'a rock'];

    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    const object = objects[Math.floor(Math.random() * objects.length)];

    return `${subject} ${verb} ${object}.`;
}

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

    const { commandName, user } = interaction;

    if (commandName === 'link') {
        const robloxUsername = interaction.options.getString('username');
        const uniqueSentence = generateRandomSentence();

        // Create an embed message
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Account Linking')
            .setDescription(`Please add the following sentence to your Roblox "About" section and then confirm.\n\n**Sentence:** \n"${uniqueSentence}"\n\nOnce you've added it, press the Confirm button below.`)
            .setFooter({ text: 'You have 10 minutes to complete this action.' });

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Other logic for linking...

    } else if (commandName === 'plan') {
        // Retrieve the user's plan from Supabase
        const { data, error } = await supabase
            .from('linked_accounts')
            .select('plan')
            .eq('discord_id', user.id)
            .single();

        if (error || !data) {
            await interaction.reply({ content: 'You are currently on the Free Packy plan.', ephemeral: true });
        } else {
            await interaction.reply({ content: `You are currently on the ${data.plan} plan.`, ephemeral: true });
        }

    } else if (commandName === 'unlink') {
        // Unlink the user's Roblox account
        const { error } = await supabase
            .from('linked_accounts')
            .delete()
            .eq('discord_id', user.id);

        if (error) {
            await interaction.reply({ content: 'There was an error unlinking your account. Please try again later.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Your Roblox account has been unlinked from your Discord account.', ephemeral: true });
        }

    } else if (commandName === 'help') {
        // Provide the invite link to the support server
        const supportServerInvite = 'https://discord.gg/YOUR_INVITE_CODE'; // Replace with your actual invite link
        await interaction.reply({ content: `Need help? Join our support server: ${supportServerInvite}`, ephemeral: true });
    }
});

// Express server for API interaction
const app = express();
app.use(express.json());

// Example API route to trigger actions
app.post('/api/test', async (req, res) => {
    const { action, discordId } = req.body;

    if (action === 'plan') {
        // Simulate checking a user's plan
        const { data, error } = await supabase
            .from('linked_accounts')
            .select('plan')
            .eq('discord_id', discordId)
            .single();

        if (error || !data) {
            return res.json({ plan: 'Free Packy' });
        }
        return res.json({ plan: data.plan });
    }

    // Other API actions can be added here

    return res.status(400).json({ message: 'Invalid action' });
});

// Bind to a port to avoid the "Port scan timeout" error
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
}).listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// Start Express server
app.listen(3001, () => {
    console.log('API server running on port 3001');
});

// Log in to Discord with your bot's token
client.login(process.env.TOKEN);
