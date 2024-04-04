import { SlashCommandBuilder } from "@discordjs/builders";
import { EmbedBuilder } from "discord.js";

export default {
	data: {
		meta: new SlashCommandBuilder()
			.setName("ping")
			.setDescription("Check the bot's ping"),
		permissionRequired: null,
	},
	async execute(client, interaction) {
		const reply = await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setColor("Orange")
					.setDescription(
						`Checking Discord Websocket Latency & Discord Interaction Roundtrip Latency...`
					),
			],
			fetchReply: true,
		});

		const interactionLatency = Math.round(
			reply.createdTimestamp - interaction.createdTimestamp
		);

		reply.edit({
			embeds: [
				new EmbedBuilder().setColor("Blue").addFields(
					{
						name: `Discord Websocket Latency`,
						value: `\`${interaction.client.ws.ping}\`ms`,
						inline: true,
					},
					{
						name: `Discord Interaction Roundtrip Latency`,
						value: `\`${interactionLatency}\`ms`,
						inline: true,
					}
				),
			],
		});
	},
	async autocomplete(client, interaction) {},
};
