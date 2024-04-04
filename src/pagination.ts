import {
	ActionRowBuilder,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	APIButtonComponentWithCustomId,
} from "discord.js";

const paginationEmbed = async (
	interaction,
	pages: EmbedBuilder[],
	buttons: {
		button: ButtonBuilder;
		execute: (page: EmbedBuilder, collector: any) => Promise<void>;
	}[],
	timeout: number = 120000
) => {
	if (!pages) throw new Error("Pages are not given.");

	let page = 0;

	const defaultButtons: ButtonBuilder[] = [
		new ButtonBuilder()
			.setStyle(ButtonStyle.Primary)
			.setCustomId("previous")
			.setLabel("Previous"),
		new ButtonBuilder()
			.setStyle(ButtonStyle.Danger)
			.setCustomId("stop")
			.setLabel("Stop"),
		new ButtonBuilder()
			.setStyle(ButtonStyle.Success)
			.setCustomId("next")
			.setLabel("Next"),
	];

	const row = new ActionRowBuilder().addComponents(defaultButtons);
	const extraRow = new ActionRowBuilder().addComponents(
		buttons.map((p) => p.button)
	);

	let components = [row];
	if (buttons.length > 0) components.push(extraRow);

	if (interaction.deferred == false) await interaction.deferReply();

	const curPage = await interaction.editReply({
		embeds: [
			pages[page].setFooter({
				text: `Page ${page + 1} / ${pages.length}`,
			}),
		],
		components: components,
		fetchReply: true,
	});

	const filter = (i) => {
		if (
			buttons.find(
				(p) =>
					(
						p.button.toJSON() as Partial<APIButtonComponentWithCustomId>
					).custom_id === i.customId
			)
		)
			return true;
		else if (
			i.customId === "previous" ||
			i.customId === "stop" ||
			i.customId === "next"
		)
			return true;
		else return false;
	};

	const collector = await curPage.createMessageComponentCollector({
		filter,
		time: timeout,
	});

	collector.on("collect", async (i) => {
		const button = buttons.find(
			(p) =>
				(p.button.toJSON() as Partial<APIButtonComponentWithCustomId>)
					.custom_id === i.customId
		);

		if (button) await button.execute(pages[page], i);
		else {
			switch (i.customId) {
				case "previous":
					page = page > 0 ? --page : pages.length - 1;
					break;
				case "stop":
					collector.stop();
					break;
				case "next":
					page = page + 1 < pages.length ? ++page : 0;
					break;
				default:
					break;
			}

			await i.deferUpdate();
			await i.editReply({
				embeds: [
					pages[page].setFooter({
						text: `Page ${page + 1} / ${pages.length}`,
					}),
				],
				components: components,
			});
		}

		collector.resetTimer();
	});

	collector.on("end", (_, reason) => {
		if (reason !== "messageDelete") {
			const disabledRow = new ActionRowBuilder().addComponents(
				defaultButtons[0].setDisabled(true),
				defaultButtons[1].setDisabled(true),
				defaultButtons[2].setDisabled(true)
			);
			curPage.edit({
				embeds: [
					pages[page].setFooter({
						text: `Page ${page + 1} / ${pages.length}`,
					}),
				],
				components: [disabledRow],
			});
		}
	});

	return curPage;
};

export default paginationEmbed;
