import { botaction } from "@prisma/client";
import { hasPerm } from "../perms.js";
import { EmbedBuilder, WebhookClient } from "discord.js";
import * as database from "./prisma.js";

const checkPerms = async (userid: string, perm: string) => {
	const user = await database.Users.get({
		userid: userid,
	});

	if (!user) return false;
	else return hasPerm(user?.staff_perms, perm);
};

const logAction = async (
	action: botaction,
	reason: string,
	platform: string,
	userid: string,
	botid: string
): Promise<boolean | Error> => {
	try {
		const webhookClient = new WebhookClient({
			id: process.env.DISCORD_LOG_CHANNEL,
			token: process.env.DISCORD_LOG_CHANNEL_TOKEN,
		});

		let bot = null;
		const staffMember = await database.Users.get({
			userid: userid,
		});

		if (platform === "Discord") {
			bot = await database.Discord.get({
				botid: botid,
			});

			await database.Prisma.discord_audits.create({
				data: {
					botid: botid,
					staffid: userid,
					action: action,
					reason: reason,
				},
			});
		} else if (platform === "Revolt") {
			bot = await database.Revolt.get({
				botid: botid,
			});

			await database.Prisma.revolt_audits.create({
				data: {
					botid: botid,
					staffid: userid,
					action: action,
					reason: reason,
				},
			});
		}

		webhookClient.send({
			content: `<@${bot.owner.userid}>`,
			embeds: [
				new EmbedBuilder()
					.setTitle(`Bot ${action.toLowerCase()}`)
					.setColor("Random")
					.setAuthor({
						name: staffMember.username,
						iconURL: staffMember.avatar,
					})
					.setThumbnail(bot.avatar)
					.addFields(
						{
							name: "Bot",
							value: `${bot.name} [${botid}]`,
							inline: true,
						},
						{
							name: "Platform",
							value: platform,
							inline: true,
						},
						{
							name: "Action",
							value: action.toLowerCase(),
							inline: true,
						},
						{
							name: "Reason",
							value: reason,
							inline: true,
						}
					)
					.setFooter({
						text: `Thank you for using Select List!`,
						iconURL: "https://select-list.xyz/logo.png",
					}),
			],
		});

		return true;
	} catch (error) {
		throw new Error(error);
	}
};

