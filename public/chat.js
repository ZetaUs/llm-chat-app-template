/**
 * LLM Chat App Frontend
 *
 * Handles the chat UI interactions and communication with the backend API.
 * Supports streaming SSE responses (OpenAI & Workers AI format).
 */
// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const clearButton = document.getElementById("clear-btn");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

// Chat state
let chatHistory = [
	{
		role: "assistant",
		content: "你好！我是 AI 聊天助手，请问有什么可以帮您？",
	},
];
let isProcessing = false;

// Render initial welcome message
addMessageToChat("assistant", chatHistory[0].content);

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
	this.style.height = "auto";
	this.style.height = this.scrollHeight + "px";
});

// Send message on Enter (without Shift)
userInput.addEventListener("keydown", function (e) {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

// Clear button handler
clearButton.addEventListener("click", function () {
	if (isProcessing) return;
	chatMessages.innerHTML = "";
	chatHistory = [
		{
			role: "assistant",
			content: "对话已清空。请问有什么可以帮您？",
		},
	];
	addMessageToChat("assistant", chatHistory[0].content);
});

/**
 * Update status indicator
 */
function setStatus(state, text) {
	statusDot.className = "status-dot" + (state ? " " + state : "");
	if (text) statusText.textContent = text;
}

/**
 * Sends a message to the chat API and processes the response
 */
async function sendMessage() {
	const message = userInput.value.trim();
	if (message === "" || isProcessing) return;
	isProcessing = true;
	userInput.disabled = true;
	sendButton.disabled = true;
	setStatus("thinking", "思考中...");
	addMessageToChat("user", message);
	userInput.value = "";
	userInput.style.height = "auto";
	typingIndicator.classList.add("visible");
	chatHistory.push({ role: "user", content: message });
	try {
		const wrapEl = document.createElement("div");
		wrapEl.className = "msg-wrap assistant";
		const assistantMessageEl = document.createElement("div");
		assistantMessageEl.className = "message assistant-message";
		assistantMessageEl.innerHTML = "<p></p>";
		wrapEl.appendChild(assistantMessageEl);
		chatMessages.appendChild(wrapEl);
		const assistantTextEl = assistantMessageEl.querySelector("p");
		chatMessages.scrollTop = chatMessages.scrollHeight;

		const response = await fetch("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ messages: chatHistory }),
		});
		if (!response.ok) throw new Error("Failed to get response");
		if (!response.body) throw new Error("Response body is null");

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let responseText = "";
		let buffer = "";
		const flushAssistantText = () => {
			assistantTextEl.textContent = responseText;
			chatMessages.scrollTop = chatMessages.scrollHeight;
		};
		let sawDone = false;
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				const parsed = consumeSseEvents(buffer + "\n\n");
				for (const data of parsed.events) {
					if (data === "[DONE]") break;
					try {
						const jsonData = JSON.parse(data);
						let content = "";
						if (typeof jsonData.response === "string" && jsonData.response.length > 0) {
							content = jsonData.response;
						} else if (jsonData.choices?.[0]?.delta?.content) {
							content = jsonData.choices[0].delta.content;
						}
						if (content) {
							responseText += content;
							flushAssistantText();
						}
					} catch (e) {
						console.error("Error parsing SSE data as JSON:", e, data);
					}
				}
				break;
			}
			buffer += decoder.decode(value, { stream: true });
			const parsed = consumeSseEvents(buffer);
			buffer = parsed.buffer;
			for (const data of parsed.events) {
				if (data === "[DONE]") {
					sawDone = true;
					buffer = "";
					break;
				}
				try {
					const jsonData = JSON.parse(data);
					let content = "";
					if (typeof jsonData.response === "string" && jsonData.response.length > 0) {
						content = jsonData.response;
					} else if (jsonData.choices?.[0]?.delta?.content) {
						content = jsonData.choices[0].delta.content;
					}
					if (content) {
						responseText += content;
						flushAssistantText();
					}
				} catch (e) {
					console.error("Error parsing SSE data as JSON:", e, data);
				}
			}
			if (sawDone) break;
		}
		if (responseText.length > 0) {
			chatHistory.push({ role: "assistant", content: responseText });
			setStatus("", "就绪");
		} else {
			assistantTextEl.textContent = "（收到空响应）";
			setStatus("error", "空响应");
		}
	} catch (error) {
		console.error("Error:", error);
		addMessageToChat("assistant", "抱歉，处理您的请求时出现了错误：" + error.message);
		setStatus("error", "错误");
	} finally {
		typingIndicator.classList.remove("visible");
		isProcessing = false;
		userInput.disabled = false;
		sendButton.disabled = false;
		userInput.focus();
	}
}

function addMessageToChat(role, content) {
	const wrapEl = document.createElement("div");
	wrapEl.className = `msg-wrap ${role}`;
	const messageEl = document.createElement("div");
	messageEl.className = `message ${role}-message`;
	messageEl.innerHTML = `<p>${escapeHtml(content)}</p>`;
	wrapEl.appendChild(messageEl);
	chatMessages.appendChild(wrapEl);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

function consumeSseEvents(buffer) {
	let normalized = buffer.replace(/\r/g, "");
	const events = [];
	let eventEndIndex;
	while ((eventEndIndex = normalized.indexOf("\n\n")) !== -1) {
		const rawEvent = normalized.slice(0, eventEndIndex);
		normalized = normalized.slice(eventEndIndex + 2);
		const lines = rawEvent.split("\n");
		const dataLines = [];
		for (const line of lines) {
			if (line.startsWith("data:")) {
				dataLines.push(line.slice("data:".length).trimStart());
			}
		}
		if (dataLines.length === 0) continue;
		events.push(dataLines.join("\n"));
	}
	return { events, buffer: normalized };
}
