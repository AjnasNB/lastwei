import {createPublicClient,createWalletClient,http,encodeFunctionData,keccak256,parseEther,type Hex,type Address,type TransactionReceipt} from 'viem';
import {baseSepolia} from 'viem/chains';
import {privateKeyToAccount} from 'viem/accounts';
import deployment from '../deployments/base-sepolia.json';
import {LastWeiAccountAbi,DemoCheckoutAbi} from '../src/generated/abi';
import {typedIntent,intentId,type Intent} from '../src/protocol';
import {allowedOrigin,validStart,validRunId,publicRun,limitedBody} from './policy';

type Run={id:string;client_hash:string;kind:'complete'|'refund';status:string;created_at:number;updated_at:number;lease_until:number;deadline:number|null;intent_id:Hex|null;fund_tx:Hex|null;execute_tx:Hex|null;reclaim_tx:Hex|null;refund_tx:Hex|null;pending_raw:Hex|null;error:string|null};
const terminal=['executed','refunded','failed'];
const allowedMirror='https://wonderful-meadow-00299ce00.4.azurestaticapps.net';
function response(data:unknown,status=200,origin?:string|null){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin===allowedMirror?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});}
function ready(env:Env){return !!(deployment.demoAccount&&deployment.checkout&&deployment.factory&&deployment.demoOwner&&env.SPONSOR_PRIVATE_KEY&&env.DEMO_OWNER_PRIVATE_KEY);}
function clients(env:Env){const transport=http(env.RPC_URL,{timeout:8000,retryCount:0});return {client:createPublicClient({chain:baseSepolia,transport,cacheTime:0}),wallet:createWalletClient({chain:baseSepolia,account:privateKeyToAccount(env.SPONSOR_PRIVATE_KEY as Hex),transport})};}
async function runRow(env:Env,id:string){return env.DB.prepare('SELECT * FROM demo_runs WHERE id=?').bind(id).first<Run>();}
async function patch(env:Env,id:string,values:Partial<Run>){const keys=Object.keys(values) as (keyof Run)[];if(!keys.length)return;await env.DB.prepare(`UPDATE demo_runs SET ${keys.map(k=>`${k}=?`).join(',')},updated_at=? WHERE id=?`).bind(...keys.map(k=>values[k]??null),Math.floor(Date.now()/1000),id).run();}
async function advance(env:Env,id:string):Promise<Run|null>{
  const now=Math.floor(Date.now()/1000);
  const acquired=await env.DB.prepare('UPDATE demo_runs SET lease_until=? WHERE id=? AND lease_until<? AND status NOT IN (\'executed\',\'refunded\',\'failed\') RETURNING *').bind(now+90,id,now).first<Run>();
  if(!acquired)return runRow(env,id);
  const lock:Run=acquired;
  try{
    const {client,wallet}=clients(env);
    if(await client.getChainId()!==baseSepolia.id)throw new Error('RPC chain mismatch');
    const account=deployment.demoAccount as Address,checkout=deployment.checkout as Address,owner=deployment.demoOwner as Address;
    const ownerSigner=privateKeyToAccount(env.DEMO_OWNER_PRIVATE_KEY as Hex);
    if(ownerSigner.address.toLowerCase()!==owner.toLowerCase())throw new Error('Demo owner configuration mismatch');
    const data=encodeFunctionData({abi:DemoCheckoutAbi,functionName:'purchase',args:[owner]});
    async function submit(nextStatus:string,field:'fund_tx'|'execute_tx'|'reclaim_tx'|'refund_tx',call:Hex,value=0n){
      const nonce=await client.getTransactionCount({address:wallet.account.address,blockTag:'pending'});
      const prepared=await wallet.prepareTransactionRequest({to:account,data:call,value,nonce});
      const raw=await wallet.signTransaction(prepared);const hash=keccak256(raw);
      // Persist the exact signed transaction before broadcasting. Retrying rebroadcasts
      // identical bytes; it never generates another payment after an uncertain result.
      await patch(env,id,{status:nextStatus,[field]:hash,pending_raw:raw,error:null});
      try{await client.sendRawTransaction({serializedTransaction:raw});}catch{ /* Receipt polling/rebroadcast recovers unknown submission outcomes. */ }
    }
    async function receipt(hash:Hex):Promise<TransactionReceipt|null>{
      try{return await client.getTransactionReceipt({hash});}
      catch(e){if(e instanceof Error&&e.name==='TransactionReceiptNotFoundError'){if(lock.pending_raw){try{await client.sendRawTransaction({serializedTransaction:lock.pending_raw});}catch{ /* The next advance checks the canonical receipt again. */ }}return null;}throw e;}
    }
    if(lock.status==='queued'){
      const block=await client.getBlock();const deadline=Number(block.timestamp)+(lock.kind==='refund'?45:600);
      const intent:Intent={target:checkout,value:parseEther('0.001'),contribution:parseEther('0.0007'),dataHash:keccak256(data),nonce:BigInt(`0x${id.replaceAll('-','')}`),deadline:BigInt(deadline)};
      const signature=await ownerSigner.signTypedData(typedIntent(account,baseSepolia.id,intent));
      await patch(env,id,{deadline,intent_id:intentId(account,baseSepolia.id,intent)});
      await submit('fund_pending','fund_tx',encodeFunctionData({abi:LastWeiAccountAbi,functionName:'fund',args:[intent,signature]}),parseEther('0.0003'));
    }else if(lock.status==='fund_pending'&&lock.fund_tx){
      const r=await receipt(lock.fund_tx);if(r){if(r.status!=='success')throw new Error('Sponsor funding reverted');await patch(env,id,{status:lock.kind==='refund'?'awaiting_expiry':'funded',pending_raw:null});}
    }else if(lock.status==='funded'&&lock.intent_id){
      const block=await client.getBlock();if(block.timestamp>=BigInt(lock.deadline??0))await patch(env,id,{status:'awaiting_expiry'});
      else await submit('execute_pending','execute_tx',encodeFunctionData({abi:LastWeiAccountAbi,functionName:'execute',args:[lock.intent_id,data]}));
    }else if(lock.status==='execute_pending'&&lock.execute_tx){
      const r=await receipt(lock.execute_tx);if(r){if(r.status==='success')await patch(env,id,{status:'executed',pending_raw:null});else await patch(env,id,{status:'awaiting_expiry',pending_raw:null,error:'Execution reverted; escrow will be refunded after expiry.'});}
    }else if(lock.status==='awaiting_expiry'&&lock.intent_id){
      const b=await client.getBlock();if(b.timestamp>=BigInt(lock.deadline??0))await submit('reclaim_pending','reclaim_tx',encodeFunctionData({abi:LastWeiAccountAbi,functionName:'reclaim',args:[lock.intent_id]}));
    }else if(lock.status==='reclaim_pending'&&lock.reclaim_tx){
      const r=await receipt(lock.reclaim_tx);if(r){if(r.status!=='success')throw new Error('Reclaim reverted');await submit('refund_pending','refund_tx',encodeFunctionData({abi:LastWeiAccountAbi,functionName:'withdrawRefund',args:[wallet.account.address]}));}
    }else if(lock.status==='refund_pending'&&lock.refund_tx){
      const r=await receipt(lock.refund_tx);if(r){if(r.status!=='success')throw new Error('Refund withdrawal reverted');await patch(env,id,{status:'refunded',pending_raw:null,error:null});}
    }
  }catch(e){
    const text=e instanceof Error?e.message:'';
    const definitive=['RPC chain mismatch','Demo owner configuration mismatch','Sponsor funding reverted','Reclaim reverted','Refund withdrawal reverted'].includes(text);
    if(definitive)await patch(env,id,{status:'failed',error:text,pending_raw:null});
    else await patch(env,id,{error:'Network request interrupted. The same transaction will be checked again.'});
    console.warn(JSON.stringify({event:'demo_advance_retry',id,definitive}));
  }finally{await env.DB.prepare('UPDATE demo_runs SET lease_until=0 WHERE id=?').bind(id).run();}
  return runRow(env,id);
}

