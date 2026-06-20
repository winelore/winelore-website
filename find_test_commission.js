async function main() {
  try {
    const response = await fetch('http://127.0.0.1:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetAllCommissions {
            commissions(first: 50) {
              items {
                id
                name
                status
                members {
                  auid
                  role
                }
              }
            }
          }
        `
      })
    });
    const { data } = await response.json();
    const items = data.commissions.items || [];
    const testableCommissions = items.filter(c => 
      (c.status === 'PLANNED' || c.status === 'DRAFT') && 
      c.members.some(m => m.auid.includes(1) && m.role === 'HEAD')
    );
    if (testableCommissions.length > 0) {
      console.log('✅ Found testable commissions:');
      testableCommissions.slice(0, 3).forEach(c => {
        console.log(`- ${c.name} (http://localhost:3000/commission/${c.id}) [Status: ${c.status}]`);
      });
    } else {
      console.log('❌ No testable commissions found for AUID 1 as HEAD in DRAFT or PLANNED status.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
main();
