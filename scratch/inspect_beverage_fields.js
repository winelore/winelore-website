const https = require('https');

const query = `
query IntrospectBeverage {
  __type(name: "Beverage") {
    fields {
      name
      type {
        name
        kind
        ofType {
          name
          kind
        }
      }
    }
  }
}
`;

const postData = JSON.stringify({ query });

const req = https.request('https://winelore-dev.thewinelore.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("RESPONSE:", JSON.stringify(JSON.parse(body), null, 2));
  });
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
