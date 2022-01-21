
import { StaticAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { ChatClient, ChatSayMessageAttributes, PrivateMessage } from '@twurple/chat';
import { TwitchAuth } from './auth';
import { exit } from 'process';

import { env } from "process";
import { setInterval, setTimeout } from 'timers';
import { TwitchChat } from './chat';
import { RedLightGreenLight } from './redlightgreenlight';
const { TWITCH_CLIENT_ID } = env;

// const twitchAuth = new TwitchAuth();

// TEST

// (async () => {
// 	// Connect to TwitchAPI
// 	const twitchChat = new TwitchChat();
// 	await twitchChat.connect();

// 	setTimeout(async () => {
// 		twitchChat.say('TIMEOUT Durss 10');
// 		console.log(1);
// 		await twitchChat.chatClient?.timeout(`#${twitchChat.channelOwner}`, 'Durss', 10, "T'AS PERDU PATATE");
// 		console.log(2);
// 		// twitchChat.say('/timeout Durss 10');
// 	}, 2_000);
// })();

new RedLightGreenLight();


(async () => {
	// Connect to TwitchAPI
	const twitchChat = new TwitchChat();
	await twitchChat.connect();
	console.log('Connected to Twitch chat of', twitchChat.channelOwner);

	// GAME
	const config = {
		glDuration: 10_000,
		rlDuration: 5_000,
		score: 20,
	}

	const players = new Map<string, number>();
	const winners = new Set();

	let lock = false;
	let started = false;
	let gameStarted = false;

	enum Light { Green, Red };
	let light: Light;


	const play = () => {
		twitchChat.say("vchabrStonks vchabrStonks vchabrStonks vchabrStonks C'est tipar ma gueule");

		lock = true;
		gameStarted = true;
		light = Light.Green;

		// @ts-ignore
		const intervals = [];

		setTimeout(() => {
			intervals.push(setInterval(() => {
				twitchChat.say('vchabrStonks vchabrStonks vchabrStonks vchabrStonks');
				light = Light.Green;
			}, config.glDuration + config.rlDuration));
		}, config.rlDuration);

		intervals.push(setInterval(() => {
			twitchChat.say('vchabrPasStonks vchabrPasStonks vchabrPasStonks vchabrPasStonks');
			light = Light.Red;
		}, config.glDuration + config.rlDuration));

		intervals.push(setInterval(() => {
			if (players.size > 0) return;

			gameStarted = false;
			started = false;

			twitchChat.say('LA PARTIE EST FINIE WESH');

			if (winners.size) twitchChat.say('VAINQUEURS: ' + [...winners.values()].join(', '));
			else twitchChat.say('TOUT LE MONDE A PERDU BANDE DE NAZES');

			// @ts-ignore
			for (const interval of intervals) {
				clearInterval(interval);
			}
		}, 500));
	}

	const chatListener = twitchChat.onMessage(async (user: string, message: string, msg: PrivateMessage) => {
		if (message === '!play' && user === twitchChat.channelOwner) {
			twitchChat.say('La partie de "1, 2, 3, Soleil" va bientôt démarrer. Tapez !join pour participer !')
			lock = false;
			gameStarted = false;
			started = true;
		}

		if (!started) return;

		if (!lock && message === "!join") {
			if (players.has(user)) twitchChat.say("T'es déjà inscrit patate", { replyTo: msg });
			else {
				players.set(user, 0);
				twitchChat.say(`-> ${user} rejoint la partie ! (${players.size} joueur·euse·s inscrits)`);
			}
		}

		if (message === "!players") {
			if (players.size > 0) twitchChat.say('Joueurs en jeu: ' + [...players.keys()].join(', '));
			else twitchChat.say('Aucun joueur en jeu. Tapez !join pour participer !')
		}

		if (message === '!start' && user === twitchChat.channelOwner) {
			winners.clear();

			twitchChat.say(`Et c'est parti avec ${players.size} joueur·euse·s DANS 5 SECONDES`);
			twitchChat.say('- Après le départ, écrivez "LOL" suivi de ce que vous voulez dans le chat pour avancer. Vous devez avancer de 20 cases pour gagner -');

			setTimeout(() => play(), 5_000)
		}

		if (!gameStarted) return;

		if (message.startsWith('LOL')) {
			if (!players.has(user)) return;

			console.log(user, "tente d'avancer");

			if (light === Light.Red) {
				console.log("-> LOL NOPE");
				twitchChat.say(`=> ${user} A PERDU LOL`);
				players.delete(user);
				return;
			}

			let count = players.get(user);

			// @ts-ignore
			count++;

			// @ts-ignore
			players.set(user, count);

			console.log("-> DISTANCE", count);

			// @ts-ignore
			if (count >= 20) {
				twitchChat.say(`=> ${user} est arrivé, yesaye`);
				console.log("=> C'EST GAGNE");
				players.delete(user);
				winners.add(user);
			}
		}
	});


});