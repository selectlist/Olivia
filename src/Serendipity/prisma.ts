// Modules
import {
	PrismaClient,
	discord_bots,
	revolt_bots,
	users,
	tokens,
} from "@prisma/client";
import { getDiscordUser, getRevoltUser } from "./dovewing.js";
import * as crypto from "crypto";

const Prisma = new PrismaClient();

// Users
class Users {
	static async create(data: users) {
		try {
			await Prisma.users.create({
				data: data,
			});

			return true;
		} catch (error) {
			return error;
		}
	}

	static async update(id: string, data: users) {
		try {
			await Prisma.users.update({
				where: {
					userid: id,
				},
				data: data,
			});

			return true;
		} catch (err) {
			return err;
		}
	}

	static async get(data: any) {
		const doc = await Prisma.users.findUnique({
			where: data,
			include: {
				discord: true,
				revolt: true,

				discord_comments: false,
				revolt_comments: false,
				applications: false,
			},
		});

		const cache = await getDiscordUser(doc.userid, false);

		if (!doc) return null;
		else {
			doc.discord.map(async (p) => await getDiscordUser(p.botid, true));

			if (cache === true) return doc;
			else {
				const diff = await Prisma.users.findUnique({
					where: data,
					include: {
						discord: true,
						revolt: true,

						discord_comments: false,
						revolt_comments: false,
						applications: false,
					},
				});

				return diff;
			}
		}
	}

	static async find(data: any) {
		const docs = await Prisma.users.findMany({
			where: data,
			include: {
				discord: true,
				revolt: true,

				discord_comments: false,
				revolt_comments: false,
				applications: false,
			},
		});

		return docs;
	}

	static async delete(userid: string) {
		try {
			await Prisma.discord_comments.deleteMany({
				where: {
					creatorid: userid,
				},
			});

			await Prisma.discord_audits.deleteMany({
				where: {
					staffid: userid,
				},
			});

			await Prisma.revolt_comments.deleteMany({
				where: {
					creatorid: userid,
				},
			});

			await Prisma.revolt_audits.deleteMany({
				where: {
					staffid: userid,
				},
			});

			await Prisma.discord_bots.deleteMany({
				where: {
					ownerid: userid,
				},
			});

			await Prisma.revolt_bots.deleteMany({
				where: {
					ownerid: userid,
				},
			});

			await Prisma.tokens.deleteMany({
				where: {
					userid: userid,
				},
			});

			await Prisma.applications.deleteMany({
				where: {
					creatorid: userid,
				},
			});

			await Prisma.users.delete({
				where: {
					userid: userid,
				},
			});

			return true;
		} catch (err) {
			return err;
		}
	}
}

// Tokens
class Tokens {
	static async create(data: tokens) {
		try {
			await Prisma.tokens.create({
				data: data,
			});

			return true;
		} catch (error) {
			return error;
		}
	}

	static async get(data: any) {
		const doc = await Prisma.tokens.findUnique({
			where: data,
		});

		if (!doc) return null;
		else return doc;
	}

	static async delete(data: tokens) {
		try {
			await Prisma.tokens.delete({
				where: data,
			});

			return true;
		} catch (error) {
			return error;
		}
	}
}

// Discord Bots
class Discord {
	static async create(data: discord_bots) {
		try {
			await Prisma.discord_bots.create({
				data: data,
			});

			return true;
		} catch (error) {
			return error;
		}
	}

	static async update(id: string, data: discord_bots) {
		try {
			await Prisma.discord_bots.update({
				where: {
					botid: id,
				},
				data: data,
			});

			return true;
		} catch (err) {
			return err;
		}
	}

	static async get(data: any) {
		const doc = await Prisma.discord_bots.findUnique({
			where: data,
			include: {
				owner: true,
				comments: true,
			},
		});

		if (!doc) return null;
		else {
			const cache = await getDiscordUser(doc.botid, true);
			await getDiscordUser(doc.owner.userid, false);

			if (cache === true) return doc;
			else {
				const diff = await Prisma.discord_bots.findUnique({
					where: data,
					include: {
						owner: true,
						comments: true,
					},
				});

				return diff;
			}
		}
	}

	static async find(data: any) {
		const docs = await Prisma.discord_bots.findMany({
			where: data,
			include: {
				owner: true,
				comments: true,
			},
		});

		docs.map(async (p) => {
			await getDiscordUser(p.botid, true);
			await getDiscordUser(p.owner.userid, false);
		});

		const diff = await Prisma.discord_bots.findMany({
			where: data,
			include: {
				owner: true,
				comments: true,
			},
		});

		return diff;
	}

