/**
 * ====================================
 * COMMANDE: /play
 * ====================================
 * 
 * Jouer de la musique dans un salon vocal
 * Système de musique avec queue
 * 
 * @author Kofu (github.com/kofudev)
 * @category Music
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('🎵 Jouer de la musique')
        .addStringOption(option =>
            option.setName('recherche')
                .setDescription('Nom de la chanson ou URL YouTube')
                .setRequired(true)
        ),
    
    category: 'music',
    cooldown: 3,
    guildOnly: true,
    
    /**
     * Exécution de la commande play
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const query = interaction.options.getString('recherche');
        
        // Vérifier que l'utilisateur est dans un salon vocal
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Salon vocal requis !',
                'Tu dois être dans un salon vocal pour utiliser cette commande.'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Vérifier les permissions du bot
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Permissions insuffisantes !',
                'Je n\'ai pas les permissions pour me connecter ou parler dans ce salon vocal.'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Embed de recherche
        const searchingEmbed = new EmbedBuilder()
            .setTitle('🔍 Recherche en cours...')
            .setDescription(`Recherche de **${query}**...`)
            .setColor('#FF6B6B')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [searchingEmbed] });
        
        try {
            // Simulation de recherche musicale (remplacer par une vraie API)
            const searchResult = await simulateMusicSearch(query);
            
            if (!searchResult) {
                const notFoundEmbed = KofuSignature.createWarningEmbed(
                    'Aucun résultat !',
                    `Aucune chanson trouvée pour **${query}**.\n\nEssaie avec un autre terme de recherche.`
                );
                return interaction.editReply({ embeds: [notFoundEmbed] });
            }
            
            // Obtenir ou créer la queue du serveur
            let serverQueue = interaction.client.musicQueues?.get(interaction.guild.id);
            
            if (!serverQueue) {
                // Créer une nouvelle queue
                serverQueue = {
                    textChannel: interaction.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    songs: [],
                    volume: 50,
                    playing: false,
                    loop: false,
                    loopQueue: false
                };
                
                // Initialiser le système de musique si nécessaire
                if (!interaction.client.musicQueues) {
                    interaction.client.musicQueues = new Map();
                }
                
                interaction.client.musicQueues.set(interaction.guild.id, serverQueue);
            }
            
            // Ajouter la chanson à la queue
            serverQueue.songs.push({
                title: searchResult.title,
                url: searchResult.url,
                duration: searchResult.duration,
                thumbnail: searchResult.thumbnail,
                requester: interaction.user,
                addedAt: new Date()
            });
            
            // Si c'est la première chanson, commencer à jouer
            if (serverQueue.songs.length === 1) {
                const playingEmbed = new EmbedBuilder()
                    .setTitle('🎵 Lecture en cours !')
                    .setDescription(`**${searchResult.title}**`)
                    .setColor('#00FF00')
                    .setThumbnail(searchResult.thumbnail)
                    .addFields(
                        { name: '⏱️ Durée', value: searchResult.duration, inline: true },
                        { name: '👤 Demandé par', value: interaction.user.toString(), inline: true },
                        { name: '🔊 Volume', value: `${serverQueue.volume}%`, inline: true }
                    )
                    .setFooter({ text: 'Système de musique simulé | ' + KofuSignature.getKofuFooter().text, iconURL: KofuSignature.getKofuFooter().iconURL })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [playingEmbed] });
                
                // Simuler la lecture
                await simulatePlayback(serverQueue, searchResult);
                
            } else {
                // Chanson ajoutée à la queue
                const queuedEmbed = new EmbedBuilder()
                    .setTitle('➕ Ajouté à la queue !')
                    .setDescription(`**${searchResult.title}**`)
                    .setColor('#4ECDC4')
                    .setThumbnail(searchResult.thumbnail)
                    .addFields(
                        { name: '⏱️ Durée', value: searchResult.duration, inline: true },
                        { name: '👤 Demandé par', value: interaction.user.toString(), inline: true },
                        { name: '📋 Position', value: `${serverQueue.songs.length}`, inline: true },
                        { name: '🎵 Queue', value: `${serverQueue.songs.length} chanson(s) en attente`, inline: false }
                    )
                    .setFooter(KofuSignature.getKofuFooter())
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [queuedEmbed] });
            }
            
            console.log(`🎵 [Kofu] ${interaction.user.tag} a ajouté "${searchResult.title}" à la queue sur ${interaction.guild.name}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lecture musique:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur de lecture !',
                `Impossible de jouer cette chanson.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Simuler une recherche musicale
 * @param {string} query - Terme de recherche
 * @returns {object|null} Résultat de recherche
 * @author Kofu
 */
