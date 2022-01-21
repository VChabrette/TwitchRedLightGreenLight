import { TwitchChat } from './chat';

const CLASS_INSTANCES = Symbol('class_instances');
const CHAT_INSTANCE = Symbol('chat_instance');

const LISTENERS = Symbol('listeners');
type ChatListenerMethod = {
	message: string | RegExp,
	key: string | symbol,
	method: Function,
}

const CHAT_PARAMS = Symbol('user_params');
type ChatExistingParams = 'user' | 'message' | 'msg';
type ChatParams = Map<string, Map<ChatExistingParams, number>>;

export function ChatListener<T extends { new(...args: any[]): {} }>(constructor: T) {
	const twitchChat = new TwitchChat();

	constructor.prototype[CHAT_INSTANCE] = twitchChat;
	constructor.prototype[CLASS_INSTANCES] = [];

	twitchChat.connect().then(() => {
		twitchChat.onMessage(function (user, message, msg) {
			for (const listener of (constructor.prototype[LISTENERS] as Set<ChatListenerMethod>)) {
				if (listener.message instanceof RegExp && !listener.message.test(message)) continue;
				if (typeof listener.message === "string" && listener.message !== message) continue;

				const paramsToSend: any[] = [];
				const chatParams: ChatParams = constructor.prototype[CHAT_PARAMS];
				if (chatParams && chatParams.has(listener.key as string)) {
					const params = chatParams.get(listener.key as string);
					if (!params) break;

					if (params.has('user')) paramsToSend[params.get('user') as number] = user;
					if (params.has('message')) paramsToSend[params.get('message') as number] = message;
					if (params.has('msg')) paramsToSend[params.get('msg') as number] = msg;
				}

				for (const instance of constructor.prototype[CLASS_INSTANCES]) {
					instance[listener.key](...paramsToSend);
				}
			}
		})
	});

	const f = function (...args: any[]) {
		const instance = new constructor(...args);
		constructor.prototype[CLASS_INSTANCES].push(instance);
		return instance;
	} as unknown as T;

	f.prototype = constructor.prototype;

	return f;
}

export const OnChatMessage = (message: string | RegExp): MethodDecorator => {
	return (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
		if (!target[LISTENERS]) target[LISTENERS] = new Set<ChatListenerMethod>();
		(target[LISTENERS] as Set<ChatListenerMethod>).add({
			message,
			key,
			method: descriptor.value,
		})
	}
}

export function ChatUser(target: Function, method: string, index: number) { defineChatParam('user', target, method, index) }
export function ChatMessage(target: Function, method: string, index: number) { defineChatParam('message', target, method, index) }
export function ChatMsg(target: Function, method: string, index: number) { defineChatParam('msg', target, method, index) }

function defineChatParam(param: ChatExistingParams, target: any, method: string, index: number) {
	if (!target[CHAT_PARAMS]) target[CHAT_PARAMS] = new Map<string, any>();
	const currParams: Map<ChatExistingParams, number> = (target[CHAT_PARAMS] as ChatParams).get(method) || new Map<ChatExistingParams, number>();
	currParams.set(param, index);
	(target[CHAT_PARAMS] as ChatParams).set(method, currParams);
}

export const ChatInstance = (target: any, key: string) => {
	Object.defineProperty(target, key, { get: () => target[CHAT_INSTANCE] });
} 