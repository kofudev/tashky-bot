/**
 * ====================================
 * COMMANDE: /meme
 * ====================================
 * 
 * Afficher des memes aléatoires
 * Collection de memes populaires
 * 
 * @author Kofu (github.com/kofudev)
 * @category Fun
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('😂 Afficher un meme aléatoire')
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Catégorie de meme')
                .setRequired(false)
                .addChoices(
                    { name: '🤓 Programmation', value: 'programming' },
                    { name: '🎮 Gaming', value: 'gaming' },
                    { name: '😸 Chats', value: 'cats' },
                    { name: '🐕 Chiens', value: 'dogs' },
                    { name: '🎭 Classique', value: 'classic' },
                    { name: '🔥 Trending', value: 'trending' }
                )
        ),
    
    category: 'fun',
    cooldown: 5,
    
    /**
     * Exécution de la commande meme
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const category = interaction.options.getString('categorie') || 'random';
        
        // Embed de chargement
        const loadingEmbed = new EmbedBuilder()
            .setTitle('😂 Recherche de meme...')
            .setDescription('Recherche du meme parfait pour toi...')
            .setColor('#FF6B6B')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [loadingEmbed] });
        
        try {
            // Sélectionner un meme aléatoire
            const meme = await getRandomMeme(category);
            
            // Créer l'embed du meme
            const memeEmbed = new EmbedBuilder()
                .setTitle(`😂 ${meme.title}`)
                .setColor('#FFD93D')
                .setImage(meme.url)
                .addFields(
                    { name: '📂 Catégorie', value: getCategoryName(meme.category), inline: true },
                    { name: '⭐ Popularité', value: `${meme.rating}/5 ⭐`, inline: true },
                    { name: '👤 Demandé par', value: interaction.user.toString(), inline: true }
                )
                .setFooter({ text: 'Memes simulés | ' + KofuSignature.getKofuFooter().text, iconURL: KofuSignature.getKofuFooter().iconURL })
                .setTimestamp();
            
            if (meme.description) {
                memeEmbed.setDescription(meme.description);
            }
            
            await interaction.editReply({ embeds: [memeEmbed] });
            
            console.log(`😂 [Kofu] ${interaction.user.tag} a demandé un meme (${meme.category}): ${meme.title}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur meme:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur de meme !',
                `Impossible de récupérer un meme.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Obtenir un meme aléatoire
 * @param {string} category - Catégorie demandée
 * @returns {object} Meme sélectionné
 * @author Kofu
 */
async function getRandomMeme(category) {
    // Attendre pour simuler l'API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const memes = {
        programming: [
            {
                title: "It works on my machine",
                url: "https://i.imgflip.com/1ur9b0.jpg",
                description: "Quand ton code marche sur ta machine mais pas en production",
                category: "programming",
                rating: 5
            },
            {
                title: "Debugging be like",
                url: "https://i.imgflip.com/2/1g8my4.jpg",
                description: "Quand tu passes 3 heures sur un bug et c'était juste un point-virgule",
                category: "programming",
                rating: 4
            },
            {
                title: "Stack Overflow",
                url: "https://i.imgflip.com/2/1bij.jpg",
                description: "Quand Stack Overflow sauve ta vie pour la 1000ème fois",
                category: "programming",
                rating: 5
            }
        ],
        gaming: [
            {
                title: "When you finally beat that boss",
                url: "https://i.imgflip.com/2/1g8my4.jpg",
                description: "La satisfaction après avoir battu un boss difficile",
                category: "gaming",
                rating: 4
            },
            {
                title: "Lag in online games",
                url: "https://i.imgflip.com/2/1bij.jpg",
                description: "Quand le lag te fait perdre une partie importante",
                category: "gaming",
                rating: 3
            }
        ],
        cats: [
            {
                title: "Grumpy Cat",
                url: "https://i.imgflip.com/2/30b1gx.jpg",
                description: "Le chat le plus célèbre d'Internet",
                category: "cats",
                rating: 5
            },
            {
                title: "Cat Logic",
                url: "https://i.imgflip.com/2/1g8my4.jpg",
                description: "La logique incompréhensible des chats",
                category: "cats",
                rating: 4
            }
        ],
        dogs: [
            {
                title: "This is Fine Dog",
                url: "https://i.imgflip.com/2/26am.jpg",
                description: "Quand tout va mal mais tu fais semblant que ça va",
                category: "dogs",
                rating: 5
            },
            {
                title: "Doge",
                url: "https://i.imgflip.com/2/4t0m5.jpg",
                description: "Much wow, very meme, such classic",
                category: "dogs",
                rating: 4
            }
        ],
        classic: [
            {
                title: "Drake Pointing",
                url: "https://i.imgflip.com/2/30b1gx.jpg",
                description: "Le meme Drake classique",
                category: "classic",
                rating: 5
            },
            {
                title: "Distracted Boyfriend",
                url: "https://i.imgflip.com/2/1ur9b0.jpg",
                description: "Le meme du petit ami distrait",
                category: "classic",
                rating: 4
            }
        ],
        trending: [
            {
                title: "Among Us",
                url: "https://i.imgflip.com/2/26am.jpg",
                description: "Sus! 📮",
                category: "trending",
                rating: 4
            },
            {
                title: "Stonks",
                url: "https://i.imgflip.com/2/4t0m5.jpg",
                description: "📈 Stonks only go up",
                category: "trending",
                rating: 5
            }
        ]
    };
    
    // Sélectionner une catégorie
    let selectedCategory = category;
    if (category === 'random') {
        const categories = Object.keys(memes);
        selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    }
    
    // Sélectionner un meme aléatoire dans la catégorie
    const categoryMemes = memes[selectedCategory] || memes.classic;
    const randomMeme = categoryMemes[Math.floor(Math.random() * categoryMemes.length)];
    
    return randomMeme;
}

/**
 * Obtenir le nom d'affichage d'une catégorie
 * @param {string} category - Catégorie
 * @returns {string} Nom d'affichage
 * @author Kofu
 */
function getCategoryName(category) {
    const names = {
        programming: '🤓 Programmation',
        gaming: '🎮 Gaming',
        cats: '😸 Chats',
        dogs: '🐕 Chiens',
        classic: '🎭 Classique',
        trending: '🔥 Trending'
    };
    
    return names[category] || '🎭 Classique';
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */