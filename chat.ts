import { RefreshingAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { ChatClient, ChatSayMessageAttributes, PrivateMessage } from '@twurple/chat';
import { TwitchAuth } from './auth';

import { env } from "process";
const { TWITCH_CLIENT_ID, TWITCH_SECRET } = env;

export class TwitchChat {
	private twitchAuth = new TwitchAuth();

	public chatClient: ChatClient | undefined;
	public apiClient: ApiClient | undefined;

	public channelOwner: string | undefined;

	public async connect() {
		const token = await this.twitchAuth.getToken();

		const authProvider = new RefreshingAuthProvider(
			{
				clientId: TWITCH_CLIENT_ID as string,
				clientSecret: TWITCH_SECRET as string,
				onRefresh: newToken => this.twitchAuth.setToken(newToken),
			},
			token);
		this.apiClient = new ApiClient({ authProvider });

		const me = await this.apiClient.users.getMe();
		this.channelOwner = me.name;

		this.chatClient = new ChatClient({ authProvider, channels: [this.channelOwner] });
		await this.chatClient.connect();
	}

	public say(message: string, attributes?: ChatSayMessageAttributes) {
		if (!this.chatClient) return;

		this.chatClient.say(`#${this.channelOwner}`, message, attributes);
	}

	public onMessage(callback: (user: string, message: string, msg: PrivateMessage) => void) {
		if (!this.chatClient) return;

		return this.chatClient.onMessage((_channel: string, user: string, message: string, msg: PrivateMessage) => {
			callback(user, message, msg);
		})
	}
}