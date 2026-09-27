import { NextRequest } from "next/server";
import { getEventsEndpoint } from "@/lib/graphqlEndpoint";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const upstreamUrl = getEventsEndpoint();
    const headers: Record<string, string> = {
        Accept: "text/event-stream",
    };

    const lastEventId = request.headers.get("Last-Event-ID");
    if (lastEventId) {
        headers["Last-Event-ID"] = lastEventId;
    }

    try {
        const upstreamResponse = await fetch(upstreamUrl, {
            method: "GET",
            headers,
            cache: "no-store",
            signal: request.signal,
        });

        if (!upstreamResponse.ok || !upstreamResponse.body) {
            return new Response(`Upstream SSE error: ${upstreamResponse.statusText}`, {
                status: upstreamResponse.status || 502,
            });
        }

        return new Response(upstreamResponse.body, {
            status: 200,
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (error: any) {
        if (error?.name === "AbortError" || request.signal.aborted) {
            return new Response(null, { status: 499 });
        }
        console.error("SSE Proxy error:", error);
        return new Response("Failed to connect to SSE stream", { status: 502 });
    }
}
