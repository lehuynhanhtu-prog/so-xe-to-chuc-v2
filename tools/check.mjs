import {readFileSync} from 'node:fs';
import vm from 'node:vm';
for(const path of ['apps-script/Code.gs','apps-script/Crypto.gs'])new vm.Script(readFileSync(path,'utf8'),{filename:path});
const html=readFileSync('apps-script/Index.html','utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1],{filename:'Index.html'});
console.log('Apps Script and browser JavaScript parse successfully.');
const web=readFileSync('web/index.html','utf8');
const published=readFileSync('docs/index.html','utf8');
if(!published.startsWith('<!doctype html>')||!published.includes('<title>Sổ Xe Tổ Chức v2</title>'))throw new Error('Published Web entry is not valid HTML.');
if(published.includes('<iframe')||!published.includes('location.replace(target)'))throw new Error('Published launcher must use top-level navigation for mobile compatibility.');
if(web.includes('google.script.run'))throw new Error('Web v3 must not call Apps Script.');
if(!web.includes('SO_XE_GOOGLE_CONFIG'))throw new Error('Google config missing.');
const {spawnSync}=await import('node:child_process');
for(const path of ['web/biometric.mjs','web/attachment-names.mjs','web/crypto.mjs','web/dates.mjs','web/calendar.mjs','web/identity.mjs','web/handovers.mjs','web/drive.mjs','web/gmail.mjs','web/google.mjs','web/service.mjs','web/dual-drive.mjs','web/storage-backup.mjs','web/storage-transfer.mjs','web/dual-service.mjs','web/reports.mjs','web/reminders.mjs','web/ledger-view.mjs','docs/android-oauth.mjs']){const r=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const {writeFileSync,unlinkSync}=await import('node:fs');const temporary='web/.check-ui.mjs';writeFileSync(temporary,web.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);try{const r=spawnSync(process.execPath,['--check',temporary],{stdio:'inherit'});if(r.status)process.exit(r.status);}finally{unlinkSync(temporary);}
console.log('Direct Drive v3 modules and UI parse successfully.');
