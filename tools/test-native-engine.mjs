import {build} from 'esbuild';
import {resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
import assert from 'node:assert/strict';
globalThis.crypto ??= webcrypto;
const bundle=await build({entryPoints:['android/app/src/main/assets/native-engine.mjs'],bundle:true,format:'esm',write:false,plugins:[{name:'shared-core',setup(b){b.onResolve({filter:/^\.\/core\//},a=>({path:resolve('web',a.path.slice(7))}));}}]});
const native=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const data={me:{id:'self',role:'driver'},cars:[{id:'car',plate:'51A',odo:1000}],users:[],carChoices:[{id:'car',plate:'51A',assignedUserId:'self'},{id:'other',plate:'OTHER',assignedUserId:'someone'}],transactions:[
{id:'own',carId:'car',enteredBy:'self',date:'2026-10-01',updatedAt:'2026-10-01',amount:123456789,odo:1000,category:'fuel',liters:10},
{id:'visible',carId:'car',enteredBy:'someone',date:'2026-10-02',updatedAt:'2026-10-02',amount:200000,odo:1100,category:'fuel',liters:5},
{id:'forbidden',carId:'other',enteredBy:'someone',date:'2026-10-01',updatedAt:'2026-10-01',amount:99999,odo:100,category:'fuel',liters:1}
],assignments:[{id:'a',userId:'self',carId:'car',startedAt:'2026-10-01T00:00:00.000Z'},{id:'b',userId:'someone',carId:'other',startedAt:'2026-10-01T00:00:00.000Z'}]};
const exportState={...data,users:[{id:'self',name:'SELF'},{id:'someone',name:'OTHER_PERSON'}]};
const xml=native.exportExcel(exportState,'transactions',{});
assert.ok(xml.includes('123456789'));assert.ok(xml.includes('ODO (km)'));assert.ok(!xml.includes('99999'));
assert.ok(!native.exportExcel(exportState,'management',{}).includes('OTHER_PERSON'));
assert.ok(!native.exportExcel(exportState,'transactions',{from:'2026-10-02'}).includes('123456789'));
assert.throws(()=>native.exportExcel(exportState,'monthly',{from:'2026-10-02',to:'2026-10-01'}),/Ngày bắt đầu/);
const enriched=native.enrich({data});
assert.equal(enriched.monthly.length,1);
assert.equal(enriched.monthly[0].total,123456789);
assert.equal(enriched.periods.length,1);
assert.equal(enriched.periods[0].userId,'self');
assert.deepEqual(await native.dispatch('logout',{}),{loggedOut:true});
await assert.rejects(native.dispatch('read',{}),/Kết nối/);
await assert.rejects(native.dispatch('configure',{primaryEmail:'same@gmail.com',secondaryEmail:'same@gmail.com',primaryToken:'p',secondaryToken:'s'}),/phải khác/);
await native.dispatch('configure',{primaryEmail:'admin@gmail.com',secondaryEmail:'storage@gmail.com',primaryToken:'p',secondaryToken:'s'});
globalThis.fetch=async()=>new Response(JSON.stringify({files:[]}),{headers:{'Content-Type':'application/json'}});
await assert.rejects(native.dispatch('login',{username:'missing',password:'000000'}),/Tên đăng nhập/);
await native.dispatch('logout',{});
console.log('Native engine: shared module bundle, role-scoped reports, large amounts, account pinning and login errors passed.');
// An additional Admin typed on a previously NSD-only device must connect primary,
// rather than failing silently or accepting a partial storage configuration.
const {lock,plain,randomKey}=await import('../web/crypto.mjs');
const adminAccount={model:'organization-v2',orgId:crypto.randomUUID(),userId:crypto.randomUUID(),username:'admin2',email:'admin2@users.invalid',role:'admin',ownerEmail:'admin@gmail.com',secondaryEmail:'storage@gmail.com',rootId:'root',rootKey:randomKey(),mustChange:true};
const encrypted=await lock(adminAccount,'000000','account',100000);
globalThis.fetch=async(url,options={})=>{
 let body;
 if(url.includes('/drive/v2/files/profile'))body={etag:'1',owners:[{emailAddress:'storage@gmail.com'}],labels:{trashed:false}};
 else if(url.includes('/drive/v3/files/profile?alt=media'))body=encrypted;
 else body={files:options.headers.Authorization==='Bearer s'?[{id:'profile',appProperties:{model:'organization-v2',username:'admin2',orgId:adminAccount.orgId}}]:[]};
 return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
};
await native.dispatch('configure',{secondaryEmail:'storage@gmail.com',secondaryToken:'s'});
assert.deepEqual(await native.dispatch('login',{username:'admin2',password:'000000'}),{needsPrimary:true,ownerEmail:'admin@gmail.com'});
await native.dispatch('configure',{primaryEmail:'admin@gmail.com',secondaryEmail:'storage@gmail.com',primaryToken:'p',secondaryToken:'s'});
assert.deepEqual(await native.dispatch('login',{username:'admin2',password:'000000'}),{mustChange:true});
await native.dispatch('logout',{});
console.log('Native additional Admin connection handoff passed.');

// A configured APK must complete an additional Admin login across both Drives,
// including the journal on member storage and organization data on Admin storage.
const fullRootKey=randomKey(),fullMemberKey=randomKey(),fullOrg=crypto.randomUUID(),fullUser=crypto.randomUUID();
const fullAccount={model:'organization-v2',orgId:fullOrg,userId:fullUser,username:'admin2',email:'admin2@users.invalid',role:'admin',ownerEmail:'admin@gmail.com',secondaryEmail:'storage@gmail.com',rootId:'root',rootKey:fullRootKey,journalId:'journal',memberKey:fullMemberKey,mustChange:false,passwordEpoch:'epoch'};
const fullProfile=await lock(fullAccount,'admin-secret','account',10000),fullData={format:'soxe-org-v3',id:fullOrg,name:'Native Admin Org',ownerEmail:'admin@gmail.com',revision:1,updatedAt:new Date().toISOString(),storage:{model:'organization-v2',secondaryEmail:'storage@gmail.com'},users:[{id:fullUser,username:'admin2',name:'Admin 2',email:'admin2@users.invalid',role:'admin',active:true,passwordEpoch:'epoch',journalId:'journal',memberKey:fullMemberKey}],cars:[],assignments:[],assignmentEvents:[],handovers:[],transactions:[],receipts:{},tombstones:[],audit:[],operations:[]};
const nativeFiles={profile:{owner:'storage@gmail.com',box:fullProfile},root:{owner:'admin@gmail.com',box:plain(fullData,'organization:'+fullOrg)},journal:{owner:'storage@gmail.com',box:plain({format:'soxe-journal-v3',orgId:fullOrg,userId:fullUser,email:'admin2@users.invalid',token:undefined,events:[],activated:true,passwordEpoch:'epoch'},'journal:'+fullOrg+':'+fullUser)}};
globalThis.fetch=async(url,options={})=>{
 const token=options.headers?.Authorization,match=url.match(/\/files\/([^?]+)/),id=match?.[1];let body;
 if(url.includes('/drive/v3/files?'))body={files:token==='Bearer s'?[{id:'profile',appProperties:{model:'organization-v2',kind:'account',username:'admin2',orgId:fullOrg,userId:fullUser}}]:[]};
 else if(url.includes('/drive/v2/files/')&&id)body={id,etag:'1',owners:[{emailAddress:nativeFiles[id].owner}],labels:{trashed:false}};
 else if(url.includes('?alt=media')&&id)body=nativeFiles[id].box;
 else throw new Error('Unexpected native Drive request: '+url);
 return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
};
await native.dispatch('configure',{primaryEmail:'admin@gmail.com',secondaryEmail:'storage@gmail.com',primaryToken:'p',secondaryToken:'s'});
const fullLogin=await native.dispatch('login',{username:'admin2',password:'admin-secret',adminMode:true});
assert.equal(fullLogin.data.me.role,'admin');assert.equal(fullLogin.data.organization.name,'Native Admin Org');
await native.dispatch('logout',{});
console.log('Native full additional Admin login passed.');
