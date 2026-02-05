/**
 * ====================================
 * COMMANDE: /queue
 * ====================================
 * 
 * Afficher la queue de musique
 * Liste des chansons en attente
 * 
 * @author Kofu (github.com/kofudev)
 * @category Music
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('📋 Afficher la queue de musique'),
    
    category: 'music',
    cooldown: 5,
    guildOnly: true,
    
    /**
     * Exécution de la commande queue
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        // Récupérer la queue du serveur
        const serverQueue = interaction.client.musicQueues?.get(interaction.guild.id);
        
        if (!serverQueue || serverQueue.songs.length === 0) {
            const emptyEmbed = KofuSignature.createWarningEmbed(
                'Queue vide !',
                'Aucune chanson dans la queue.\n\nUtilise `/play` pour ajouter de la musique !'
            );
            return interaction.reply({ embeds: [emptyEmbed] });
        }
        
        // Pagination
        const songsPerPage = 10;
        const totalPages = Math.ceil(serverQueue.songs.length / songsPerPage);
        let currentPage = 1;
        
        // Créer l'embed de la première page
        const queueEmbed = createQueueEmbed(serverQueue, currentPage, totalPages);
        
        // Créer les boutons de navigation si nécessaire
        const components = totalPages > 1 ? [createNavigationButtons(currentPage, totalPages)] : [];
        
        await interaction.reply({ embeds: [queueEmbed], components });
        
        // Gérer la pagination si nécessaire
        if (totalPages > 1) {
            const collector = interaction.channel.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });
            
            collector.on('collect', async i => {
                if (i.customId === 'first') currentPage = 1;
                else if (i.customId === 'previous') currentPage = Math.max(1, currentPage - 1);
                else if (i.customId === 'next') currentPage = Math.min(totalPages, currentPage + 1);
                else if (i.customId === 'last') currentPage = totalPages;
                
                const newEmbed = createQueueEmbed(serverQueue, currentPage, totalPages);
                const newComponents = [createNavigationButtons(currentPage, totalPages)];
                
                await i.update({ embeds: [newEmbed], components: newComponents });
            });
            
            collector.on('end', () => {
                // Désactiver les boutons après expiration
                const disabledComponents = [createNavigationButtons(currentPage, totalPages, true)];
                interaction.editReply({ components: disabledComponents }).catch(() => {});
            });
        }
        
        console.log(`📋 [Kofu] ${interaction.user.tag} a consulté la queue sur ${interaction.guild.name}`);
    }
};

/**
 * Créer l'embed de la queue
 * @param {object} serverQueue - Queue du serveur
 * @param {number} page - Page actuelle
 * @param {number} totalPages - Nombre total de pages
 * @returns {EmbedBuilder} Embed de la queue
 * @author Kofu
 */
function createQueueEmbed(serverQueue, page, totalPages) {
    const songsPerPage = 10;
    const startIndex = (page - 1) * songsPerPage;
    const endIndex = Math.min(startIndex + songsPerPage, serverQueue.songs.length);
    const pageSongs = serverQueue.songs.slice(startIndex, endIndex);
    
    const embed = new EmbedBuilder()
        .setTitle('📋 Queue de Musique')
        .setColor('#FF6B6B')
        .setFooter({ 
            text: `Page ${page}/${totalPages} | ${serverQueue.songs.length} chanson(s) | ` + KofuSignature.getKofuFooter().text,
            iconURL: KofuSignature.getKofuFooter().iconURL
        })
        .setTimestamp();
    
    // Chanson en cours de lecture
    if (serverQueue.songs.length > 0) {
        const currentSong = serverQueue.songs[0];
        embed.addFields({
            name: '🎵 En cours de lecture',
            value: `**${currentSong.title}**\n` +
                   `⏱️ ${currentSong.duration} • 👤 ${currentSong.requester.toString()}`,
            inline: false
        });
    }
    
    // Liste des chansons suivantes
    if (pageSongs.length > 1 || (pageSongs.length === 1 && startIndex > 0)) {
        let queueText = '';
        
        for (let i = 0; i < pageSongs.length; i++) {
            const song = pageSongs[i];
            const position = startIndex + i;
            
            // Ignorer la première chanson si on est sur la première page (elle est déjà affichée)
            if (position === 0 && page === 1) continue;
            
            const displayPosition = position === 0 ? 'En cours' : `${position}`;
            queueText += `**${displayPosition}.** ${song.title}\n`;
            queueText += `   ⏱️ ${song.duration} • 👤 ${song.requester.displayName}\n\n`;
        }
        
        if (queueText) {
            embed.addFields({
                name: '⏭️ Prochaines chansons',
                value: queueText || 'Aucune chanson suivante',
                inline: false
            });
        }
    }
    
    // Statistiques de la queue
    const totalDuration = calculateTotalDuration(serverQueue.songs);
    const uniqueRequesters = [...new Set(serverQueue.songs.map(song => song.requester.id))].length;
    
    embed.addFields({
        name: '📊 Statistiques',
        value: 
            `🎵 **Total:** ${serverQueue.songs.length} chanson(s)\n` +
            `⏱️ **Durée totale:** ${totalDuration}\n` +
            `👥 **Contributeurs:** ${uniqueRequesters}\n` +
            `🔊 **Volume:** ${serverQueue.volume}%\n` +
            `🔁 **Loop:** ${serverQueue.loop ? 'Activé' : 'Désactivé'}\n` +
            `🔄 **Loop Queue:** ${serverQueue.loopQueue ? 'Activé' : 'Désactivé'}`,
        inline: false
    });
    
    // Ajouter des boutons de contrôle si c'est la première page
    if (page === 1) {
        embed.addFields({
            name: '🎛️ Contrôles disponibles',
            value: 
                '`/skip` - Passer à la chanson suivante\n' +
                '`/stop` - Arrêter la musique\n' +
                '`/volume` - Changer le volume\n' +
                '`/loop` - Activer/désactiver la répétition\n' +
                '`/shuffle` - Mélanger la queue',
            inline: false
        });
    }
    
    return embed;
}

/**
 * Créer les boutons de navigation
 * @param {number} currentPage - Page actuelle
 * @param {number} totalPages - Nombre total de pages
 * @param {boolean} disabled - Si les boutons sont désactivés
 * @returns {ActionRowBuilder} Ligne de boutons
 * @author Kofu
 */
function createNavigationButtons(currentPage, totalPages, disabled = false) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('first')
                .setLabel('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || currentPage === 1),
            new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === 1),
            new ButtonBuilder()
                .setCustomId('page_info')
                .setLabel(`${currentPage}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === totalPages),
            new ButtonBuilder()
                .setCustomId('last')
                .setLabel('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || currentPage === totalPages)
        );
}

/**
 * Calculer la durée totale de la queue
 * @param {Array} songs - Liste des chansons
 * @returns {string} Durée totale formatée
 * @author Kofu
 */
function calculateTotalDuration(songs) {
    let totalSeconds = 0;
    
    for (const song of songs) {
        const duration = song.duration;
        const parts = duration.split(':');
        
        if (parts.length === 2) {
            // Format MM:SS
            totalSeconds += parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts.length === 3) {
            // Format HH:MM:SS
            totalSeconds += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        }
    }
    
    // Convertir en format lisible
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */