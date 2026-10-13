import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const secrets=[];
for(const p of ['private/testnet-wallet.json','private/demo-owner.json','private/cloudflare-secrets.json']){
  if(!fs.existsSync(p))continue;
  for(const [key,value] of Object.entries(JSON.parse(fs.readFileSync(p,'utf8'))))
    if(/private.?key|IP_HASH_SALT/i.test(key)&&typeof value==='string')secrets.push(value);
}
if(secrets.length<2)throw new Error('Expected local deployment secret fixtures for the export audit');
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8',windowsHide:true}).split('\0').filter(Boolean);
let failures=0;
for(const p of files){
  if(!fs.existsSync(p))continue;
  const content=fs.readFileSync(p).toString('utf8');
  if(secrets.some(s=>s.length>20&&content.includes(s))){console.error(`Deployment secret found in export: ${p}`);failures++;}
}
if(failures)process.exit(1);
console.log(`Export audit passed for ${files.length} tracked files. Local deployment keys and IP salt are absent.`);
