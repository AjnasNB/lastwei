import fs from 'node:fs';
import solc from 'solc';
import {compile} from './compile.mjs';
compile();
const d=JSON.parse(fs.readFileSync('deployments/base-sepolia.json','utf8'));
const input=JSON.parse(fs.readFileSync('artifacts/standard-input.json','utf8'));
const jobs=[];
for(const [name,key,source] of [['LastWeiFactory','factory','contracts/LastWeiFactory.sol'],['DemoCheckout','checkout','contracts/DemoCheckout.sol'],['LastWeiAccount','demoAccount','contracts/LastWeiAccount.sol']]){
  const r=await fetch(`https://sourcify.dev/server/v2/verify/${d.chainId}/${d[key]}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stdJsonInput:input,compilerVersion:solc.version().replace('.Emscripten.clang',''),contractIdentifier:`${source}:${name}`,creationTransactionHash:d.transactions[key]}),signal:AbortSignal.timeout(30000)});
  const data=await r.json();jobs.push({name,address:d[key],response:data});console.log(JSON.stringify({name,status:r.status,...data}));
}
fs.writeFileSync('artifacts/source-verification-jobs.json',JSON.stringify(jobs,null,2));
