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
	PermissionsBitField,
} from "discord.js";
import * as database from "../../Serendipity/prisma.js";

// Download file, and upload to Popkat CDN (S3)
const downloadToPopkat = async (
	userID: string,
	platform: string,
	type: string,
	uri: string
): Promise<string | Error> => {
	// Download file, using Buffer.
	let file = await fetch(uri);
	let arrayBuffer = Buffer.from(await file.arrayBuffer());

	// Turn Buffer into Blob
	let blob = new Blob([arrayBuffer], { type: "application/octet-stream" });

	// Create a new FormData instance
	const formData = new FormData();

	// Append the Blob to FormData as 'file'
	formData.append("file", blob);

	// Send request to Popkat CDN with FormData
	const Request = await fetch(
		`https://${process.env.PopkatCDNDomain}/upload`,
		{
			method: "POST",
			body: formData,
			headers: {
				userID: userID,
				platform: `selectlist_${type}_${platform}`,
			},
		}
	);

	// Check if request was successful.
	if (Request.status === 200) {
		const json: {
			key: string;
		} = await Request.json();

		return `https://${process.env.PopkatCDNDomain}/${json.key}`;
	} else {
		const text: string = await Request.text();
		throw new Error(`[Popkat CDN Error] => ${text}`);
	}
};

export default {
	data: {
		meta: new SlashCommandBuilder()
			.setName("add-server")
			.setDescription("Add your Server to Select List!"),
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

		const checkData = await database.DiscordServers.get({
			guildid: interaction.guild.id,
		});

		if (checkData)
			return await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("Error")
						.setColor("Red")
						.setDescription(
							"Sorry, this server already exists in the database. Run `/remove-server` to remove."
						),
				],
				ephemeral: true,
			});

		const embed = new EmbedBuilder()
			.setTitle("Add Server")
			.setColor("Blue")
			.setThumbnail("https://select-list.xyz/logo.png")
			.setDescription(
				"Oh, hello there. I see that you want to add your Discord Server to Select List! Don't worry, it's super easy!\n\nAnyways, let's get started!"
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
					.setCustomId("addserver")
					.setTitle(`Add Server`);

				const fields: {
					name: string;
					description: string;
					short: boolean;
				}[] = [
					{
						name: "Short Description",
						description:
							"Write a short description of your server. (Recommended: 2 sentences)",
						short: true,
					},
					{
						name: "Long Description",
						description:
							"Write a long description of your server. (Recommended: 10-15 sentences)",
						short: false,
					},
					{
						name: "Tags",
						description:
							"List the tags for your server! (seperate each one with a comma)",
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
					modalFilter: () => interaction.customId === "addserver",
				})
					.then(async (e) => {
						let data: {} = {};
						const modalFields: ModalSubmitFields = e.fields;
						modalFields.fields.map(
							(p) => (data[p.customId] = p.value)
						);

						try {
							const channelList =
								await interaction.guild.channels.fetch();

							let servericon = interaction.guild.iconURL();

							const name = interaction.guild.name,
								id = interaction.guild.id,
								owner = interaction.guild.ownerId,
								invite = await interaction.guild.invites.create(
									interaction.guild.rulesChannel,
									{
										temporary: false,
									}
								),
								channels = channelList
									.map((p) => {
										if (p.type === 4) return;

										let type: string;
										if (p.type === 0) type = "text";
										if (p.type === 2) type = "voice";
										if (p.type === 5)
											type = "announcements";
										if (p.type === 15) type = "thread";

										return {
											guildid: id,
											name: p.name,
											category: p.parent.name,
											type: type,
										};
									})
									.filter((p) => p != undefined),
								memberCount = interaction.guild.memberCount,
								onlineMembers =
									interaction.guild.members.cache.filter(
										(m) => m.presence.status === "online"
									).size;

							const userData = await database.Users.get({
								userid: owner,
							});

							if (!userData)
								await database.Users.create({
									username: (
										await interaction.guild.fetchOwner()
									).user.username,
									userid: owner,
									revoltid: null,
									bio: "None",
									avatar: interaction.user.displayAvatarURL(),
									banner: "/banner.png",
									badges: [],
									staff_perms: [],
								});

							let popkat = await downloadToPopkat(
								id,
								"discord",
								"servers",
								`https://cdn.discordapp.com/avatars/${id}/${servericon}.webp`
							);
							if (typeof popkat === "string") servericon = popkat;
							else
								servericon = `https://cdn.discordapp.com/avatars/${id}/${servericon}.webp`;

							const resp = await database.DiscordServers.create({
								guildid: id,
								name: name,
								icon: servericon,
								banner: "/guildbanner.png",
								tags: data["tags"]
									.split(", ")
									.map((a: string) => a),
								invite: invite.url,
								description: data["short_description"],
								longdescription: data["long_description"],
								members: memberCount,
								onlineMembers: onlineMembers,
								state: "PUBLIC",
								upvotes: [],
								downvotes: [],
								ownerid: owner,
							})
								.then(() => {
									return true;
								})
								.catch(() => {
									return false;
								});

							if (resp) {
								await database.Prisma.discord_channels.createMany(
									{
										data: channels,
									}
								);

								return i.channel.send({
									embeds: [
										new EmbedBuilder()
											.setTitle("Success")
											.setColor("Green")
											.setDescription(
												`Successfully added your server to Select List!`
											),
									],
									components: [],
								});
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
