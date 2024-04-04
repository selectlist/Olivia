// AUTO GENERATED FILE BY @kalissaac/prisma-typegen
// DO NOT EDIT

export enum botstate {
	CLAIMED = "CLAIMED",
	APPROVED = "APPROVED",
	DENIED = "DENIED",
	PENDING = "PENDING",
	BANNED = "BANNED",
}

export enum botaction {
	CLAIMED = "CLAIMED",
	UNCLAIMED = "UNCLAIMED",
	APPROVED = "APPROVED",
	DENIED = "DENIED",
	BANNED = "BANNED",
	VOTE_BANNED = "VOTE_BANNED",
	TRANSFERRED = "TRANSFERRED",
	OTHER = "OTHER",
}

export interface users {
	username?: string;
	userid: string;
	revoltid?: string;
	bio: string;
	avatar: string;
	badges: string[];
	staff_perms: string[];
	discord: discord_bots[];
	discord_comments: discord_comments[];
	revolt: revolt_bots[];
	revolt_comments: revolt_comments[];
	applications: applications[];
}

export interface discord_bots {
	botid: string;
	name: string;
	avatar: string;
	tags: string[];
	invite?: string;
	description: string;
	longdescription: string;
	servers: number;
	shards: number;
	users: number;
	claimedBy?: string;
	state: botstate;
	auditlogs: discord_audits[];
	upvotes: string[];
	downvotes: string[];
	comments: discord_comments[];
	ownerid: string;
	owner: users;
	additional_owners: string[];
}

export interface revolt_bots {
	botid: string;
	name: string;
	avatar: string;
	tags: string[];
	invite?: string;
	description: string;
	longdescription: string;
	servers: number;
	shards: number;
	users: number;
	claimedBy?: string;
	state: botstate;
	auditlogs: revolt_audits[];
	upvotes: string[];
	downvotes: string[];
	comments: revolt_comments[];
	ownerid: string;
	owner: users;
	additional_owners: string[];
}

export interface tokens {
	id: string;
	userid: string;
	token: string;
	agent?: string;
	createdAt: Date;
}

export interface applications {
	creatorid: string;
	owner: users;
	name: string;
	logo: string;
	token: string;
	active: boolean;
	permissions: string[];
}

export interface discord_audits {
	id: number;
	botid: string;
	bot: discord_bots;
	staffid: string;
	action: botaction;
	reason: string;
}

export interface discord_comments {
	commentid: string;
	creatorid: string;
	user: users;
	bot: discord_bots;
	botid: string;
	caption: string;
	image?: string;
}

export interface revolt_audits {
	id: number;
	botid: string;
	bot: revolt_bots;
	staffid: string;
	action: botaction;
	reason: string;
}

export interface revolt_comments {
	commentid: string;
	creatorid: string;
	user: users;
	bot: revolt_bots;
	botid: string;
	caption: string;
	image?: string;
}
