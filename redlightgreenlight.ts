import { PrivateMessage } from '@twurple/chat';
import { TwitchChat } from './chat';
import { ChatInstance, ChatListener, ChatMessage, ChatMsg, ChatUser, OnChatMessage } from './chat.decorators';

import dictonnary from './dictonnary';
import { shuffleArray } from './utils';
const DICTIONNARY = dictonnary.map(w => w.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace('œ', 'oe'));

enum Light { GREEN, RED };

@ChatListener
export class RedLightGreenLight {
	private config = {
		greenLight: {
			duration: 15_000,
			delta: 10_000,
		},
		redLight: {
			duration: 7_500,
			delta: 5_000,
			gracePeriod: 1000,
		},
		score: 30,
		wordsLength: 5,
		timeoutDuration: 10,
	};

	private lock = false;
	private started = false;
	private gameStarted = false;

	private light: Light | undefined;

	private players = new Map<string, number>();
	private winners = new Set();

	private greenLightEnd: number | null = null;
	private redLightEnd: number | null = null;

	@ChatInstance
	private twitchChat: TwitchChat | undefined;

	private steps: number[] = [];

	private words = shuffleArray(DICTIONNARY.filter(w => w.length <= this.config.wordsLength));
	private word: string = "";
	private nextWord: string = "";

	// =======================================================

	constructor() { setInterval(() => this.run(), 200) };

	private initGreenLight() {
		const { duration, delta } = this.config.greenLight;
		this.greenLightEnd = Date.now() + duration - (delta / 2) + Math.floor(Math.random() * delta);

		// COMPUTE STEPS
		this.steps = [];
		let remainingDuration = this.greenLightEnd - Date.now();
		let start = Date.now();

		console.log("GREENLIGHT DURATION:", remainingDuration / 1000);

		while (this.steps.length < 3) {
			const time = Math.floor((Math.random() * (remainingDuration - 1000)) / 500) * 500 + 500;

			remainingDuration -= time;
			start += time;

			this.steps.push(start);
		}

		console.log([
			0,
			...this.steps.map(s => (s - Date.now()) / 1000),
			(this.greenLightEnd - Date.now()) / 1000,
		])

		this.light = Light.GREEN;

		this.word = this.nextWord;
	}

	public async run() {
		if (!this.gameStarted || !this.twitchChat) return;

		// === GAME TIMER ===
		if (!this.greenLightEnd && !this.redLightEnd) {
			this.twitchChat.say('C\'EST TI-PAR MA GUEULE');

			this.nextWord = this.words.shift();
			this.twitchChat.say('GivePLZ PREMIER MOT ➡️ ' + this.nextWord.toUpperCase() + ' TakeNRG')

			this.twitchChat.say('VoteYea VoteYea VoteYea VoteYea VoteYea VoteYea VoteYea');

			this.initGreenLight();
			return;
		}

		// --- LAUNCH RED ----
		if (this.greenLightEnd && Date.now() >= this.greenLightEnd) {
			console.log('STOP');
			this.twitchChat.say('VoteNay VoteNay VoteNay VoteNay VoteNay VoteNay VoteNay');

			this.nextWord = this.words.shift();
			this.twitchChat.say('GivePLZ PROCHAIN MOT ➡️ ' + this.nextWord.toUpperCase() + ' TakeNRG')

			this.greenLightEnd = null;

			const { duration, delta, gracePeriod } = this.config.redLight;
			this.redLightEnd = Date.now() + duration - (delta / 2) + Math.floor(Math.random() * delta);

			setTimeout(() => {
				this.light = Light.RED;
				console.log('FIN DE LA PERIODE DE GRACE')
			}, gracePeriod);
		}

		// --- LAUNCH GREEN ----
		if (this.redLightEnd && Date.now() >= this.redLightEnd) {
			this.redLightEnd = null;

			this.initGreenLight();

			const { duration, delta } = this.config.greenLight;
			this.greenLightEnd = Date.now() + duration - (delta / 2) + Math.floor(Math.random() * delta);

			this.twitchChat.say('VoteYea VoteYea VoteYea VoteYea VoteYea VoteYea VoteYea');
		}

		// --- TIME DISPLAY ---
		if (this.greenLightEnd && this.steps.length) {
			const [nextStep] = this.steps;
			if (nextStep && Date.now() >= nextStep) {
				const bar = new Array(4).fill(['🔴', '🟠', '🟢'][this.steps.length - 1]).join(' ');
				this.twitchChat.say(`${bar} ➡️ ${this.steps.length} ⬅️ ${bar}`);
				this.steps.shift();
			}
		}

		// === GAME END ===
		if (this.players.size) return;

		this.gameStarted = false;
		this.started = false;

		this.twitchChat.say('LA PARTIE EST FINIE WESH');

		if (this.winners.size) this.twitchChat.say('VAINQUEURS: ' + [...this.winners.values()].join(', '));
		else this.twitchChat.say('TOUT LE MONDE A PERDU BANDE DE NAZES');
	}

