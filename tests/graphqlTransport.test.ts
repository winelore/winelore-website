import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from 'graphql';
import { fetchWithProducerCompatibility } from '../lib/graphqlTransport';

const query = `query Beverages { beverages { items { producers { id producerId auid } } } }`;
const validation = { errors: [{ message: "Validation error: Field 'producerId' in type 'ProducerDetails' is undefined" }] };

function mockSend(payloads: unknown[]) {
    const calls: RequestInit[] = [];
    const send = (async (_url: unknown, init: RequestInit) => {
        calls.push(init);
        return Response.json(payloads[calls.length - 1]);
    }) as typeof fetch;
    return { calls, send };
}

test('older schemas retry once without the unsupported producer output field', async () => {
    const { calls, send } = mockSend([validation, { data: { beverages: { items: [] } } }]);
    const init = { method: 'POST', headers: { 'X-ACTOR': '42' }, body: JSON.stringify({ query, variables: { limit: 16 } }) };
    const result = await fetchWithProducerCompatibility('https://example.test/graphql', init, send);
    assert.equal(calls.length, 2);
    const retry = JSON.parse(calls[1].body as string);
    assert.doesNotMatch(retry.query, /producerId/);
    assert.doesNotThrow(() => parse(retry.query));
    assert.deepEqual(retry.variables, { limit: 16 });
    assert.deepEqual(calls[1].headers, init.headers);
    assert.deepEqual(await result.json(), { data: { beverages: { items: [] } } });
});

for (const payload of [
    { data: { producers: [{ producerId: 'uuid' }] } },
    { data: { partial: true }, ...validation },
    { errors: [{ message: 'Permission denied' }] },
    { errors: [...validation.errors, { message: 'Another validation error' }] },
]) {
    test(`does not retry successful, partial, or unrelated responses: ${JSON.stringify(payload)}`, async () => {
        const { calls, send } = mockSend([payload]);
        const result = await fetchWithProducerCompatibility('https://example.test/graphql', { body: JSON.stringify({ query }) }, send);
        assert.equal(calls.length, 1);
        assert.deepEqual(await result.json(), payload);
    });
}

test('mutation retry preserves producerId input and never retries a second failure', async () => {
    const { calls, send } = mockSend([validation, validation]);
    const mutation = 'mutation { createBeverage(input: { producers: [{ producerId: "uuid" }] }) { producers { id producerId } } }';
    await fetchWithProducerCompatibility('https://example.test/graphql', { body: JSON.stringify({ query: mutation }) }, send);
    assert.equal(calls.length, 2);
    assert.match(JSON.parse(calls[1].body as string).query, /producerId: "uuid"/);
});
