export interface SSEEvent {
    id?: string;
    event?: string;
    data: string;
}

export interface SSEParserState {
    buffer: string;
    currentEvent?: string;
    currentData: string[];
    currentId?: string;
}

export function createSSEParserState(): SSEParserState {
    return {
        buffer: "",
        currentEvent: undefined,
        currentData: [],
        currentId: undefined,
    };
}

/**
 * Incrementally parses incoming SSE stream chunks according to the W3C Server-Sent Events specification.
 * Handles multiline data, event names, ids, keepalive comments, and chunk fragmentation.
 */
export function parseSSEChunk(
    chunk: string,
    state: SSEParserState,
    onEvent: (event: SSEEvent) => void
): void {
    state.buffer += chunk;
    const lines = state.buffer.split(/\r\n|\r|\n/);
    state.buffer = lines.pop() ?? "";

    for (const line of lines) {
        if (line === "") {
            if (state.currentData.length > 0) {
                onEvent({
                    event: state.currentEvent,
                    data: state.currentData.join("\n"),
                    id: state.currentId,
                });
            }
            state.currentEvent = undefined;
            state.currentData = [];
        } else if (line.startsWith(":")) {
            // Keepalive comment / ping
            continue;
        } else {
            const colonIndex = line.indexOf(":");
            let field: string;
            let value: string;
            if (colonIndex === -1) {
                field = line;
                value = "";
            } else {
                field = line.slice(0, colonIndex);
                value = line.slice(colonIndex + 1);
                if (value.startsWith(" ")) {
                    value = value.slice(1);
                }
            }

            if (field === "event") {
                state.currentEvent = value;
            } else if (field === "data") {
                state.currentData.push(value);
            } else if (field === "id") {
                state.currentId = value;
            }
        }
    }
}
