/**
 * ====================================
 * COMMANDE: /joke
 * ====================================
 * 
 * Raconter des blagues aléatoires
 * Collection de blagues en français
 * 
 * @author Kofu (github.com/kofudev)
 * @category Fun
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('😂 Raconter une blague aléatoire')
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Catégorie de blague')
                .setRequired(false)
                .addChoices(
                    { name: '🤓 Informatique', value: 'tech' },
                    { name: '🐾 Animaux', value: 'animals' },
                    { name: '🍕 Nourriture', value: 'food' },
                    { name: '👨‍👩‍👧‍👦 Papa', value: 'dad' },
                    { name: '🎭 Générale', value: 'general' }
                )
        ),
    
    category: 'fun',
    cooldown: 5,
    
    /**
     * Exécution de la commande joke
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const category = interaction.options.getString('categorie') || 'random';
        
        const jokes = {
            tech: [
                {
                    setup: "Pourquoi les développeurs préfèrent-ils le mode sombre ?",
                    punchline: "Parce que la lumière attire les bugs ! 🐛"
                },
                {
                    setup: "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ?",
                    punchline: "Un chat-mallow ! 🐱"
                },
                {
                    setup: "Pourquoi les programmeurs n'aiment pas la nature ?",
                    punchline: "Il y a trop de bugs ! 🌿🐛"
                },
                {
                    setup: "Que dit un développeur quand il va se coucher ?",
                    punchline: "Bonne nuit, je vais me mettre en veille ! 😴"
                }
            ],
            animals: [
                {
                    setup: "Que dit un escargot quand il croise une limace ?",
                    punchline: "Regarde le nudiste ! 🐌"
                },
                {
                    setup: "Pourquoi les poissons n'aiment pas jouer au tennis ?",
                    punchline: "Parce qu'ils ont peur du filet ! 🐟🎾"
                },
                {
                    setup: "Comment appelle-t-on un chat tombé dans un pot de peinture ?",
                    punchline: "Un chat-mallow ! 🐱🎨"
                },
                {
                    setup: "Que dit un pingouin quand il se présente ?",
                    punchline: "Enchanté, moi c'est Pingu ! 🐧"
                }
            ],
            food: [
                {
                    setup: "Que dit un café qui arrive en retard au bureau ?",
                    punchline: "Désolé, j'étais en grain de dormir ! ☕"
                },
                {
                    setup: "Pourquoi les plongeurs plongent-ils toujours en arrière ?",
                    punchline: "Parce que sinon, ils tombent dans le bateau ! 🤿"
                },
                {
                    setup: "Comment appelle-t-on un fromage qui ne nous appartient pas ?",
                    punchline: "Un nacho cheese ! 🧀"
                },
                {
                    setup: "Que dit une pizza à une autre pizza ?",
                    punchline: "Tu me fais fondre ! 🍕❤️"
                }
            ],
            dad: [
                {
                    setup: "Papa, tu peux me faire un sandwich ?",
                    punchline: "Pouf ! Tu es un sandwich ! 🥪✨"
                },
                {
                    setup: "J'ai faim !",
                    punchline: "Salut Faim, moi c'est Papa ! 👋"
                },
                {
                    setup: "Pourquoi les papas racontent-ils des blagues nulles ?",
                    punchline: "Parce que les bonnes blagues, c'est pour les mamans ! 😄"
                },
                {
                    setup: "Papa, peux-tu me dire une blague sur la construction ?",
                    punchline: "Désolé, je suis encore en train de la construire ! 🏗️"
                }
            ],
            general: [
                {
                    setup: "Pourquoi les plongeurs plongent-ils toujours en arrière ?",
                    punchline: "Parce que sinon ils tombent dans le bateau ! 🤿⛵"
                },
                {
                    setup: "Comment appelle-t-on un boomerang qui ne revient pas ?",
                    punchline: "Un bâton ! 🪃➡️🪵"
                },
                {
                    setup: "Que dit un escargot quand il croise une limace ?",
                    punchline: "Regarde le nudiste ! 🐌👀"
                },
                {
                    setup: "Pourquoi les mathématiciens ne bronzent jamais ?",
                    punchline: "Parce qu'ils utilisent toujours la crème solaire facteur X ! ☀️📐"
                }
            ]
        };
        
        // Sélectionner une catégorie
        let selectedCategory = category;
        if (category === 'random') {
            const categories = Object.keys(jokes);
            selectedCategory = categories[Math.floor(Math.random() * categories.length)];
        }
        
        // Sélectionner une blague aléatoire
        const categoryJokes = jokes[selectedCategory] || jokes.general;
        const joke = categoryJokes[Math.floor(Math.random() * categoryJokes.length)];
        
        // Créer l'embed de setup
        const setupEmbed = new EmbedBuilder()
            .setTitle('😂 Blague du jour !')
            .setDescription(joke.setup)
            .setColor('#FFD93D')
            .addFields(
                { name: '📂 Catégorie', value: getCategoryName(selectedCategory), inline: true },
                { name: '👤 Demandé par', value: interaction.user.toString(), inline: true }
            )
            .setFooter({ text: 'Réponse dans 3 secondes... | ' + KofuSignature.getKofuFooter().text, iconURL: KofuSignature.getKofuFooter().iconURL })
            .setTimestamp();
        
        await interaction.reply({ embeds: [setupEmbed] });
        
        // Attendre 3 secondes pour le suspense
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Créer l'embed de punchline
        const punchlineEmbed = new EmbedBuilder()
            .setTitle('🎉 Réponse !')
            .setDescription(`**${joke.setup}**\n\n${joke.punchline}`)
            .setColor('#6BCF7F')
            .addFields(
                { name: '📂 Catégorie', value: getCategoryName(selectedCategory), inline: true },
                { name: '👤 Demandé par', value: interaction.user.toString(), inline: true },
                { name: '😄 Alors ?', value: 'Cette blague t\'a fait rire ? Utilise `/joke` pour en avoir une autre !', inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.editReply({ embeds: [punchlineEmbed] });
        
        console.log(`😂 [Kofu] ${interaction.user.tag} a demandé une blague (${selectedCategory})`);
    }
};

/**
 * Obtenir le nom d'affichage d'une catégorie
 * @param {string} category - Catégorie
 * @returns {string} Nom d'affichage
 * @author Kofu
 */
function getCategoryName(category) {
    const names = {
        tech: '🤓 Informatique',
        animals: '🐾 Animaux',
        food: '🍕 Nourriture',
        dad: '👨‍👩‍👧‍👦 Papa',
        general: '🎭 Générale'
    };
    
    return names[category] || '🎭 Générale';
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */