import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,12),versions={};
await mkdir('docs',{recursive:true});
function versionImports(source){return source.replace(/(['"])\.\/([^'"]+\.mjs)\1/g,(match,quote,name)=>{if(!versions[name])throw new Error('Dependency not built: '+name);return quote+'./'+name+'?v='+versions[name]+quote;});}
for(const name of ['biometric.mjs','attachment-names.mjs','money-input.mjs','crypto.mjs','dates.mjs','calendar.mjs','identity.mjs','handovers.mjs','drive.mjs','service.mjs','dual-drive.mjs','storage-backup.mjs','storage-transfer.mjs','dual-service.mjs','reports.mjs','reminders.mjs','ledger-view.mjs','gmail.mjs','google.mjs']){const source=versionImports(await readFile('web/'+name,'utf8'));versions[name]=hash(source);await writeFile('docs/'+name,source);}
for(const name of ['jszip.min.js','jszip-LICENSE.markdown']){await writeFile('docs/'+name,await readFile('web/'+name));}
const config=await readFile('web/google-config.js','utf8');versions['google-config.js']=hash(config);await writeFile('docs/google-config.js',config);
const sheetsConfig=await readFile('web/sheets-config.js','utf8');versions['sheets-config.js']=hash(sheetsConfig);await writeFile('docs/sheets-config.js',sheetsConfig);
const buildId=hash(JSON.stringify(versions));let html=(await readFile('web/sheets-launcher.html','utf8')).replace('src="sheets-config.js"','src="sheets-config.js?v='+versions['sheets-config.js']+'"').replace('<body>','<body data-build="'+buildId+'">');await writeFile('docs/index.html',html);
await writeFile('docs/legacy-drive-v3.html',versionImports(await readFile('web/legacy-drive-v3.html','utf8')).replace('src="google-config.js"','src="google-config.js?v='+versions['google-config.js']+'"').replace('Phiên bản 3.0 ·','Phiên bản 3.1 (bản cũ) ·'));
await writeFile('docs/sw.js',`self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))),self.registration.unregister()])));`);
