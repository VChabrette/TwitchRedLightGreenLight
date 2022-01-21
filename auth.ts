import "dotenv/config";

import { randomBytes } from 'crypto';
import { createServer } from 'http';
import { parse } from 'querystring';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { AccessToken as Oauth2AccessToken, AuthorizationCode, Token } from 'simple-oauth2';
import { AccessToken as TwurpleAccessToken } from '@twurple/auth';

import { env } from "process";
const { TWITCH_CLIENT_ID, TWITCH_SECRET } = env;

const TOKEN_PATH = join(__dirname, '.token');

const BASE_CONF = {
	redirect_uri: 'http://localhost:8080/callback',
	scope: ["chat:read", "chat:edit", "channel:moderate", "whispers:read", "whispers:edit"],
}

export class TwitchAuth {
	public setToken(token: TwurpleAccessToken): void {
		writeFileSync(TOKEN_PATH, JSON.stringify(token));
	}

	public async getToken(): Promise<TwurpleAccessToken> {

		if (existsSync(TOKEN_PATH)) {
			const tokenData: Token | TwurpleAccessToken = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
			if (tokenData) {
				if ((tokenData as Token).access_token) return this.tokenToAccessToken(tokenData);
				else return tokenData as TwurpleAccessToken;
			}
		}

		const state = randomBytes(16).toString('hex');

		const client = new AuthorizationCode({
			client: {
				id: TWITCH_CLIENT_ID as string,
				secret: TWITCH_SECRET as string,
			},
			auth: {
				tokenHost: 'https://id.twitch.tv',
				tokenPath: '/oauth2/token',
				authorizePath: '/oauth2/authorize',
			}
		});
		const authorizationUri = client.authorizeURL({ state, ...BASE_CONF });
		console.log('AUTH URL:', authorizationUri);

		const { token } = await new Promise<Oauth2AccessToken>((resolve) => {
			createServer(async (req, res) => {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end();

				if (!req.url || !req.url.startsWith('/callback?')) return;

				const code = parse(req.url.split('?')[1])?.code as string;
				try {
					const accessToken = await client.getToken({
						code, ...BASE_CONF,
						client_id: TWITCH_CLIENT_ID,
						client_secret: TWITCH_SECRET,
					} as any);

					if (accessToken) resolve(accessToken);
				} catch (error) {
					console.log(error);
				}
			}).listen(8080);
		});

		const accessToken = this.tokenToAccessToken(token);

		this.setToken(accessToken);

		return accessToken;
	}

	private tokenToAccessToken(token: Token): TwurpleAccessToken {
		const { access_token: accessToken, refresh_token: refreshToken, ...content } = token;
		return { accessToken, refreshToken, ...content } as TwurpleAccessToken;
	}
}