export default {
  async fetch(request:Request,env:Env):Promise<Response>{
    const url=new URL(request.url),origin=request.headers.get('Origin');
    if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    if(request.method==='OPTIONS'){if(!allowedOrigin(origin,request.url))return response({error:'Origin not allowed'},403);return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin!,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}});}
    if(request.method==='POST'&&!allowedOrigin(origin,request.url))return response({error:'Origin not allowed'},403);
    try{
      if(url.pathname==='/api/health'&&request.method==='GET')return response({ok:true,chain:'Base Sepolia',chainId:baseSepolia.id,ready:ready(env)},200,origin);
      if(url.pathname==='/api/config'&&request.method==='GET'){
        const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM demo_runs').first<{n:number}>();
        return response({...deployment,ready:ready(env),remaining:Math.max(0,Number(env.DEMO_LIMIT)-(count?.n??0))},200,origin);
      }
      if(url.pathname==='/api/demo'&&request.method==='POST'){
        if(!ready(env))return response({error:'Testnet demo is being configured. Please use the simulation.'},503,origin);
        if(!request.headers.get('Content-Type')?.startsWith('application/json'))return response({error:'JSON required'},415,origin);
        if(Number(request.headers.get('Content-Length')??0)>1024)return response({error:'Request too large'},413,origin);
        let bodyText:string;try{bodyText=await limitedBody(request);}catch{return response({error:'Request too large'},413,origin);}
        let body:unknown;try{body=JSON.parse(bodyText);}catch{return response({error:'Invalid JSON'},400,origin);}
        if(!validStart(body))return response({error:'Expected a UUID v4 id and complete or refund outcome'},400,origin);
        const now=Math.floor(Date.now()/1000);
        const ip=request.headers.get('CF-Connecting-IP')??'local';
        const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${env.IP_HASH_SALT}:${ip}`));
        const clientHash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
        const existing=await runRow(env,body.id);
        if(existing){if(existing.client_hash!==clientHash)return response({error:'Run ID already exists'},409,origin);return response(publicRun(existing),200,origin);}
        // One atomic SQL statement enforces the global budget, daily per-IP cap,
        // and a single active signing job across all Worker isolates.
        const result=await env.DB.prepare(`INSERT INTO demo_runs(id,client_hash,kind,status,created_at,updated_at)
          SELECT ?,?,?,'queued',?,? WHERE
          (SELECT COUNT(*) FROM demo_runs) < ? AND
          (SELECT COUNT(*) FROM demo_runs WHERE client_hash=? AND created_at>?) < 4 AND
          NOT EXISTS (SELECT 1 FROM demo_runs WHERE status NOT IN ('executed','refunded','failed'))`).bind(body.id,clientHash,body.kind,now,now,Number(env.DEMO_LIMIT),clientHash,now-86400).run();
        if(result.meta.changes===0)return response({error:'Demo busy or testnet run limit reached. Wait a minute, or use your own wallet.'},429,origin);
        const row=await runRow(env,body.id);return response(publicRun(row!),201,origin);
      }
      const route=url.pathname.match(/^\/api\/demo\/([^/]+)(\/advance)?$/);
      if(route&&validRunId(route[1])){
        if(route[2]&&request.method==='POST'){if(!ready(env))return response({error:'Demo not configured'},503,origin);const row=await advance(env,route[1]);return row?response(publicRun(row),200,origin):response({error:'Run not found'},404,origin);}
        if(!route[2]&&request.method==='GET'){const row=await runRow(env,route[1]);return row?response(publicRun(row),200,origin):response({error:'Run not found'},404,origin);}
      }
      return response({error:'Route not found'},404,origin);
    }catch{console.error(JSON.stringify({event:'api_failure',route:url.pathname}));return response({error:'Service temporarily unavailable. Please retry.'},503,origin);}
  },
  async scheduled(_controller:ScheduledController,env:Env):Promise<void>{
    if(!ready(env))return;
    const row=await env.DB.prepare("SELECT id FROM demo_runs WHERE status NOT IN ('executed','refunded','failed') ORDER BY created_at LIMIT 1").first<{id:string}>();
    if(row)await advance(env,row.id);
  },
} satisfies ExportedHandler<Env>;
