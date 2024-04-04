import {
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

export default {
	data: {
		meta: new SlashCommandBuilder()
			.setName("eval")
			.setDescription("Evaluate your Code (developers only)"),
		permissionRequired: "developers.evaluate",
	},
	async execute(client, interaction) {
		const modal = new ModalBuilder()
			.setCustomId("eval-private")
			.setTitle("Evaluate your Code");

		const code = new TextInputBuilder()
			.setCustomId("code")
			.setLabel("Code")
			.setPlaceholder("Write your Code here!")
			.setStyle(TextInputStyle.Paragraph)
			.setMinLength(1)
			.setRequired(true);

		const inline = new TextInputBuilder()
			.setCustomId("inline")
			.setLabel("Do you want the embed to be inlined?")
			.setPlaceholder("Y/N [Default: N]")
			.setStyle(TextInputStyle.Short)
			.setMaxLength(1)
			.setRequired(false);

		const hidden = new TextInputBuilder()
			.setCustomId("hidden")
			.setLabel("Do you want the embed to be hidden?")
			.setPlaceholder("Y/N [Default: N]")
			.setStyle(TextInputStyle.Short)
			.setMaxLength(1)
			.setRequired(false);

		modal.addComponents(
			new ActionRowBuilder().addComponents(code),
			new ActionRowBuilder().addComponents(inline),
			new ActionRowBuilder().addComponents(hidden) as any
		);

		await interaction.showModal(modal);
	},
	async autocomplete(client, interaction) {},
};
