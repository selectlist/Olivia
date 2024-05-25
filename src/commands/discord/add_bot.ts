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
	WebhookClient,
} from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import type { RESTGetAPIUserResult } from "discord-api-types/v9";
import * as database from "../../Serendipity/prisma.js";

// Initalize REST
const rest = new REST({
	version: "9",
}).setToken(process.env.DISCORD_TOKEN as string);

// Initalize Webhook Client
const webhookClient = new WebhookClient({
	id: process.env.DISCORD_LOG_CHANNEL,
	token: process.env.DISCORD_LOG_CHANNEL_TOKEN,
});

export default {
	data: {
		meta: new SlashCommandBuilder()
			.setName("add-bot")
			.setDescription("Add your bot to Select List!"),
		category: "Bots",
		accountRequired: false,
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
									.setCustomId(
										p.name.toLowerCase().replace(" ", "_")
									)
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
							const apiUserData = (await rest.get(
								Routes.user(data["client_id"])
							)) as RESTGetAPIUserResult;

							if (!apiUserData)
								return i.channel.send({
									embeds: [
										new EmbedBuilder()
											.setTitle("Error")
											.setColor("Red")
											.setDescription(
												"Sorry, that client does not exist!"
											),
									],
									components: [],
								});
							else if (apiUserData.bot) {
								const checkData = await database.Discord.get({
									botid: data["client_id"],
								});

								if (checkData)
									return i.channel.send({
										embeds: [
											new EmbedBuilder()
												.setTitle("Error")
												.setColor("Red")
												.setDescription(
													"Sorry, that bot already exists in the database."
												),
										],
										components: [],
									});

								const userData = await database.Users.get({
									userid: interaction.user.id,
								});

								if (!userData)
									await database.Users.create({
										username: interaction.user.username,
										userid: interaction.user.id,
										revoltid: null,
										bio: "None",
										avatar: interaction.user.displayAvatarURL(),
										banner: "/banner.png",
										badges: [],
										staff_perms: [],
									});

								const resp = await database.Discord.create({
									botid: data["client_id"],
									name: apiUserData.username,
									avatar: `https://cdn.discordapp.com/avatars/${data["client_id"]}/${apiUserData.avatar}.png`,
									banner: "/banner.png",
									tags: data["tags"]
										.split(", ")
										.map((p) => p),
									invite: data["invite"],
									description: data["short_description"],
									longdescription: data["long_description"],
									servers: 0,
									shards: 0,
									users: 0,
									claimedBy: null,
									state: "PENDING",
									upvotes: [],
									downvotes: [],
									ownerid: interaction.user.id,
									additional_owners: [],
								})
									.then(() => {
										return true;
									})
									.catch(() => {
										return false;
									});

								if (resp) {
									webhookClient.send({
										content: "@everyone",
										embeds: [
											new EmbedBuilder()
												.setTitle("New Bot")
												.setDescription(
													`<@${interaction.user.id}> has just added a new bot to Select List!`
												)
												.setTimestamp()
												.setColor("Green")
												.setThumbnail(
													`https://cdn.discordapp.com/avatars/${data["client_id"]}/${apiUserData.avatar}.png`
												)
												.addFields(
													{
														name: "Bot",
														value: `${apiUserData.username} [${data["client_id"]}]`,
														inline: true,
													},
													{
														name: "Platform",
														value: "Discord",
														inline: true,
													}
												)
												.setFooter({
													text: `Thank you for using Select List!`,
													iconURL:
														"https://select-list.xyz/logo.png",
												}),
										],
									});

									return i.channel.send({
										embeds: [
											new EmbedBuilder()
												.setTitle("Success!")
												.setColor("Green")
												.setDescription(
													"Your bot has been added into the queue!"
												),
										],
										components: [],
									});
								}
							}
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
