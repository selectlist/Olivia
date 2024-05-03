import { SlashCommandBuilder } from "@discordjs/builders";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	ModalBuilder,
	TextInputStyle,
	TextInputBuilder,
	APIActionRowComponent,
	ModalSubmitFields,
	Client,
	ChatInputCommandInteraction,
} from "discord.js";

export default {
	data: {
		meta: new SlashCommandBuilder()
			.setName("add-bot")
			.setDescription("Add your bot to Select List!"),
		category: "general",
		accountRequired: true,
		permissionRequired: null,
	},
	async execute(
		client: Client,
		interaction: ChatInputCommandInteraction,
		otherData: any
	) {
		const embed = new EmbedBuilder()
			.setTitle("Add Bot")
			.setColor("Blue")
			.setURL("https://select-list.xyz/bots/add")
			.setThumbnail("https://select-list.xyz/logo.png")
			.setDescription(
				"Oh, hello there. I see that you want to add your Discord Bot to Select List! Don't worry, it's super easy! If you want a easier experience, check out our amazing website @ https://select-list.xyz/bots/add\n\nAnyways, let's get started!"
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
				const modal = new ModalBuilder()
					.setCustomId("addbot")
					.setTitle(`Add Bot`);

				const fields: {
					name: string;
					description: string;
					short: boolean;
				}[] = [
					{
						name: "Client ID",
						description: "What's the Client ID of your bot?",
						short: true,
					},
					{
						name: "Invite",
						description:
							"Provide the Discord-generated invite for your bot!",
						short: false,
					},
					{
						name: "Short Description",
						description:
							"Write a short description of your bot. (Recommended: 2 sentences)",
						short: true,
					},
					{
						name: "Long Description",
						description:
							"Write a long description of your bot. (Recommended: 10-15 sentences)",
						short: false,
					},
					{
						name: "Tags",
						description:
							"List the tags for your bot! (seperate each one with a comma)",
						short: true,
					},
				];

				const modalFields: APIActionRowComponent<any>[] = fields.map(
					(p) => {
						return new ActionRowBuilder()
							.addComponents(
								new TextInputBuilder()
									.setCustomId(p.name)
									.setLabel(p.name)
									.setPlaceholder(p.description)
									.setStyle(
										p.short
											? TextInputStyle.Short
											: TextInputStyle.Paragraph
									)
									.setMinLength(1)
									.setRequired(true)
							)
							.toJSON();
					}
				);

				modal.addComponents(modalFields);
				await i.showModal(modal);

				i.awaitModalSubmit({
					time: 120000,
					// @ts-expect-error
					modalFilter: () => interaction.customId === "addbot",
				})
					.then(async (e) => {
						let data: {} = {};
						const modalFields: ModalSubmitFields = e.fields;
						modalFields.fields.map(
							(p) => (data[p.customId] = p.value)
						);

						try {
							// cum
							// am slowly dying inside
							// please end my suffering
							// nightmare, nightmare, nightmare
						} catch (err) {
							await i.channel.send({
								embeds: [
									new EmbedBuilder()
										.setTitle("Error")
										.setColor("Red")
										.setDescription(err.toString()),
								],
								components: [],
							});
						}
					})
					.catch(() =>
						resp.edit({
							content:
								"This interaction has been cancelled due to a error. Please reexecute the command to complete this action.",
							embeds: [],
							components: [],
						})
					);
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
	},
	async autocomplete(client, interaction) {},
};
