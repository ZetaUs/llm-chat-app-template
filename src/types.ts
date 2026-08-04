/**
 * Type definitions for the LLM chat application.
 */

export interface Env {
	/**
	 * Binding for the Workers AI API.
	 */
	AI: Ai;

	/**
	 * Binding for static assets.
	 */
	ASSETS: { fetch: (request: Request) => Promise<Response> };

	/**
	 * App version code (integer as string). Compared with Android versionCode.
	 */
	APP_VERSION_CODE: string;

	/**
	 * App version name for display.
	 */
	APP_VERSION_NAME: string;

	/**
	 * APK download URL.
	 */
	APP_DOWNLOAD_URL: string;

	/**
	 * Update changelog text.
	 */
	APP_CHANGELOG: string;

	/**
	 * Whether the update is mandatory ("true" / "false").
	 */
	APP_FORCE_UPDATE: string;
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}