	static async delete(botid: string) {
		try {
			await Prisma.discord_comments.deleteMany({
				where: {
					botid: botid,
				},
			});

			await Prisma.discord_audits.deleteMany({
				where: {
					botid: botid,
				},
			});

			await Prisma.discord_bots.delete({
				where: {
					botid: botid,
				},
			});

			return true;
		} catch (err) {
			return err;
		}
	}

	static async comment(
		BotID: string,
		UserID: string,
		Caption: string,
		Image: string
	) {
		try {
			await Prisma.discord_comments.create({
				data: {
					botid: BotID,
					commentid: crypto.randomUUID().toString(),
					creatorid: UserID,
					caption: Caption,
					image: Image,
				},
			});

			return true;
		} catch (err) {
			return err;
		}
	}
}

// Revolt Bots
class Revolt {
	static async create(data: revolt_bots) {
		try {
			await Prisma.revolt_bots.create({
				data: data,
			});

			return true;
		} catch (error) {
			return error;
		}
	}

	static async update(id: string, data: revolt_bots) {
		try {
			await Prisma.revolt_bots.update({
				where: {
					botid: id,
				},
				data: data,
			});

			return true;
		} catch (err) {
			return err;
		}
	}

	static async get(data: any) {
		const doc = await Prisma.revolt_bots.findUnique({
			where: data,
			include: {
				owner: true,
				comments: true,
			},
		});

		if (!doc) return null;
		else {
			const cache = await getRevoltUser(doc.botid, true);
			await getDiscordUser(doc.owner.userid, false);

			if (cache === true) return doc;
			else {
				const diff = await Prisma.revolt_bots.findUnique({
					where: data,
					include: {
						owner: true,
						comments: true,
					},
				});

				return diff;
			}
		}
	}

	static async find(data: any) {
		const docs = await Prisma.revolt_bots.findMany({
			where: data,
			include: {
				owner: true,
				comments: true,
			},
		});

		docs.map(async (p) => {
			await getRevoltUser(p.botid, true);
			await getDiscordUser(p.owner.userid, false);
		});

		const diff = await Prisma.revolt_bots.findMany({
			where: data,
			include: {
				owner: true,
				comments: true,
			},
		});

		return diff;
	}

	static async delete(botid: string) {
		try {
			await Prisma.revolt_comments.deleteMany({
				where: {
					botid: botid,
				},
			});

			await Prisma.revolt_audits.deleteMany({
				where: {
					botid: botid,
				},
			});

			await Prisma.revolt_bots.delete({
				where: {
					botid: botid,
				},
			});

			return true;
		} catch (err) {
			return err;
		}
	}

	static async comment(
		BotID: string,
		UserID: string,
		Caption: string,
		Image: string
	) {
		try {
			await Prisma.revolt_comments.create({
				data: {
					botid: BotID,
					commentid: crypto.randomUUID().toString(),
					creatorid: UserID,
					caption: Caption,
					image: Image,
				},
			});

			return true;
		} catch (err) {
			return err;
		}
	}
}

// Developer Applications
class Applications {
	static async createApp(creator_id: string, name: string, logo: string) {
		try {
			const token: string = crypto
				.createHash("sha256")
				.update(
					`${crypto.randomUUID()}_${crypto.randomUUID()}`.replace(
						/-/g,
						""
					)
				)
				.digest("hex");

			await Prisma.applications.create({
				data: {
					creatorid: creator_id,
					name: name,
					logo: logo,
					token: token,
					active: true,
					permissions: ["global.*"],
				},
			});

			return token;
		} catch (err) {
			return err;
		}
	}

	static async updateApp(token: string, data: any) {
		try {
			await Prisma.applications.update({
				data: data,
				where: {
					token: token,
				},
			});

			return true;
		} catch (err) {
			return err;
		}
	}

	static async get(token: string) {
		const tokenData = await Prisma.applications.findUnique({
			where: {
				token: token,
			},
			include: {
				owner: true,
			},
		});

		if (tokenData) return tokenData;
		else return null;
	}

	static async getAllApplications(creatorid: string) {
		try {
			const doc = await Prisma.applications.findMany({
				where: {
					creatorid: creatorid,
				},
				include: {
					owner: true,
				},
			});

			return doc;
		} catch (error) {
			return error;
		}
	}

	static async delete(data: any) {
		try {
			await Prisma.applications.delete({
				where: data,
			});

			return true;
		} catch (err) {
			return err;
		}
	}
}

// Export Classes
export { Users, Discord, Revolt, Applications, Tokens, Prisma };
