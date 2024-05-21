import { ActionRowBuilder, SlashCommandBuilder } from "@discordjs/builders";
import {
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	EmbedBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";

export default {
	data: {
		meta: new SlashCommandBuilder()
			.setName("help")
			.setDescription("Need help? Well, look no further!"),
		category: "support",
		accountRequired: false,
		permissionRequired: null,
	},
	async execute(
		client: Client,
		interaction: ChatInputCommandInteraction,
		otherData: any
	) {
		const cap = (string: string) =>
			string.charAt(0).toUpperCase() + string.slice(1); // Capitalize first letter

		// Take command map and put it into an array with it sorted by category
		let categories: {
			name: string;
			commands: {
				name: string;
				description: string;
				permissionRequired: string | null;
				options: any;
			}[];
		}[] = [];

		otherData.commands.forEach((value, key) => {
			if (!categories.find((p) => p.name === cap(value.data.category)))
				categories.push({
					name: cap(value.data.category),
					commands: [
						{
							name: key,
							description: value.data.meta.description,
							permissionRequired: value.data.permissionRequired,
							options: value.data.meta.options,
						},
					],
				});
			else {
				let data = categories.find(
					(p) => p.name === cap(value.data.category)
				);

				data.commands.push({
					name: key,
					description: value.data.meta.description,
					permissionRequired: value.data.permissionRequired,
					options: value.data.meta.options,
				});
			}
		});

		// Embed Fields
		const embedFields: {
			name: string;
			value: string;
			inline: boolean;
		}[] = [];

		categories.forEach((p) => {
			embedFields.push({
				name: `${p.name} Commands:`,
				value: `${p.commands
					.map((o) => `- ${o.name} - ${o.description}`)
					.join("\n")}`,
				inline: true,
			});
		});

		// Select Menu Options
		const categoryMenuOptions = new StringSelectMenuBuilder()
			.setCustomId("category-select")
			.setPlaceholder("Select Category!")
			.addOptions();

		categories.forEach((p) => {
			const data = new StringSelectMenuOptionBuilder()
				.setLabel(p.name)
				.setDescription(`Take a look at our ${p.name} commands!`)
				.setValue(p.name);

			categoryMenuOptions.options.push(data);
		});

		// Reply
		const resp = await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle("Select List Help")
					.setURL("https://select-list.xyz/")
					.setThumbnail("https://select-list.xyz/logo.png")
					.setColor("Random")
					.setDescription(
						"Hello, there. Do you need help with Select List? Well, look no further! Here are a few commands that you can use to get you started!"
					)
					.addFields(embedFields),
			],
			components: [
				new ActionRowBuilder().addComponents(
					categoryMenuOptions
				) as any,
			],
		});

		const collector = await resp.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 3_600_000,
		});

		// @ts-ignore
		collector.on("collect", async (i) => {
			const selection = i.values[0];
			const category = categories.find((p) => p.name === selection);

			if (!category)
				return await i.reply({
					content: "Please select a valid category!",
					ephemeral: true,
				});
			else {
				const embed = new EmbedBuilder()
					.setTitle(`${i.values[0]} Help`)
					.setURL("https://select-list.xyz/")
					.setThumbnail("https://select-list.xyz/logo.png")
					.setColor("Random")
					.setDescription(
						`Hey, there! Almost missed ya. Let's try to get you some help with our ${i.values[0]} commands!`
					)
					.addFields(
						category.commands.map((p) => {
							return {
								name: p.name,
								value: `Description: ${p.description}\nPermission Required: \`${p.permissionRequired || "None"}\``,
								inline: true,
							};
						})
					);

				await resp.edit({
					embeds: [embed],
				});
			}
		});
	},
	async autocomplete(client, interaction) {},
};
