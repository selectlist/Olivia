// Packages
import fs from "fs";
import path from "path";
import * as database from "./Serendipity/prisma.js";
import { hasPerm } from "./perms.js";
import {
	Client,
	GatewayIntentBits,
	Events,
	ActivityType,
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
	codeBlock,
	ModalSubmitInteraction,
	AutocompleteInteraction,
	Guild,
	Presence,
	GuildMember,
} from "discord.js";
import { debug, info, error } from "./logger.js";
import "./revolt.js";
import "dotenv/config";

// Config
let DISCORD_SERVER_URI: String = "https://discord.gg/XdGs8WFFtK";

// Create Discord Client
const client: Client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildPresences,
	],
	rest: {
		api:
			process.env.DISCORD_PROXY_ENABLED === "true"
				? "http://localhost:7862/api"
				: "https://discord.com/api",
	},
});

// Get files from directory
const getFilesInDirectory = (dir: string): string[] => {
	let files: string[] = [];
	const filesInDir = fs.readdirSync(dir);

	for (const file of filesInDir) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory())
			files = files.concat(getFilesInDirectory(filePath));
		else files.push(filePath);
	}

	return files;
};

// Add Commands
const commands: Map<
	string,
	{
		data: {
			meta: SlashCommandBuilder;
			category: string;
			accountRequired: boolean;
			permissionRequired: string | null;
		};
		execute: (
			client: Client,
			interaction: ChatInputCommandInteraction,
			otherData: any
		) => Promise<void>;
		autocomplete: (
			client: Client,
			interaction: AutocompleteInteraction
		) => Promise<void>;
	}
> = new Map();
const commandFiles: string[] = getFilesInDirectory(
	"./dist/commands/discord"
).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	import(`../${file}`)
		.then((module) => {
			const i = module.default;
			commands.set(i.data.meta.name, i);
		})
		.catch((error) => {
			console.error(`Error importing ${file}: ${error}`);
		});
}

// Add Modals
const modals: Map<
	string,
	{
		data: {
			name: string;
			permissionRequired: string | null;
		};
		execute: (
			client: Client,
			interaction: ModalSubmitInteraction
		) => Promise<void>;
	}
> = new Map();
const modalFiles: string[] = getFilesInDirectory("./dist/modals").filter(
	(file) => file.endsWith(".js")
);

for (const file of modalFiles) {
	import(`../${file}`)
		.then((module) => {
			const i = module.default;
			modals.set(i.data.name, i);
		})
		.catch((error) => {
			console.error(`Error importing ${file}: ${error}`);
		});
}

// Debug Event
client.on("debug", (info) => {
	debug("Discord", info);
});

// Error Event
client.on("error", (p) => {
	error("Discord", p.toString());
});

// Ready Event
client.on(Events.ClientReady, () => {
	info("Discord", `Logged in as ${client.user?.tag}!`);
	client.user?.setStatus("dnd");
	client.user?.setActivity("SL V4", { type: ActivityType.Watching });
});

