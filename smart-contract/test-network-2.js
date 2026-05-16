const network = require('@stacks/network');
console.log('STACKS_MAINNET:', network.STACKS_MAINNET);
console.log('type of STACKS_MAINNET:', typeof network.STACKS_MAINNET);
const net = network.createNetwork({ url: 'https://api.mainnet.hiro.so' });
console.log('net.url:', net.url);
console.log('net.client:', net.client ? 'exists' : 'missing');
