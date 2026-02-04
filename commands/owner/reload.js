/**
 * ====================================
 * COMMANDE OWNER: /reload
 * ====================================
 * 
 * Recharger les commandes du bot à chaud
 * Permet de mettre à jour sans redémarrer
 * 
 * @author Kofu (github.com/kofudev)
 * @category Owner Commands
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('🔄 [OWNER] Recharger les commandes du bot')
        .addStringOption(option =>
            option.setName('commande')
                .setDescription('Commande spécifique à recharger (toutes par défaut)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Catégorie à recharger')
                .setRequired(false)
                .addChoices(
                    { name: 'Général', value: 'general' },
                    { name: 'Modération', value: 'moderation' },
                    { name: 'Owner', value: 'owner' },
                    { name: 'Tickets', value: 'tickets' }
                )
        ),
    
    category: 'owner',
    cooldown: 5,
    ownerOnly: true,
    
    /**
     * Exécution de la commande reload
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        // Vérifier que c'est un owner
        const owners = process.env.BOT_OWNERS ? JSON.parse(process.env.BOT_OWNERS) : [];
        if (!owners.includes(interaction.user.id)) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Accès refusé !',
                'Cette commande est réservée aux propriétaires du bot (Kofu & co).'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        const specificCommand = interaction.options.getString('commande');
        const category = interaction.options.getString('categorie');
        
        // Créer l'embed de démarrage
        const startEmbed = new EmbedBuilder()
            .setTitle('🔄 Rechargement en cours...')
            .setDescription('Rechargement des commandes en cours, veuillez patienter...')
            .setColor('#FAA61A')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [startEmbed], ephemeral: true });
        
        try {
            let reloadedCommands = [];
            let errors = [];
            
            if (specificCommand) {
                // Recharger une commande spécifique
                const result = await this.reloadSpecificCommand(interaction.client, specificCommand);
                if (result.success) {
                    reloadedCommands.push(result.command);
                } else {
                    errors.push(result.error);
                }
            } else if (category) {
                // Recharger une catégorie
                const result = await this.reloadCategory(interaction.client, category);
                reloadedCommands = result.reloaded;
                errors = result.errors;
            } else {
                // Recharger toutes les commandes
                const result = await this.reloadAllCommands(interaction.client);
                reloadedCommands = result.reloaded;
                errors = result.errors;
            }
            
            // Logger l'action
            interaction.client.logger.logOwnerAction(
                interaction.user,
                'RELOAD',
                {
                    specificCommand,
                    category,
                    reloadedCount: reloadedCommands.length,
                    errorCount: errors.length
                }
            );
            
            // Créer l'embed de résultat
            const resultEmbed = this.createResultEmbed(reloadedCommands, errors, specificCommand, category);
            
            await interaction.editReply({ embeds: [resultEmbed] });
            
            console.log(`🔄 [Kofu] ${interaction.user.tag} a rechargé ${reloadedCommands.length} commande(s)`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors du rechargement:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors du rechargement !',
                `Une erreur est survenue lors du rechargement.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
    
    /**
     * Recharger une commande spécifique
     * @param {Client} client - Le client Discord
     * @param {string} commandName - Nom de la commande
     * @returns {object} Résultat du rechargement
     * @author Kofu
     */
    async reloadSpecificCommand(client, commandName) {
        try {
            // Trouver la commande dans la collection
            const command = client.commands.get(commandName);
            if (!command) {
                return {
                    success: false,
                    error: `Commande "${commandName}" introuvable`
                };
            }
            
            // Trouver le fichier de la commande
            const commandPath = this.findCommandFile(commandName);
            if (!commandPath) {
                return {
                    success: false,
                    error: `Fichier de la commande "${commandName}" introuvable`
                };
            }
            
            // Supprimer du cache require
            delete require.cache[require.resolve(commandPath)];
            
            // Recharger la commande
            const newCommand = require(commandPath);
            client.commands.set(newCommand.data.name, newCommand);
            
            return {
                success: true,
                command: newCommand.data.name
            };
            
        } catch (error) {
            return {
                success: false,
                error: `Erreur lors du rechargement de "${commandName}": ${error.message}`
            };
        }
    },
    
    /**
     * Recharger une catégorie de commandes
     * @param {Client} client - Le client Discord
     * @param {string} category - Nom de la catégorie
     * @returns {object} Résultat du rechargement
     * @author Kofu
     */
    async reloadCategory(client, category) {
        const reloaded = [];
        const errors = [];
        
        try {
            const categoryPath = path.join(__dirname, '..', category);
            
            if (!fs.existsSync(categoryPath)) {
                errors.push(`Catégorie "${category}" introuvable`);
                return { reloaded, errors };
            }
            
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                try {
                    const filePath = path.join(categoryPath, file);
                    
                    // Supprimer du cache require
                    delete require.cache[require.resolve(filePath)];
                    
                    // Recharger la commande
                    const command = require(filePath);
                    client.commands.set(command.data.name, command);
                    
                    reloaded.push(command.data.name);
                    
                } catch (error) {
                    errors.push(`Erreur avec ${file}: ${error.message}`);
                }
            }
            
        } catch (error) {
            errors.push(`Erreur catégorie "${category}": ${error.message}`);
        }
        
        return { reloaded, errors };
    },
    
    /**
     * Recharger toutes les commandes
     * @param {Client} client - Le client Discord
     * @returns {object} Résultat du rechargement
     * @author Kofu
     */
    async reloadAllCommands(client) {
        const reloaded = [];
        const errors = [];
        
        try {
            const commandsPath = path.join(__dirname, '..');
            const categoryFolders = fs.readdirSync(commandsPath);
            
            for (const folder of categoryFolders) {
                const categoryPath = path.join(commandsPath, folder);
                
                if (!fs.statSync(categoryPath).isDirectory()) continue;
                
                const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
                
                for (const file of commandFiles) {
                    try {
                        const filePath = path.join(categoryPath, file);
                        
                        // Supprimer du cache require
                        delete require.cache[require.resolve(filePath)];
                        
                        // Recharger la commande
                        const command = require(filePath);
                        client.commands.set(command.data.name, command);
                        
                        reloaded.push(command.data.name);
                        
                    } catch (error) {
                        errors.push(`Erreur avec ${folder}/${file}: ${error.message}`);
                    }
                }
            }
            
        } catch (error) {
            errors.push(`Erreur générale: ${error.message}`);
        }
        
        return { reloaded, errors };
    },
    
    /**
     * Trouver le fichier d'une commande
     * @param {string} commandName - Nom de la commande
     * @returns {string|null} Chemin du fichier ou null
     * @author Kofu
     */
    findCommandFile(commandName) {
        try {
            const commandsPath = path.join(__dirname, '..');
            const categoryFolders = fs.readdirSync(commandsPath);
            
            for (const folder of categoryFolders) {
                const categoryPath = path.join(commandsPath, folder);
                
                if (!fs.statSync(categoryPath).isDirectory()) continue;
                
                const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
                
                for (const file of commandFiles) {
                    const filePath = path.join(categoryPath, file);
                    
                    try {
                        const command = require(filePath);
                        if (command.data && command.data.name === commandName) {
                            return filePath;
                        }
                    } catch (error) {
                        // Ignorer les erreurs de require pour cette recherche
                    }
                }
            }
            
            return null;
            
        } catch (error) {
            return null;
        }
    },
    
    /**
     * Créer l'embed de résultat
     * @param {Array} reloaded - Commandes rechargées
     * @param {Array} errors - Erreurs rencontrées
     * @param {string} specificCommand - Commande spécifique
     * @param {string} category - Catégorie
     * @returns {EmbedBuilder} Embed de résultat
     * @author Kofu
     */
    createResultEmbed(reloaded, errors, specificCommand, category) {
        const isSuccess = reloaded.length > 0 && errors.length === 0;
        const hasPartialSuccess = reloaded.length > 0 && errors.length > 0;
        
        let title, color, description;
        
        if (isSuccess) {
            title = '✅ Rechargement réussi !';
            color = '#43B581';
            description = 'Toutes les commandes ont été rechargées avec succès.';
        } else if (hasPartialSuccess) {
            title = '⚠️ Rechargement partiel';
            color = '#FAA61A';
            description = 'Certaines commandes ont été rechargées, mais des erreurs sont survenues.';
        } else {
            title = '❌ Échec du rechargement';
            color = '#F04747';
            description = 'Aucune commande n\'a pu être rechargée.';
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter les détails
        if (specificCommand) {
            embed.addFields({
                name: '🎯 Commande ciblée',
                value: `\`${specificCommand}\``,
                inline: true
            });
        }
        
        if (category) {
            embed.addFields({
                name: '📁 Catégorie ciblée',
                value: `\`${category}\``,
                inline: true
            });
        }
        
        // Statistiques
        embed.addFields(
            { name: '✅ Rechargées', value: `\`${reloaded.length}\``, inline: true },
            { name: '❌ Erreurs', value: `\`${errors.length}\``, inline: true }
        );
        
        // Liste des commandes rechargées (max 10)
        if (reloaded.length > 0) {
            const commandsList = reloaded.slice(0, 10).map(cmd => `• \`${cmd}\``).join('\n');
            const moreText = reloaded.length > 10 ? `\n*... et ${reloaded.length - 10} autre(s)*` : '';
            
            embed.addFields({
                name: '🔄 Commandes rechargées',
                value: commandsList + moreText,
                inline: false
            });
        }
        
        // Liste des erreurs (max 5)
        if (errors.length > 0) {
            const errorsList = errors.slice(0, 5).map(err => `• \`${err}\``).join('\n');
            const moreText = errors.length > 5 ? `\n*... et ${errors.length - 5} autre(s)*` : '';
            
            embed.addFields({
                name: '⚠️ Erreurs rencontrées',
                value: errorsList + moreText,
                inline: false
            });
        }
        
        return embed;
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */