import { Client, Message } from "revolt.js";

export default {
	meta: {
		name: "ping",
		description: "Check my Ping!",
		category: "Core",
		arguments: [],
		permissionRequired: null,
	},
	execute(
		client: Client,
		message: Message,
		args: {
			name: string;
			value: any;
		}[],
		extraData: any
	) {
		message.channel.sendMessage("Pong!").then((x) => {
			x.edit({
				content: `Pong! Took ${new Date().getTime() - message.createdAt.getTime()}ms to execute`,
			});
		});
	},
};
