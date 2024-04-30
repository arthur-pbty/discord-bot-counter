require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Client, IntentsBitField, ActivityType } = require("discord.js");
const client = new Client({intents: new IntentsBitField(3276799)});

let db = new sqlite3.Database('./db.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQlite database.');
});

db.run('CREATE TABLE IF NOT EXISTS counter (channelID TEXT, value INTEGER, user TEXT, PRIMARY KEY (channelID))');

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  client.user.setPresence({ 
    activities: [{ 
      name: '/ayshi', 
      type: ActivityType.Streaming, 
      url: 'https://twitch.tv/tuturp33' 
    }], 
    status: 'online' 
  });


  //AntiCrash
  process.on('unhandledRejection', (error) => {
    console.log(' [antiCrash] :: Unhandled Rejection/Catch');
    console.log(error);
  });

  process.on("uncaughtException", (error, origin) => {
    console.log(' [antiCrash] :: Uncaught Exception/Catch');
    console.log(error);
    console.log('Information supplémentaire:', origin);
  });

  process.on('uncaughtExceptionMonitor', (error, origin) => {
    console.log(' [antiCrash] :: Uncaught Exception Monitor/Catch');
    console.log(error);
    console.log('Information supplémentaire:', origin);
  });

  process.on('beforeExit', (code) => {
    console.log(' [antiCrash] :: Before Exit');
    console.log('Code de sortie:', code);
  });

  process.on('exit', (code) => {
    console.log(' [antiCrash] :: Exit');
    console.log('Code de sortie:', code);
  });

  
  const commands = [
    {
      name: 'ping',
      description: 'Repond avec Pong!',
    },
    {
      name: 'add',
      description: 'Ajoute un salon de comptage',
      options: [
        {
          name: 'channel',
          type: 7,
          description: 'Le channel à ajouter',
          required: true,
        },
        {
          name: 'firstnumber',
          type: 4,
          description: 'Le nombre de départ du comptage',
          required: false,
        },
      ],
    },
    {
      name: 'remove',
      description: 'Supprime un salon de comptage',
      options: [
        {
          name: 'channel',
          type: 7,
          description: 'Le channel à supprimer',
          required: true,
        },
      ],
    },
    {
      name: 'help',
      description: 'Affiche l\'aide',
    }
  ];

  for (const command of commands) {
    await client.application.commands.create(command);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  }

  if (commandName === 'add') {
    const member = interaction.member;
    if (!member.permissions.has('8')) {
      interaction.reply({ content: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.', ephemeral: true });
      return;
    }
    const channel = interaction.options.getChannel('channel');
    let firstNember = interaction.options.getInteger('firstnumber');
    if (!firstNember) {
      firstNember = 1;
    }

    const guild = interaction.guild;
    if (!guild.channels.cache.has(channel.id)) {
      interaction.reply({ content: 'Ce channel n\'existe pas dans la guild.', ephemeral: true });
      return;
    }

    db.run('INSERT OR IGNORE INTO counter (channelID, value) VALUES (?, ?)', [channel.id, firstNember], function(err) {
      if (err) {
        interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
        return console.error(err.message);
      }
      interaction.reply(`Le salon ${channel.name} a été ajouté avec succès.`);
    });
  }

  if (commandName === 'remove') {
    const member = interaction.member;
    if (!member.permissions.has('8')) {
      interaction.reply({ content: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.', ephemeral: true });
      return;
    }
    const channel = interaction.options.getChannel('channel');
    if (!interaction.guild.channels.cache.has(channel.id)) {
      interaction.reply({ content: 'Ce channel n\'existe pas dans la guild.', ephemeral: true });
      return;
    }

    db.run('DELETE FROM counter WHERE channelID = ?', [channel.id], function(err) {
      if (err) {
        interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
        return console.error(err.message);
      }
      interaction.reply({ content: `Le salon ${channel.name} a été supprimé avec succès.`, ephemeral: true });
    });
  }

  if (commandName === 'help') {
    interaction.reply('Commandes disponibles:\n- /ping: Repond avec Pong!\n- /add: Ajoute un salon de comptage\n- /remove: Supprime un salon de comptage\n- /help: Affiche l\'aide');
  }

});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  db.get('SELECT * FROM counter WHERE channelID = ?', [message.channel.id], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    if (!row) {
      return;
    }

    let value = row.value;

    (async () => {
      if (message.author.id === row.user) {
        message.delete();
        const messageError = await message.channel.send('Vous ne pouvez pas envoyer deux messages de suite.');
        setTimeout(() => {
          messageError.delete();
        }, 5000);
      } else if (value !== parseInt(message.content)) {
        message.delete();
        const messageError = await message.channel.send(`Le nombre a été supprimé car il ne correspond pas, vous devez envoyer le nombre suivant: ${value}`);
        setTimeout(() => {
          messageError.delete();
        }, 5000);
      } else {
        db.run('UPDATE counter SET value = ?, user = ? WHERE channelID = ?', [value + 1, message.author.id, message.channel.id], function(err) {
          if (err) {
            return console.error(err.message);
          }
        });
      }
    })();
  });
});

client.login(process.env.TOKEN);