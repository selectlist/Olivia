import { Client, Message } from "revolt.js";

export default {
	meta: {
		name: "uptime",
		description: "How long have i been alive for?",
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
		const formatTime = (seconds) => {
			const days = Math.floor(seconds / 86400);
			seconds -= days * 86400;

			const hours = Math.floor(seconds / (60 * 60));
			seconds -= hours * 3600;

			const minutes = Math.floor((seconds % (60 * 60)) / 60);
			seconds -= minutes * 60;

			const secs = Math.floor(seconds % 60);

			return `${days} days, ${hours} hours, ${minutes} minutes, ${secs} seconds`;
		};

		message.channel.sendMessage(formatTime(process.uptime()));
	},
};