// Interaction Event
client.on(Events.InteractionCreate, async (interaction) => {
	// Slash Command
	if (interaction.isChatInputCommand()) {
		const command = commands.get(interaction.commandName);
		if (!command) return;

		try {
			if (command.data.permissionRequired) {
				const user = await database.Users.get({
					userid: interaction.user.id,
				});

				if (user) {
					if (
						hasPerm(
							user.staff_perms,
							command.data.permissionRequired
						)
					)
						await command?.execute(client, interaction, {
							commands: commands,
						});
					else
						await interaction.reply({
							embeds: [
								new EmbedBuilder()
									.setTitle("Oops! Missing Permissions!")
									.setDescription(
										`You do not have enough permissions to execute this command.\nPermissions Provided: **${user.staff_perms.join(", ") || "None"}**\n Permission Required: **${command.data.permissionRequired}**.`
									)
									.setColor("Random"),
							],
						});
				} else
					await interaction.reply({
						embeds: [
							new EmbedBuilder()
								.setTitle("Oops! Missing Permissions!")
								.setDescription(
									`You do not have enough permissions to execute this command. Permission Required: **${command.data.permissionRequired}**.`
								)
								.setColor("Random"),
						],
					});
			} else
				await command?.execute(client, interaction, {
					commands: commands,
				});
		} catch (p) {
			error("Discord", p.toString());

			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("Oops! We had an issue.")
						.setDescription(
							`This issue has been reported to our developers. If you continue to having issues with our bot, you may join our [Discord Server](${DISCORD_SERVER_URI})`
						)
						.setColor("Random")
						.addFields({
							name: "Error",
							value: codeBlock("javascript", p),
							inline: false,
						}),
				],
			});
		}
	}

	// Modal
	if (interaction.isModalSubmit()) {
		const modal = modals.get(interaction.customId);
		if (!modal) return;

		try {
			if (modal.data.permissionRequired) {
				const user = await database.Users.get({
					userid: interaction.user.id,
				});

				if (user) {
					if (
						hasPerm(user.staff_perms, modal.data.permissionRequired)
					)
						await modal?.execute(client, interaction);
					else
						await interaction.reply({
							embeds: [
								new EmbedBuilder()
									.setTitle("Oops! Missing Permissions!")
									.setDescription(
										`You do not have enough permissions to execute this command.\nPermissions Provided: **${user.staff_perms.join(", ") || "None"}**\n Permission Required: **${modal.data.permissionRequired}**.`
									)
									.setColor("Random"),
							],
						});
				} else
					await interaction.reply({
						embeds: [
							new EmbedBuilder()
								.setTitle("Oops! Missing Permissions!")
								.setDescription(
									`You do not have enough permissions to execute this command. Permission Required: **${modal.data.permissionRequired}**.`
								)
								.setColor("Random"),
						],
					});
			} else await modal?.execute(client, interaction);
		} catch (p) {
			error("Discord", p.toString());

			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("Oops! We had an issue.")
						.setDescription(
							`This issue has been reported to our developers. If you continue to having issues with our bot, you may join our [Discord Server](${DISCORD_SERVER_URI})`
						)
						.setColor("Random")
						.addFields({
							name: "Error",
							value: codeBlock("javascript", p),
							inline: false,
						}),
				],
			});
		}
	}

	// Autocomplete
	if (interaction.isAutocomplete()) {
		const command = commands.get(interaction.commandName);
		if (!command) return;

		try {
			await command?.autocomplete(client, interaction);
		} catch (p) {
			error("Discord", p.toString());
			return;
		}
	}
});

// Download file, and upload to Popkat CDN (S3)
const downloadToPopkat = async (
	userID: string,
	platform: string,
	type: string,
	uri: string
): Promise<string | Error> => {
	/* Download file, using Buffer.
	let file = await fetch(uri);
	let arrayBuffer = Buffer.from(await file.arrayBuffer());

	// Turn Buffer into Blob
	let blob = new Blob([arrayBuffer], {
		type: "application/octet-stream",
	});

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
	}*/
	return uri;
};

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

// Unhide server, in event that bot rejoins server
client.on(Events.GuildCreate, async (guild: Guild) => {
	let server = await database.DiscordServers.get({
		guildid: guild.id,
	});

	if (server) {
		let servericon = guild.iconURL();

		let popkat = await downloadToPopkat(
			guild.id,
			"discord",
			"servers",
			`https://cdn.discordapp.com/avatars/${guild.id}/${servericon}.webp`
		);
		if (typeof popkat === "string") servericon = popkat;
		else
			servericon = `https://cdn.discordapp.com/avatars/${guild.id}/${servericon}.webp`;

		server.icon = servericon;
		server.invite = (
			await guild.invites.create(guild.rulesChannel, {
				temporary: false,
			})
		).url;
		server.members = guild.memberCount;
		server.onlineMembers = (
			await guild.members.fetch({ withPresences: true })
		).filter((m) => m.presence?.status === "online").size;
		server.state = "PUBLIC";

		await database.Prisma.discord_channels.createMany({
			data: guild.channels.cache
				.map((p) => {
					if (p.type === 4) return;

					let type: string;
					if (p.type === 0) type = "text";
					if (p.type === 2) type = "voice";
					if (p.type === 5) type = "announcements";
					if (p.type === 15) type = "thread";

					return {
						guildid: guild.id,
						name: p.name,
						category: p.parent.name,
						type: type,
					};
				})
				.filter((p) => p != undefined),
		});
		await database.DiscordServers.update(guild.id, server);
	}
});

// Hide server, in event that the bot leaves server
client.on(Events.GuildDelete, async (guild: Guild) => {
	let server = await database.DiscordServers.get({
		guildid: guild.id,
	});

	if (server) {
		if (server.icon.startsWith(`https://${process.env.PopkatCDNDomain}/`))
			await deleteFromPopkat(guild.id, "discord", "servers", server.icon);

		server.icon = "/";
		server.members = 0;
		server.onlineMembers = 0;
		server.state = "HIDDEN";

		await database.Prisma.discord_channels.deleteMany({
			where: {
				guildid: guild.id,
			},
		});
		await database.DiscordServers.update(guild.id, server);
	}
});

