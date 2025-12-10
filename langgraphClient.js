// langgraphClient.js
const { client } = require('@langchain/langgraph-sdk');

const graph = client.getGraph({
    name: 'my-whatsapp-agent',
    version: '1.0.0',
});

module.exports = { graph };
