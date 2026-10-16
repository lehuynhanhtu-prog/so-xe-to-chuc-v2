import {unlock,open,seal,plain,unb64} from './crypto.mjs?v=c7db6486b392';
import {projection} from './service.mjs?v=551b02e6e0ac';
import {MODEL} from './dual-drive.mjs?v=ef760dc7519d';
const fail=message=>{throw new Error(message);};
const MAX=400*1024*1024;
async function decode(args){
 if(typeof args.backup!=='string'||args.backup.length>MAX)fail('Chọn bản sao lưu đầy đủ tối đa 400 MB.');
 let box;try{box=JSON.parse(args.backup);}catch{fail('Không đọc được bản sao lưu JSON.');}
 const backup=await unlock(box,args.password,'backup'),db=backup.db,a=backup.account;
 if(backup.format!=='soxe-organization-backup'||backup.version!==1||db?.format!=='soxe-org-v3'||db.deletedAt||db.storage?.model!==MODEL||a?.model!==MODEL||a.orgId!==db.id||a.ownerEmail!==db.ownerEmail||a.secondaryEmail!==db.storage.secondaryEmail||!Array.isArray(backup.files)||!['cars','transactions','users','assignments'].every(k=>Array.isArray(db[k])))fail('Cần bản sao lưu đầy đủ từ hai tài khoản Google cũ.');
 if(!db.users.some(u=>u.id===a.userId&&u.role==='admin'&&!u.deletedAt))fail('Bản sao lưu không thuộc Admin hợp lệ.');
 const files=new Map();for(const f of backup.files){if(!f||typeof f.id!=='string'||files.has(f.id)||!['admin','member'].includes(f.source))fail('Danh sách tệp sao lưu không hợp lệ.');files.set(f.id,f);}
 const root=files.get(a.rootId);if(!root||root.source!=='admin'||JSON.stringify(await open(root.box,a.rootKey,'organization:'+db.id))!==JSON.stringify(db))fail('Bản sao lưu thiếu hoặc sai file dữ liệu tổ chức.');
 const primary=db.users.find(u=>u.role==='admin'&&u.email===db.ownerEmail&&!u.deletedAt);
 if(!primary)fail('Không tìm thấy Admin sở hữu dữ liệu.');
 for(const u of db.users.filter(u=>!u.deletedAt)){
  const profile=u.id===primary.id?[...files.values()].find(f=>f.source==='admin'&&f.appProperties?.kind==='account'&&f.appProperties.userId===u.id):files.get(u.profileId);
  if(!profile?.box||profile.appProperties?.userId!==u.id)fail('Bản sao lưu thiếu tài khoản '+u.username+'.');
  if(u.id!==primary.id){const j=files.get(u.journalId);if(!j?.box||j.source!=='member')fail('Bản sao lưu thiếu nhật ký '+u.username+'.');const journal=await open(j.box,u.memberKey,'journal:'+db.id+':'+u.id);if(journal.userId!==u.id||journal.orgId!==db.id)fail('Nhật ký không khớp tài khoản.');const seen=new Set((db.receipts?.[u.id]||[]).map(r=>r.id));if((journal.events||[]).some(e=>!seen.has(e.id)))fail('Bản sao lưu còn thao tác chưa đồng bộ. Sao lưu lại bằng Admin trên hai Google cũ.');if(u.role!=='admin'&&!files.get(u.viewId)?.box)fail('Bản sao lưu thiếu dữ liệu NSD '+u.username+'.');}
 }
 for(const r of [...db.cars,...db.transactions])for(const f of r.attachments||[])if(f.driveFileId){const binary=files.get(f.driveFileId);if(binary?.source!=='member'||binary.attachmentId!==f.id||typeof binary.binary!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(binary.binary)||unb64(binary.binary).length>2*1024*1024)fail('Bản sao lưu thiếu hoặc sai tệp đính kèm '+f.name+'.');}
 return {backup,files,primary};
}
export async function inspectTransfer(service,args){
 if(!service.drive.primary)fail('Kết nối cả Google Admin mới và Google NSD mới trước.');
 const {backup}=await decode(args),db=backup.db;
 return {summary:{organizationName:db.name,createdAt:backup.createdAt,cars:db.cars.length,transactions:db.transactions.length,users:db.users.filter(u=>!u.deletedAt).length,attachments:[...db.cars,...db.transactions].reduce((n,r)=>n+(r.attachments||[]).length,0),oldPrimaryEmail:db.ownerEmail,oldSecondaryEmail:db.storage.secondaryEmail,newPrimaryEmail:service.drive.primaryEmail,newSecondaryEmail:service.drive.secondaryEmail,complete:true}};
}
export async function transferStorage(service,args){
 const drive=service.drive;if(!drive.primary||service.account)fail('Kết nối hai Google mới trước khi đăng nhập.');
 const {backup,files,primary}=await decode(args),db=structuredClone(backup.db);
 if(args.confirmation!==db.name||args.primaryEmail!==drive.primaryEmail||args.secondaryEmail!==drive.secondaryEmail)fail('Tên tổ chức hoặc hai tài khoản đích đã thay đổi. Kiểm tra lại trước khi phục hồi.');
 if(drive.primaryEmail===db.ownerEmail&&drive.secondaryEmail===db.storage.secondaryEmail)fail('Đây là hai Google cũ. Dùng Phục hồi trong Cài đặt hoặc chọn hai Google mới.');
 const existing=[...await drive.files('admin'),...await drive.files('member')];if(existing.some(f=>f.appProperties?.orgId===db.id||f.appProperties?.kind==='organization'&&f.appProperties?.orgId===undefined))fail('Tổ chức đã có trên Google đích. Đăng nhập dữ liệu hiện có hoặc chọn Google khác.');
 const created=[],batch=crypto.randomUUID(),oldOrgId=drive.orgId;drive.orgId=db.id;drive.batchId=batch;
 const create=async(name,box,kind,properties={})=>{const r=await drive.create(name,box,kind,{orgId:db.id,...properties});created.push(r.id);return r.id;};
 let published=false;
 try{
  await drive.prepare();
  const rootId=await create('Sổ Xe · tổ chức phục hồi',plain({format:'soxe-transfer-pending'},'organization:'+db.id),'organization');
  const attachmentIds=new Map();for(const record of [...db.cars,...db.transactions])for(const f of record.attachments||[])if(f.driveFileId){if(!attachmentIds.has(f.driveFileId)){const saved=files.get(f.driveFileId),r=await drive.secondary.createBinary(saved.name,saved.binary,saved.type||f.type,{model:MODEL,orgId:db.id,attachmentId:f.id,migrationBatch:batch});created.push(r.id);drive.sources.set(r.id,'member');attachmentIds.set(f.driveFileId,r.id);}f.driveFileId=attachmentIds.get(f.driveFileId);}
  const oldOwner=db.ownerEmail;db.ownerEmail=drive.primaryEmail;db.storage={model:MODEL,secondaryEmail:drive.secondaryEmail};db.revision++;db.updatedAt=new Date().toISOString();db.operations=[];
  for(const u of db.users){if(u.deletedAt){delete u.profileId;delete u.journalId;delete u.viewId;continue;}const isPrimary=u.id===primary.id;
   const oldProfile=isPrimary?[...files.values()].find(f=>f.source==='admin'&&f.appProperties?.kind==='account'&&f.appProperties.userId===u.id):files.get(u.profileId);
   if(isPrimary){u.email=drive.primaryEmail;delete u.journalId;delete u.viewId;}else{
    const journal=await open(files.get(u.journalId).box,u.memberKey,'journal:'+db.id+':'+u.id);
    u.journalId=await create('Sổ Xe · nhật ký · '+u.username,plain(journal,'journal:'+db.id+':'+u.id),'journal',{userId:u.id});
    if(u.role!=='admin')u.viewId=await create('Sổ Xe · dữ liệu được xem · '+u.username,plain({},'view:'+db.id+':'+u.id),'view',{userId:u.id});else delete u.viewId;
   }
   u.viewOwnerEmail=db.ownerEmail;
   const mapping={orgId:db.id,userId:u.id,role:u.role,model:MODEL,username:u.username,email:u.email,ownerEmail:db.ownerEmail,secondaryEmail:drive.secondaryEmail,primaryProfile:isPrimary,organizationName:db.name,passwordEpoch:u.passwordEpoch||'',...(isPrimary?{}:{journalId:u.journalId,memberKey:u.memberKey}),...(u.role==='admin'?{rootId,rootKey:backup.account.rootKey}:{viewId:u.viewId,viewOwnerEmail:db.ownerEmail})};
   const profile={format:'soxe-relocated-account',credentials:oldProfile.box,relocation:await seal(mapping,isPrimary?backup.account.rootKey:u.memberKey,'relocation:'+db.id+':'+u.id)};
   drive.profileTarget=isPrimary?'admin':'member';u.profileId=await create('Sổ Xe · '+db.name+' · '+u.username,profile,'account',{userId:u.id,username:u.username,role:u.role});
  }
  for(const u of db.users.filter(u=>!u.deletedAt&&u.role!=='admin')){const r=await drive.read(u.viewId);await drive.write(u.viewId,plain(projection(db,u),'view:'+db.id+':'+u.id),r.etag);}
  db.audit??=[];db.audit.push({action:'transferStorage',at:db.updatedAt,userId:primary.id,fromPrimary:oldOwner,fromSecondary:backup.db.storage.secondaryEmail});
  const root=await drive.read(rootId);await drive.write(rootId,plain(db,'organization:'+db.id),root.etag);published=true;
  return {transferred:true,organizationName:db.name,username:primary.username,files:created.length};
 }catch(e){if(!published){const cleanup=[];for(const id of created.reverse())try{await drive.trash(id);}catch{cleanup.push(id);}if(cleanup.length)e.message+=' · Chưa dọn được '+cleanup.length+' tệp phục hồi tạm. Kết nối lại và kiểm tra Drive trước khi thử lại.';}throw e;}
 finally{delete drive.batchId;drive.orgId=oldOrgId;drive.profileTarget='admin';service.readCache.clear();service.resolvedProfiles.clear();}
}
