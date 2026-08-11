const geminiAgentService = require('./src/services/geminiAgentService');
const supabaseService = require('./src/services/supabaseService');

async function testAgent() {
  const users = await supabaseService.listUsers();
  if (users.length === 0) {
    console.log('No user found to test');
    return;
  }

  const testUser = users[0];
  console.log(`Testing agent message processing for user: ${testUser.nome}`);

  const reply = await geminiAgentService.processUserMessage("Gastei R$ 45,00 no almoço com Pix", testUser);
  console.log('\n🤖 AGENT RESPONSE:\n', reply);
}

testAgent();