// Automatically update server info
client.on(Events.GuildUpdate, async (oldGuild: Guild, newGuild: Guild) => {
	// Retrieve the existing server data
	let server = await database.DiscordServers.get({
		guildid: newGuild.id,
	});

	// Check if the server exists
	if (server) {
		const channelList = newGuild.channels.cache; // Fetch list of channels from cache
		let servericon = newGuild.iconURL(); // Server Icon URI

		const name = newGuild.name,
			id = newGuild.id,
			owner = newGuild.ownerId,
			channels = channelList
				.map((p) => {
					if (p.type === 4) return;

					let type: string;
					if (p.type === 0) type = "text";
					if (p.type === 2) type = "voice";
					if (p.type === 5) type = "announcements";
					if (p.type === 15) type = "thread";

					return {
						guildid: id,
						name: p.name,
						category: p.parent.name,
						type: type,
					};
				})
				.filter((p) => p != undefined),
			memberCount = newGuild.memberCount,
			onlineMembers = (
				await newGuild.members.fetch({ withPresences: true })
			).filter((m) => m.presence?.status === "online").size;

		const ownerData = newGuild.members.cache.get(owner); // Fetch guild owner

		const userData = await database.Users.get({
			userid: owner,
		}); // Fetch guild owner data within SL DB

		if (!userData)
			await database.Users.create({
				username: ownerData.user.username,
				userid: owner,
				revoltid: null,
				bio: "None",
				avatar: ownerData.displayAvatarURL(),
				banner: "/banner.png",
				badges: [],
				staff_perms: [],
			});

		// Delete icon from Popkat
		if (server.icon.startsWith(`https://${process.env.PopkatCDNDomain}/`))
			await deleteFromPopkat(
				newGuild.id,
				"discord",
				"servers",
				server.icon
			);

		// Upload icon to Popkat
		let popkat = await downloadToPopkat(
			newGuild.id,
			"discord",
			"servers",
			`https://cdn.discordapp.com/avatars/${newGuild.id}/${servericon}.webp`
		);
		if (typeof popkat === "string") servericon = popkat;
		else
			servericon = `https://cdn.discordapp.com/avatars/${newGuild.id}/${servericon}.webp`;

		// Nuke all channels
		await database.Prisma.discord_channels.deleteMany({
			where: {
				guildid: newGuild.id,
			},
		});

		// Add all channels back
		await database.Prisma.discord_channels.createMany({
			data: channels,
		});

		// Update fields within server variable
		server.name = name;
		server.ownerid = id;
		server.members = memberCount;
		server.onlineMembers = onlineMembers;
		server.icon = servericon;

		// Perform the update
		await database.DiscordServers.update(id, server);
	}
});

client.on(
	Events.PresenceUpdate,
	async (oldPresence: Presence, newPresence: Presence) => {
		// Retrieve the existing server data
		let server = await database.DiscordServers.get({
			guildid: newPresence.guild.id,
		});

		// Check if the server exists
		if (server) {
			const memberCount = newPresence.guild.memberCount,
				onlineMembers = (
					await newPresence.guild.members.fetch({
						withPresences: true,
					})
				).filter((m) => m.presence?.status === "online").size;

			// Set new fields within server variable
			server.members = memberCount;
			server.onlineMembers = onlineMembers;

			// Perform the update
			await database.DiscordServers.update(newPresence.guild.id, server);
		}
	}
);

client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
	// Retrieve the existing server data
	let server = await database.DiscordServers.get({
		guildid: member.guild.id,
	});

	// Check if the server exists
	if (server) {
		const memberCount = member.guild.memberCount,
			onlineMembers = (
				await member.guild.members.fetch({ withPresences: true })
			).filter((m) => m.presence?.status === "online").size;

		// Set new fields within server variable
		server.members = memberCount;
		server.onlineMembers = onlineMembers;

		// Perform the update
		await database.DiscordServers.update(member.guild.id, server);
	}
});

client.on(Events.GuildMemberRemove, async (member: GuildMember) => {
	// Retrieve the existing server data
	let server = await database.DiscordServers.get({
		guildid: member.guild.id,
	});

	// Check if the server exists
	if (server) {
		const memberCount = member.guild.memberCount,
			onlineMembers = (
				await member.guild.members.fetch({ withPresences: true })
			).filter((m) => m.presence?.status === "online").size;

		// Set new fields within server variable
		server.members = memberCount;
		server.onlineMembers = onlineMembers;

		// Perform the update
		await database.DiscordServers.update(member.guild.id, server);
	}
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
