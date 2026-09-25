import { parse, print, visit } from 'graphql';

/** Retry only pre-execution validation failures from older ProducerDetails schemas. */
export async function fetchWithProducerCompatibility(
    endpoint: string,
    init: RequestInit,
    send: typeof fetch = fetch,
): Promise<Response> {
    const response = await send(endpoint, init);
    if (typeof init.body !== 'string' || !init.body.includes('producerId')) return response;

    const payload = await response.clone().json().catch(() => null);
    if (payload?.data || !payload?.errors?.length || !payload.errors.every((error: { message?: string }) =>
        /Field 'producerId' in type 'ProducerDetails' is undefined/.test(error.message || '')
    )) return response;

    const body = JSON.parse(init.body);
    let changed = false;
    const document = visit(parse(body.query), {
        Field(node, _key, _parent, _path, ancestors) {
            if (node.name.value === 'producerId' && ancestors.some(ancestor =>
                !Array.isArray(ancestor) && 'kind' in ancestor && ancestor.kind === 'Field' && ancestor.name.value === 'producers'
            )) {
                changed = true;
                return null;
            }
        },
    });
    if (!changed) return response;
    // Validation happens before execution, so even mutations are safe to retry here.
    return send(endpoint, { ...init, body: JSON.stringify({ ...body, query: print(document) }) });
}
