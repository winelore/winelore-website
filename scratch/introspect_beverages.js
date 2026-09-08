const http = require('http');

async function test() {
    const query = `
        query TestSearchCount($q: String!) {
            searchCount(query: $q)
        }
    `;

    const reqData = JSON.stringify({
        query,
        variables: { q: "Wine" }
    });
    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/graphql',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(reqData)
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('searchCount res:', JSON.parse(body));
        });
    });

    req.write(reqData);
    req.end();
}

test();
