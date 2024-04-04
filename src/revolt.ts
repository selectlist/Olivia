// Packages
import { Client, Message } from "revolt.js";
import fs from "fs";
import path from "path";
import { success, error } from "./logger.js";
import "dotenv/config";

// Create Revolt Client
const client: Client = new Client();

// Get files from directory
const getFilesInDirectory = (dir: string) => {
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
		meta: {
			name: string;
			description: string;
			category: string;
			arguments: {
				name: string;
				description: string;
				exampleValue: string;
				required: boolean;
			}[];
			permissionRequired: string | null;
		};
		execute: (
			client: Client,
			message: Message,
			args: {
				name: string;
				value: any;
			}[],
			extraData: any
		) => Promise<void>;
	}
> = new Map();
const commandsData = [];
const commandFiles = getFilesInDirectory("./dist/commands/revolt").filter(
	(file) => file.endsWith(".js")
);

for (const file of commandFiles) {
	import(`../${file}`)
		.then((module) => {
			const i = module.default;
			commands.set(i.meta.name, i);
			commandsData.push(i.meta);
		})
		.catch((error) => {
			console.error(`Error importing ${file}: ${error}`);
		});
}

// Ready/Error Event
client.on("ready", () => success("Revolt", "Logged in."));
client.on("error", (p) => error("Revolt", p.toString()));

// Interaction Events (message)
client.on("messageCreate", async (message) => {
	if (message.author.bot) return;
	if (message.channel.type != "TextChannel") return;
	if (!message.content.startsWith(process.env.PREFIX)) return;

	const cmd = message.content
		.slice(process.env.PREFIX.length)
		.trim()
		.split(/ +/g)
		.shift()
		.toLowerCase();

	const pairs = message.content.split(" ");
	let args: {
		name: string;
		value: any;
	}[] = [];

	for (let i = 1; i < pairs.length; i++) {
		const pair = pairs[i].split("=");
		const name = pair[0];
		const value = pair[1];

		args.push({
			name: name,
			value: value,
		});
	}

	const command = commands.get(cmd);
	if (!command) return;

	try {
		command?.execute(client, message, args, {
			commands: commandsData,
		});
	} catch (error) {
		console.error(error);
		message.reply("There was an error trying to execute that command!");
	}
});

// Login to Revolt
client.loginBot(process.env.REVOLT_TOKEN);