	// =======================================================

	@OnChatMessage('!rlgl')
	private play(@ChatUser user: string) {
		if (!this.twitchChat) return;
		/* ------- Safe Chat ------- */

		if (user !== this.twitchChat.channelOwner || this.started) return;

		this.twitchChat.say('La partie de "1, 2, 3, Soleil" va bientôt démarrer. Tapez !join pour participer !');
		this.twitchChat.say('=> RÈGLES: Après le départ, écrivez le mot qui vous sera donné (la casse étant sans importance) suivi de ce que vous voulez dans le chat pour avancer. Vous devez avancer de ' + this.config.score + ' cases pour gagner');
		this.lock = true;
		this.gameStarted = false;
		this.started = true;
	}

	@OnChatMessage('!join')
	private join(@ChatUser user: string, @ChatMsg msg: PrivateMessage) {
		if (!this.twitchChat) return;
		/* ------- Safe Chat ------- */

		if (!this.started || this.gameStarted) return;

		if (this.players.has(user)) return this.twitchChat.say("T'es déjà inscrit patate", { replyTo: msg });

		this.players.set(user, 0);
		this.twitchChat.say(`-> ${user} rejoint la partie ! (${this.players.size} joueur·euse·s inscrits)`);
	}

	@OnChatMessage('!players')
	private printPlayers() {
		if (!this.twitchChat) return;
		/* ------- Safe Chat ------- */

		if (!this.started) return;

		if (this.players.size > 0) this.twitchChat.say('Joueurs en jeu: ' + [...this.players.keys()].join(', '));
		else this.twitchChat.say('Aucun joueur en jeu. Tapez !join pour participer !')
	}

	@OnChatMessage('!start')
	private start(@ChatUser user: string) {
		if (!this.twitchChat) return;
		/* ------- Safe Chat ------- */

		if (!this.started || this.gameStarted || user !== this.twitchChat.channelOwner) return;

		if (this.players.size <= 0) return this.twitchChat.say('Aucun joueur en jeu. Tapez !join pour participer !');

		this.winners.clear();

		this.twitchChat.say(`Et c'est parti avec ${this.players.size} joueur·euse·s DANS 5 SECONDES`);
		for (let i = 0; i < 5; i++) setTimeout(() => (this.twitchChat as TwitchChat).say(`=== ${5 - i} ===`), i * 1_000);

		setTimeout(() => this.gameStarted = true, 5_000);
	}

	@OnChatMessage('!stop')
	private stop(@ChatUser user: string) {
		if (!this.twitchChat) return;
		/* ------- Safe Chat ------- */

		if (!this.gameStarted || user !== this.twitchChat.channelOwner) return;

		this.players.clear();
	}

	@OnChatMessage(/.*/)
	private walk(@ChatUser user: string, @ChatMessage message: string, @ChatMsg msg: PrivateMessage): void {
		if (!this.twitchChat) return;
		/* ------- Safe Chat ------- */

		if (!this.gameStarted || !this.players.has(user)) return;

		// MUST MATCH CURRENT WORD
		if (!new RegExp(`^${this.word}.*`, 'i').test(message)) return;

		console.log(user, "tente d'avancer");

		if (this.light === Light.RED) {
			console.log("-> LOL NOPE");
			this.twitchChat.say(`BOP ${user} A PERDU LOL BOP`);
			this.twitchChat.chatClient?.timeout(`#${this.twitchChat.channelOwner}`, user, this.config.timeoutDuration, "T'AS PERDU PATATE");
			this.players.delete(user);
			return;
		}

		let count = this.players.get(user) as number + 1;

		this.players.set(user, count);
		console.log("-> DISTANCE", count);

		if (count < this.config.score) return;

		this.winners.add(user);

		const rank = [...this.winners].indexOf(user) + 1;
		this.twitchChat.say(`FootGoal ${user} est arrivé #${rank} !!! FootGoal`);
		console.log("=> C'EST GAGNE");
		this.players.delete(user);
	}
}