// RPC
const availableEntities: {
	namespace: string;
	actions: {
		name: string;
		description: string;
		params: {
			name: string;
			description: string;
		}[];
		permissionRequired: string;
		execute: (data: any) => Promise<boolean | Error>;
	}[];
}[] = [
	{
		namespace: "bots",
		actions: [
			{
				name: "claim",
				description: "Claim bot.",
				params: [
					{
						name: "bot_id",
						description: "What is the Bot ID?",
					},
					{
						name: "staff_id",
						description: "What is the Staff Member ID?",
					},
					{
						name: "platform",
						description: "Discord or Revolt?",
					},
				],
				permissionRequired: "bots.claim",
				execute: async (data: any) => {
					let bot = await database.Prisma[
						`${data.platform.toLowerCase()}_bots`
					].findUnique({
						where: {
							botid: data.bot_id,
						},
					});

					if (bot.state === "CLAIMED")
						throw new Error(
							"Sorry, this bot was already claimed by another staff member. If you wish to test it anyway, you may unclaim it."
						);

					bot.state = "CLAIMED";
					bot.claimedBy = data.staff_id;

					await database[data.platform].update(data.bot_id, bot);
					await logAction(
						"CLAIMED",
						"Bot claimed.",
						data.platform,
						data.staff_id,
						data.bot_id
					);

					return true;
				},
			},
			{
				name: "unclaim",
				description: "Unclaim bot.",
				params: [
					{
						name: "bot_id",
						description: "What is the Bot ID?",
					},
					{
						name: "staff_id",
						description: "What is the Staff Member ID?",
					},
					{
						name: "platform",
						description: "Discord or Revolt?",
					},
					{
						name: "reason",
						description: "Why are you unclaiming this entity?",
					},
				],
				permissionRequired: "bots.unclaim",
				execute: async (data: any) => {
					let bot = await database.Prisma[
						`${data.platform.toLowerCase()}_bots`
					].findUnique({
						where: {
							botid: data.bot_id,
						},
					});

					if (bot.state != "CLAIMED")
						throw new Error(
							"Sorry, this bot cannot be unclaimed; as it hasn't been claimed."
						);

					bot.state = "PENDING";
					bot.claimedBy = null;

					await database[data.platform].update(data.bot_id, bot);
					await logAction(
						"UNCLAIMED",
						data.reason,
						data.platform,
						data.staff_id,
						data.bot_id
					);

					return true;
				},
			},
			{
				name: "approve",
				description: "Approve bot.",
				params: [
					{
						name: "bot_id",
						description: "What is the Bot ID?",
					},
					{
						name: "staff_id",
						description: "What is the Staff Member ID?",
					},
					{
						name: "platform",
						description: "Discord or Revolt?",
					},
					{
						name: "reason",
						description: "Why are you approving this entity?",
					},
				],
				permissionRequired: "bots.approve",
				execute: async (data: any) => {
					let bot = await database.Prisma[
						`${data.platform.toLowerCase()}_bots`
					].findUnique({
						where: {
							botid: data.bot_id,
						},
					});

					if (bot === "CLAIMED") {
						if (bot.claimedBy === data.staff_id) {
							bot.state = "APPROVED";
							bot.claimedBy = null;

							await database[data.platform].update(
								data.bot_id,
								bot
							);
							await logAction(
								"APPROVED",
								data.reason,
								data.platform,
								data.staff_id,
								data.bot_id
							);

							return true;
						}
					} else
						throw new Error(
							"Sorry, you cannot approve this bot; as you aren't the Staff Member that has claimed it. If you took over their testing, simply unclaim the bot and reclaim it."
						);
				},
			},
			{
				name: "unapprove",
				description:
					"Unapprove bot for further review. Sends it right back to the queue!",
				params: [
					{
						name: "bot_id",
						description: "What is the Bot ID?",
					},
					{
						name: "staff_id",
						description: "What is the Staff Member ID?",
					},
					{
						name: "platform",
						description: "Discord or Revolt?",
					},
					{
						name: "reason",
						description: "Why are you unapproving this entity?",
					},
				],
				permissionRequired: "bots.unapprove",
				execute: async (data: any) => {
					let bot = await database.Prisma[
						`${data.platform.toLowerCase()}_bots`
					].findUnique({
						where: {
							botid: data.bot_id,
						},
					});
					bot.state = "APPROVED";
					bot.claimedBy = null;

					await database[data.platform].update(data.bot_id, bot);
					await logAction(
						"APPROVED",
						data.reason,
						data.platform,
						data.staff_id,
						data.bot_id
					);

					return true;
				},
			},
			{
				name: "deny",
				description: "Deny bot.",
				params: [
					{
						name: "bot_id",
						description: "What is the Bot ID?",
					},
					{
						name: "staff_id",
						description: "What is the Staff Member ID?",
					},
					{
						name: "platform",
						description: "Discord or Revolt?",
					},
					{
						name: "reason",
						description: "Why are you denying this entity?",
					},
				],
				permissionRequired: "bots.deny",
				execute: async (data) => {
					let bot = await database.Prisma[
						`${data.platform.toLowerCase()}_bots`
					].findUnique({
						where: {
							botid: data.bot_id,
						},
					});

					if (bot === "CLAIMED") {
						if (bot.claimedBy === data.staff_id) {
							bot.state = "DENIED";
							bot.claimedBy = null;

							await database[data.platform].update(
								data.bot_id,
								bot
							);
							await logAction(
								"DENIED",
								data.reason,
								data.platform,
								data.staff_id,
								data.bot_id
							);

							return true;
						}
					} else
						throw new Error(
							"Sorry, you cannot deny this bot; as you aren't the Staff Member that has claimed it. If you took over their testing, simply unclaim the bot and reclaim it."
						);
				},
			},
			{
				name: "ban",
				description: "Ban bot.",
				params: [
					{
						name: "bot_id",
						description: "What is the Bot ID?",
					},
					{
						name: "staff_id",
						description: "What is the Staff Member ID?",
					},
					{
						name: "platform",
						description: "Discord or Revolt?",
					},
					{
						name: "reason",
						description: "Why are you banning this entity?",
					},
				],
				permissionRequired: "bots.ban",
				execute: async (data) => {
					let bot = await database.Prisma[
						`${data.platform.toLowerCase()}_bots`
					].findUnique({
						where: {
							botid: data.bot_id,
						},
					});

					if (bot.state === "BANNED")
						throw new Error(
							"Sorry, you cannot ban this bot; as it was already banned."
						);

					bot.state = "BANNED";
					bot.claimedBy = null;

					await database[data.platform].update(data.bot_id, bot);
					await logAction(
						"BANNED",
						data.reason,
						data.platform,
						data.staff_id,
						data.bot_id
					);

					return true;
				},
			},
			{
				name: "unban",
				description: "Unban bot.",
				params: [
					{
						name: "bot_id",
						description: "What is the Bot ID?",
					},
					{
						name: "staff_id",
						description: "What is the Staff Member ID?",
					},
					{
						name: "platform",
						description: "Discord or Revolt?",
					},
					{
						name: "reason",
						description: "Why are you unbanning this entity?",
					},
				],
				permissionRequired: "bots.unban",
				execute: async (data) => {
					let bot = await database.Prisma[
						`${data.platform.toLowerCase()}_bots`
					].findUnique({
						where: {
							botid: data.bot_id,
						},
					});

					if (bot.state != "BANNED")
						throw new Error(
							"Sorry, you cannot unban this bot; as it isn't banned."
						);

					bot.state = "PENDING";
					bot.claimedBy = null;

					await database[data.platform].update(data.bot_id, bot);
					await logAction(
						"BANNED",
						data.reason,
						data.platform,
						data.staff_id,
						data.bot_id
					);

					return true;
				},
			},
			{
				name: "transfer",
				description: "Transfer Bot Ownership.",
				params: [
					{
						name: "bot_id",
						description: "What is the Bot ID?",
					},
					{
						name: "staff_id",
						description: "What is the Staff Member ID?",
					},
					{
						name: "recipient_id",
						description: "What is the Recipient ID?",
					},
					{
						name: "platform",
						description: "Discord or Revolt?",
					},
					{
						name: "reason",
						description: "Why are you transferring this entity?",
					},
				],
				permissionRequired: "bots.transfer",
				execute: async (data) => {
					let bot = await database.Prisma[
						`${data.platform.toLowerCase()}_bots`
					].findUnique({
						where: {
							botid: data.bot_id,
						},
					});

					bot.ownerid = data.recipient_id;
					bot.claimedBy = null;

					await database[data.platform].update(data.bot_id, bot);
					await logAction(
						"TRANSFERRED",
						data.reason,
						data.platform,
						data.staff_id,
						data.bot_id
					);

					return true;
				},
			},
		],
	},
];

const Query = async (action: string, data: any): Promise<boolean | Error> => {
	const entity = availableEntities.find(
		(p) => p.namespace === action.split(".")[0]
	);
	const entityAction = entity.actions.find(
		(p) => p.name === action.split(".")[1]
	);

	if (entityAction) {
		if (checkPerms(data.staff_id, entityAction.permissionRequired)) {
			const ActionParams = entityAction.params.map((p) => p.name);

			if (Object.keys(data).every((key) => ActionParams.includes(key)))
				return await entityAction?.execute(data);
			else return new Error("[RPC Error] => Invalid Parameters.");
		} else
			return new Error(
				"[RPC Error] => You do not have permission to do this action."
			);
	}
};

export { Query, availableEntities };
