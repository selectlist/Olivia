import { Client, Message } from "revolt.js";

export default {
	meta: {
		name: "help",
		description: "What commands do i have?",
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
		message.channel.sendMessage(
			extraData.commands
				.map((p) => {
					return `${p.name} - ${p.description}`;
				})
				.join("\n")
		);
	},
};
