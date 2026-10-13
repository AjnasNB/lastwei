import fs from 'node:fs';
import {createPublicClient,createWalletClient,http,parseEther,formatEther,decodeEventLog,zeroAddress} from 'viem';
import {baseSepolia as sepolia} from 'viem/chains';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {compile} from './compile.mjs';

const rpc=process.env.SEPOLIA_RPC_URL ?? 'https://base-sepolia-rpc.publicnode.com';
const secret=JSON.parse(fs.readFileSync('private/testnet-wallet.json','utf8'));
const signer=privateKeyToAccount(secret.privateKey);
const publicClient=createPublicClient({chain:sepolia,transport:http(rpc),cacheTime:0,pollingInterval:3000});
const wallet=createWalletClient({chain:sepolia,account:signer,transport:http(rpc)});
let nextNonce=await publicClient.getTransactionCount({address:signer.address,blockTag:'pending'});
if(await publicClient.getChainId() !== sepolia.id) throw new Error('Refusing non-Sepolia RPC');
const balance=await publicClient.getBalance({address:signer.address});
console.log(`Deployer balance: ${formatEther(balance)} Sepolia ETH`);
if(balance<parseEther('0.018')) throw new Error('Need at least 0.018 Sepolia test ETH to deploy and seed demo');
const compiled=compile();
fs.mkdirSync('deployments',{recursive:true});
const path='deployments/base-sepolia.json';
const state=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):{chainId:sepolia.id,rpc,explorer:'https://sepolia.basescan.org',deployer:signer.address,transactions:{}};
state.deployer=signer.address;
function save() {fs.writeFileSync(path,JSON.stringify(state,null,2));}
async function deploy(name,key) {
  if(state[key]) return state[key];
  const hash=state.transactions[key]??await wallet.deployContract({abi:compiled[name].abi,bytecode:compiled[name].bytecode,nonce:nextNonce++});
  state.transactions[key]=hash;save();console.log(`${name}: ${hash}`);
  const receipt=await publicClient.waitForTransactionReceipt({hash,timeout:180000});
  if(receipt.status!=='success'||!receipt.contractAddress) throw new Error(`${name} deployment reverted`);
  state[key]=receipt.contractAddress;save();return receipt.contractAddress;
}
const factory=await deploy('LastWeiFactory','factory');
await deploy('DemoCheckout','checkout');
const ownerFile='private/demo-owner.json';
if(!fs.existsSync(ownerFile)) {const privateKey=generatePrivateKey();fs.writeFileSync(ownerFile,JSON.stringify({privateKey,address:privateKeyToAccount(privateKey).address}),{mode:0o600});}
const owner=JSON.parse(fs.readFileSync(ownerFile,'utf8'));state.demoOwner=owner.address;save();
if(!state.demoAccount||state.demoAccount===zeroAddress) {
  const hash=state.transactions.demoAccount??await wallet.writeContract({address:factory,abi:compiled.LastWeiFactory.abi,functionName:'createAccount',args:[owner.address],nonce:nextNonce++});
  state.transactions.demoAccount=hash;save();
  const r=await publicClient.waitForTransactionReceipt({hash,timeout:180000});if(r.status!=='success')throw new Error('Account creation failed');
  const event=r.logs.filter(l=>l.address.toLowerCase()===factory.toLowerCase()).map(l=>decodeEventLog({abi:compiled.LastWeiFactory.abi,data:l.data,topics:l.topics})).find(e=>e.eventName==='AccountCreated');
  if(!event||event.args.account===zeroAddress)throw new Error('Missing canonical AccountCreated event');
  state.demoAccount=event.args.account;save();
}
if(!state.transactions.seed) {
  if(!state.demoAccount||state.demoAccount===zeroAddress)throw new Error('Refusing to seed a zero account');
  state.transactions.seed=await wallet.sendTransaction({to:state.demoAccount,value:parseEther('0.014'),nonce:nextNonce++});save();
}
const receipt=await publicClient.waitForTransactionReceipt({hash:state.transactions.seed,timeout:180000});if(receipt.status!=='success')throw new Error('Seed failed');
state.deployedAt=new Date().toISOString();save();
fs.mkdirSync('public/deployments',{recursive:true});fs.copyFileSync(path,'public/deployments/base-sepolia.json');
console.log(JSON.stringify(state,null,2));
