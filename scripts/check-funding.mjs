import fs from 'node:fs';
import {createPublicClient,http,formatEther} from 'viem';
import {sepolia} from 'viem/chains';
const {address}=JSON.parse(fs.readFileSync('private/testnet-wallet.json','utf8'));
for(const url of ['https://ethereum-sepolia-rpc.publicnode.com','https://rpc.sepolia.org']) {
  try {const c=createPublicClient({chain:sepolia,transport:http(url,{timeout:10000,retryCount:0})}); console.log(JSON.stringify({chainId:await c.getChainId(),address,balance:formatEther(await c.getBalance({address})),rpc:url}));break;}
  catch(e) {console.log(`RPC unavailable: ${url}`);}
}