async function simulateMusicSearch(query) {
    // Attendre pour simuler la recherche
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Base de données simulée de chansons
    const mockSongs = [
        {
            title: 'Never Gonna Give You Up - Rick Astley',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: '3:33',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
        },
        {
            title: 'Bohemian Rhapsody - Queen',
            url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
            duration: '5:55',
            thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg'
        },
        {
            title: 'Imagine - John Lennon',
            url: 'https://www.youtube.com/watch?v=YkgkThdzX-8',
            duration: '3:07',
            thumbnail: 'https://img.youtube.com/vi/YkgkThdzX-8/maxresdefault.jpg'
        },
        {
            title: 'Billie Jean - Michael Jackson',
            url: 'https://www.youtube.com/watch?v=Zi_XLOBDo_Y',
            duration: '4:54',
            thumbnail: 'https://img.youtube.com/vi/Zi_XLOBDo_Y/maxresdefault.jpg'
        },
        {
            title: 'Hotel California - Eagles',
            url: 'https://www.youtube.com/watch?v=BciS5krYL80',
            duration: '6:30',
            thumbnail: 'https://img.youtube.com/vi/BciS5krYL80/maxresdefault.jpg'
        }
    ];
    
    // Recherche simple par mots-clés
    const lowerQuery = query.toLowerCase();
    let foundSong = mockSongs.find(song => 
        song.title.toLowerCase().includes(lowerQuery) ||
        lowerQuery.includes(song.title.toLowerCase().split(' - ')[0].toLowerCase())
    );
    
    // Si aucune chanson trouvée, retourner une chanson générique
    if (!foundSong) {
        foundSong = {
            title: `${query} (Résultat simulé)`,
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration: '3:30',
            thumbnail: 'https://via.placeholder.com/480x360/FF6B6B/FFFFFF?text=Musique'
        };
    }
    
    return foundSong;
}

/**
 * Simuler la lecture d'une chanson
 * @param {object} serverQueue - Queue du serveur
 * @param {object} song - Chanson à jouer
 * @author Kofu
 */
async function simulatePlayback(serverQueue, song) {
    serverQueue.playing = true;
    
    console.log(`🎵 [Kofu] Simulation de lecture: ${song.title}`);
    
    // Simuler la durée de la chanson (ici 30 secondes pour la démo)
    setTimeout(() => {
        serverQueue.songs.shift(); // Retirer la chanson terminée
        
        if (serverQueue.songs.length > 0) {
            // Jouer la chanson suivante
            const nextSong = serverQueue.songs[0];
            simulatePlayback(serverQueue, nextSong);
            
            // Notifier la chanson suivante
            const nextEmbed = new EmbedBuilder()
                .setTitle('⏭️ Chanson suivante !')
                .setDescription(`**${nextSong.title}**`)
                .setColor('#00FF00')
                .setThumbnail(nextSong.thumbnail)
                .addFields(
                    { name: '⏱️ Durée', value: nextSong.duration, inline: true },
                    { name: '👤 Demandé par', value: nextSong.requester.toString(), inline: true }
                )
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            serverQueue.textChannel.send({ embeds: [nextEmbed] }).catch(() => {});
        } else {
            // Queue terminée
            serverQueue.playing = false;
            
            const endEmbed = new EmbedBuilder()
                .setTitle('🎵 Queue terminée !')
                .setDescription('Toutes les chansons ont été jouées.')
                .setColor('#95A5A6')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            serverQueue.textChannel.send({ embeds: [endEmbed] }).catch(() => {});
        }
    }, 30000); // 30 secondes pour la démo
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */