// Packages
import * as redis from "redis";
import * as database from "./prisma.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import type { Snowflake } from "discord-api-types/v9";
import { Client } from "revolt.js";
import * as dotenv from "dotenv";
import { info } from "../logger.js";
import { APIUser, EmbedBuilder, WebhookClient } from "discord.js";

// Configure dotenv
dotenv.config();

// Initalize REST
const rest = new REST({
	version: "9",
}).setToken(process.env.DISCORD_TOKEN as string);

// Create a Redis client
const client = redis.createClient({
	url: "redis://localhost:6379/0",
});

client.connect();

// Create a Revolt Chat client
const revoltClient: Client = new Client();
revoltClient.loginBot(process.env.REVOLT_TOKEN);
revoltClient.on("ready", async () => info("Revolt (Dovewing)", "Ready!"));

// Cache Manager
const setCache = async (key: string, value: any): Promise<boolean> => {
	try {
		await client.setEx(key, 8 * 60 * 60, value);
		return true;
	} catch (error) {
		console.error("Error setting cache:", error);
		return false;
	}
};

const getCache = async (key: string): Promise<any> => {
	try {
		return await client.get(key);
	} catch (error) {
		console.error("Error getting cache:", error);
		return null;
	}
};

// Webhook Notices
const botDeletionNotice = async (
	name: string,
	botid: string,
	platform: string
) => {
	const webhookClient = new WebhookClient({
		id: process.env.DISCORD_LOG_CHANNEL,
		token: process.env.DISCORD_LOG_CHANNEL_TOKEN,
	});

	webhookClient.send({
		embeds: [
			new EmbedBuilder()
				.setTitle(`Bot Deleted`)
				.setColor("Random")
				.addFields(
					{
						name: "Bot",
						value: `${name} [${botid}]`,
						inline: true,
					},
					{
						name: "Platform",
						value: platform,
						inline: true,
					},
					{
						name: "Reason",
						value: "**Automatic Action**\nBot has been deleted from platform.",
						inline: true,
					}
				)
				.setFooter({
					text: `Thank you for using Select List!`,
					iconURL: "https://select-list.xyz/logo.png",
				}),
		],
	});
};

// Dovewing
const getDiscordUser = async (
	userid: Snowflake,
	bot: boolean
): Promise<boolean> => {
	const cache = await getCache(userid);

	if (cache) return true;
	else {
		const apiUserData = (await rest.get(Routes.user(userid))) as APIUser;

		if (apiUserData.bot) {
			let botData = await database.Prisma.discord_bots.findUnique({
				where: {
					botid: apiUserData.id,
				},
				include: {
					owner: false,
					comments: false,
				},
			});

			if (apiUserData.username.startsWith("deleted_user")) {
				if (bot) {
					if (botData) {
						await database.Discord.delete(userid);
						await botDeletionNotice(
							botData.name,
							userid,
							"Discord"
						);
						return null;
					}
				}
			}

			botData.name = apiUserData.username;
			botData.avatar = `https://cdn.discordapp.com/avatars/${userid}/${apiUserData.avatar}.webp`;

			await database.Discord.update(userid, botData);
			await setCache(userid, JSON.stringify(botData));

			return false;
		} else {
			let userData = await database.Prisma.users.findUnique({
				where: {
					userid: apiUserData.id,
				},
				include: {
					discord: false,
					discord_comments: false,

					revolt: false,
					revolt_comments: false,
					applications: false,
				},
			});

			if (apiUserData.username.startsWith("Deleted User")) {
				if (!bot) {
					if (userData) {
						await database.Users.delete(userid);
						return null;
					}
				}
			}

			userData.username = apiUserData.username;
			userData.avatar = `https://cdn.discordapp.com/avatars/${userid}/${apiUserData.avatar}.webp`;

			await database.Users.update(userid, userData);
			await setCache(userid, JSON.stringify(userData));

			return false;
		}
	}
};

const getRevoltUser = async (
	userid: string,
	bot: boolean
): Promise<boolean> => {
	const cache = await getCache(userid);

	if (cache) return true;
	else {
		let d = await revoltClient.users.fetch(userid).then(async (p) => {
			if (!p) {
				if (bot) {
					const botData = await database.Revolt.get({
						botid: userid,
					});

					if (botData) {
						await database.Revolt.delete(userid);
						await botDeletionNotice(botData.name, userid, "Revolt");
						return null;
					}
				}
			}

			if (p.bot) {
				let botData = await database.Prisma.revolt_bots.findUnique({
					where: {
						botid: p.id,
					},
					include: {
						owner: false,
						comments: false,
					},
				});

				botData.name = p.username;
				botData.avatar = p.avatarURL;

				await database.Revolt.update(userid, botData);
				await setCache(userid, JSON.stringify(botData));

				return false;
			}
		});

		return d;
	}
};

// Export Function
export { getDiscordUser, getRevoltUser };
