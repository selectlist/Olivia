import { SlashCommandBuilder } from "@discordjs/builders";
import { EmbedBuilder } from "discord.js";
import Pagination from "../../pagination.js";
import * as database from "../../Serendipity/prisma.js";

export default {
	data: {
		meta: new SlashCommandBuilder()
			.setName("list_bots")
			.setDescription("List all Bots.")
			.addBooleanOption((option) =>
				option
					.setName("revolt")
					.setDescription("Should we include bots from Revolt Chat?")
					.setRequired(false)
			),
		permissionRequired: null,
	},
	async execute(client, interaction) {
		const revoltOption = interaction.options.getBoolean("revolt");

		const discord = await database.Discord.find({
			state: "APPROVED",
		});
		const revolt = await database.Revolt.find({
			state: "APPROVED",
		});

		let pages = discord.map((p) => {
			return new EmbedBuilder()
				.setTitle(p.name)
				.setDescription(p.description)
				.setThumbnail(
					p.avatar === "/logo.png"
						? "https://sparkyflight.xyz/logo.png"
						: p.avatar
				)
				.setColor("Random")
				.setAuthor({
					name: p.owner.username,
					iconURL:
						p.owner.avatar === "/logo.png"
							? "https://sparkyflight.xyz/logo.png"
							: p.owner.avatar,
				})
				.setTimestamp();
		});

		if (revoltOption)
			revolt.map((p) =>
				pages.push(
					new EmbedBuilder()
						.setTitle(`${p.name} [Revolt]`)
						.setDescription(p.description)
						.setThumbnail(
							p.avatar === "/logo.png"
								? "https://sparkyflight.xyz/logo.png"
								: p.avatar
						)
						.setColor("Random")
						.setAuthor({
							name: p.owner.username,
							iconURL:
								p.owner.avatar === "/logo.png"
									? "https://sparkyflight.xyz/logo.png"
									: p.owner.avatar,
						})
						.setTimestamp()
				)
			);

		if (pages.length === 0)
			return await interaction.reply({
				content: "Sorry, there are no bots to show.",
			});
		else return await Pagination(interaction, pages, []);
	},
	async autocomplete(client, interaction) {},
};
