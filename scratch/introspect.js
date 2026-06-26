const http = require('http');

const query = `
  query IntrospectionQuery {
    __schema {
      types {
        name
        kind
        fields {
          name
          args {
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
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
        inputFields {
          name
          type {
            name
            kind
            ofType {
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
    }
  }
`;

const data = JSON.stringify({ query });

const options = {
  hostname: 'switchback.proxy.rlwy.net',
  port: 43233,
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error("Failed to parse response:", e);
      console.log(body);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
