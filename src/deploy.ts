// Packages
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

// Configure dotenv
dotenv.config();

// Initalize REST
const rest = new REST({
	version: "9",
}).setToken(process.env.DISCORD_TOKEN as string);

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

// Slash Commands
let commands: any = [];
const commandFiles = getFilesInDirectory("./dist/commands/discord").filter(
	(file) => file.endsWith(".js")
);

for (const file of commandFiles) {
	import(`../${file}`)
		.then((module) => {
			const i: any = module.default;
			commands.push(i.data.meta.toJSON());
		})
		.catch((error) => {
			console.error(`Error importing ${file}: ${error}`);
		});
}

setTimeout(() => {
	rest.put(Routes.applicationCommands(process.env.CLIENT_ID as string), {
		body: commands,
	})
		.then((p) => {
			console.log(p);
			process.exit(0);
		})
		.catch(console.error);
}, 3000);
