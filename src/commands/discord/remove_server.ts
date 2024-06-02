import { SlashCommandBuilder } from "@discordjs/builders";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	Client,
	ChatInputCommandInteraction,
	PermissionsBitField,
} from "discord.js";
import * as database from "../../Serendipity/prisma.js";

// Delete file from Popkat CDN (S3)
const deleteFromPopkat = async (
	userID: string,
	platform: string,
	type: string,
	key: string
): Promise<boolean | Error> => {
	key = key.replace(`https://${process.env.PopkatCDNDomain}/`, ""); // god is dead, and we have killed him.

	// Send request to Popkat CDN with FormData
	const Request = await fetch(
		`http://localhost:${process.env.PopkatCDNAdminPort}/delete`,
		{
			method: "DELETE",
			headers: {
				userID: userID,
				platform: `selectlist_${type}_${platform}`,
				key: key,
			},
		}
	);

	// Check if request was successful.
	if (Request.status === 200) return true;
	else {
		const text: string = await Request.text();
		console.log(text);
	}
};

export default {
	data: {
		meta: new SlashCommandBuilder()
			.setName("remove-server")
			.setDescription("Remove your Server from Select List!"),
		category: "Servers",
		accountRequired: false,
		permissionRequired: null,
	},
	async execute(
		client: Client,
		interaction: ChatInputCommandInteraction,
		otherData: any
	) {
		if (
			// @ts-ignore
			!interaction.member.permissions.has(
				PermissionsBitField.Flags.ManageGuild
			)
		)
			return await interaction.reply({
				content:
					"You do not have the required permissions to execute this command.",
				ephemeral: true,
			});

		const server = await database.DiscordServers.get({
			guildid: interaction.guild.id,
		});

		if (server) {
			const embed = new EmbedBuilder()
				.setTitle("Add Server")
				.setColor("Blue")
				.setThumbnail("https://select-list.xyz/logo.png")
				.setDescription(
					"Oh, hello there. I see that you want to remove your Discord Server from Select List! Don't worry, it's super easy!\n\nAnyways, let's get started!"
				);

			const confirm = new ButtonBuilder()
				.setLabel("Continue")
				.setStyle(ButtonStyle.Success)
				.setCustomId("continue");

			const cancel = new ButtonBuilder()
				.setLabel("Cancel")
				.setStyle(ButtonStyle.Danger)
				.setCustomId("cancel");

			const row = new ActionRowBuilder().addComponents(confirm, cancel);

			const resp = await interaction.reply({
				embeds: [embed],
				// @ts-expect-error
				components: [row],
				ephemeral: true,
			});

			const btn = await resp.createMessageComponentCollector({
				filter: (i) => {
					if (i.customId === "continue") return true;
					if (i.customId === "cancel") return true;
					else return false;
				},
				time: 120000,
			});

			btn.on("collect", async (i) => {
				if (i.customId === "continue") {
					if (
						server.icon.startsWith(
							`https://${process.env.PopkatCDNDomain}/`
						)
					)
						await deleteFromPopkat(
							interaction.guild.id,
							"discord",
							"servers",
							server.icon
						);

					await database.Prisma.discord_channels.deleteMany({
						where: {
							guildid: interaction.guild.id,
						},
					});

					const deleteServer = await database.DiscordServers.delete(
						interaction.guild.id
					);

					if (deleteServer)
						await interaction.reply({
							content:
								"Success! Your server has been deleted from Select List.",
							ephemeral: true,
						});
					else
						await interaction.reply({
							content:
								"Uh oh! Something went wrong! This error has been logged. Please run this command again. If it fails again, please contact Select List for support! We are extremely sorry for this inconvience.",
							ephemeral: true,
						});
				} else if (i.customId === "cancel") {
					resp.edit({
						content:
							"This interaction has been cancelled. Please reexecute the command to complete this action.",
						embeds: [],
						components: [],
					});
				}
			});

			btn.on("end", (_, reason) => {
				if (reason !== "messageDelete") {
					resp.edit({
						content:
							"This interaction has expired. Please reexecute the command to complete this action.",
						embeds: [],
						components: [],
					});
				}
			});
		} else {
			return await interaction.reply({
				content:
					"This server is not listed on Select List. If you wish to add your server to Select List, run `/add-server`.",
				ephemeral: true,
			});
		}
	},
	async autocomplete(client, interaction) {},
};
