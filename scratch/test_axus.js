const { axusSdk } = require('./lib/axusClient');

async function testAxus() {
  try {
    console.log('Testing UserDetails for auid 1:');
    const u1 = await axusSdk.UserDetails({ auid: '1' });
    console.log('User 1 details:', JSON.stringify(u1, null, 2));

    const username = u1?.usernames?.defaultUsername;
    if (username) {
      console.log(`Testing OwnerByUsername for "${username}":`);
      const ownerRes = await axusSdk.OwnerByUsername({ username });
      console.log('Owner result:', JSON.stringify(ownerRes, null, 2));
    }
  } catch (e) {
    console.error('Axus test error:', e);
  }
}

testAxus();
