/* Sổ Xe Tổ Chức — business records live in a private Google Spreadsheet.
 * Attachments live in a private Drive folder owned by the deployment account.
 * Helpers end in _ so google.script.run cannot invoke them.
 * Script Properties contain only deployment keys/configuration, never business records.
 */
const SX_FORMAT_ = 'so-xe-sheets-v2';
const SX_TABLES_ = {
  'Cau_hinh':['key','value'],
  'Nguoi_dung':['id','username','name','role','password','mustChange','sessionVersion','deletedAt'],
  'Xe':['id','plate','name','year','powerType','odo','version','attachments'],
  'Giao_dich':['id','carId','date','category','amount','odo','description','fuelPrice','liters','batteryFrom','batteryTo','repeatKm','repeatMonths','insuranceProvider','insurancePolicy','insuranceStart','insuranceExpiry','note','enteredBy','enteredFor','createdAt','updatedAt','version','attachments'],
  'Phan_cong':['id','carId','userId','startedAt','assignedBy','endedAt'],
  'Nhat_ky':['id','actor','action','target','at']
};
const SX_PASSWORD_ROUNDS_ = 600000;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Sổ Xe Tổ Chức')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Run in the Apps Script editor before publishing. Never callable from the web.
function initializeDeployment_() {
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('SX_KEY')) throw new Error('Dịch vụ đã khởi tạo. Không tạo lại khóa.');
  p.setProperties({SX_KEY:b64_(random_(32)), SX_STATE:'new'});
}
function health() {
  const p = PropertiesService.getScriptProperties();
  return {version:'2.3.0',storage:'google-sheets',ready:!!p.getProperty('SX_KEY'), initialized:p.getProperty('SX_STATE')==='ready', deleted:p.getProperty('SX_STATE')==='deleted'};
}
function bootstrap(request) {
  return locked_(function () {
    const p=props_();if(p.getProperty('SX_STATE')!=='new')throw new Error('Dịch vụ không ở trạng thái tạo tổ chức.');
    limited_('bootstrap');
    const username=String(request&&request.username||'').trim().toLowerCase(),password=String(request&&request.password||'');
    if(username!=='admin'||password!=='123789'){
      failed_('bootstrap');throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
    CacheService.getScriptCache().remove('failure:bootstrap');
    const spreadsheet = SpreadsheetApp.create('Sổ Xe Tổ Chức V2 - Dữ liệu');
    ensureWorkbookAvailable_(spreadsheet);
    const user = {id:uuid_(),username:'admin',name:'Quản trị viên',role:'admin',password:password_(password),mustChange:false,sessionVersion:1};
    const db = {format:SX_FORMAT_,id:uuid_(),name:'Sổ Xe Tổ Chức',revision:1,users:[user],cars:[],transactions:[],assignments:[],audit:[],createdAt:now_()};
    audit_(db,user,'createOrganization',db.id);
    const filesFolder = DriveApp.createFolder('So Xe To Chuc - Tep dinh kem - '+db.id);
    p.setProperties({SX_SHEET:spreadsheet.getId(),SX_FILES_FOLDER:filesFolder.getId(),SX_ORG:db.id,SX_STATE:'ready'});
    writeDatabase_(spreadsheet,db);
    p.deleteProperty('SX_SETUP_HASH');
    return {token:token_(db,user),data:view_(db,user)};
  });
}
function login(request) {
  return locked_(function () {
    const db=load_(), username=string_(request.username,40).toLowerCase();
    limited_('login:'+username);
    const u=db.users.find(x=>x.username===username&&!x.deletedAt);
    if (!u || !verifyPassword_(request.password,u.password)) {
      failed_('login:'+username); throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
    CacheService.getScriptCache().remove('failure:login:'+username);
    return {token:token_(db,u),data:view_(db,u)};
  });
}
function api(request) {
  return locked_(function () {
    const db=load_(), u=auth_(db,request.token), action=String(request.action||''), a=request.args||{};
    if(action==='changePassword') {
      if (!verifyPassword_(a.currentPassword,u.password)) throw new Error('Mật khẩu hiện tại không đúng.');
      strongPassword_(a.password);
      if(a.password===a.currentPassword)throw new Error('Hãy chọn mật khẩu mới khác mật khẩu hiện tại.');
      u.password=password_(a.password);u.mustChange=false;u.sessionVersion++;
      audit_(db,u,action,u.id);save_(db);
      return {token:token_(db,u),data:view_(db,u)};
    }
    if(u.mustChange)throw new Error('Cần đổi mật khẩu mặc định trước khi sử dụng.');
    if(action==='read')return {data:view_(db,u)};
    if(action==='attachment') {
      const t=db.transactions.find(x=>x.id===a.transactionId),c=db.cars.find(x=>x.id===a.carId);
      if(t?!canView_(db,u,t):!c||!visibleCar_(db,u,c.id))throw new Error('Không có quyền xem tệp.');
      const f=(t||c).attachments.find(x=>x.id===a.id);if(!f)throw new Error('Tệp không tồn tại.');
      const blob=DriveApp.getFileById(f.fileId).getBlob();
      return {file:{id:f.id,name:f.name,type:f.type,size:f.size,base64:Utilities.base64Encode(blob.getBytes())}};
    }
    if(action==='export') {admin_(u);return {backup:seal_(exportSnapshot_(db))};}
    if(action==='deleteOrganization') {
      admin_(u);
      if(a.confirmation!==db.name||!verifyPassword_(a.password,u.password))throw new Error('Tên tổ chức hoặc mật khẩu xác nhận không đúng.');
      DriveApp.getFileById(props_().getProperty('SX_SHEET')).setTrashed(true);
      DriveApp.getFolderById(props_().getProperty('SX_FILES_FOLDER')).setTrashed(true);
      props_().setProperty('SX_STATE','deleted');return {deleted:true};
    }
    if(action==='changeSpreadsheet') {
      admin_(u);const target=spreadsheet_(a.sheetUrl),p=props_();
      if(target.getId()===p.getProperty('SX_SHEET'))return {data:view_(db,u)};
      ensureWorkbookAvailable_(target);audit_(db,u,action,db.id);db.revision++;
      writeDatabase_(target,db);p.setProperty('SX_SHEET',target.getId());return {data:view_(db,u)};
    }
    if(u.role==='viewer')throw new Error('Tài khoản chỉ xem không có quyền sửa dữ liệu.');
    let extra={};
    switch(action) {
      case 'renameOrganization': admin_(u);db.name=string_(a.name,120);break;
      case 'createUser': {
        admin_(u);const username=string_(a.username,40).toLowerCase();
        if(!/^[a-z0-9_.-]{3,40}$/.test(username)||db.users.some(x=>x.username===username))throw new Error('Tên đăng nhập không hợp lệ hoặc đã được dùng.');
        if(!['admin','viewer','driver'].includes(a.role))throw new Error('Vai trò không hợp lệ.');
        const nu={id:uuid_(),username,name:string_(a.name,80),role:a.role,password:password_('11223344'),mustChange:true,sessionVersion:1};
        db.users.push(nu);break;
      }
      case 'resetPassword': {
        admin_(u);const target=user_(db,a.id);if(target.id===u.id)throw new Error('Hãy dùng chức năng Đổi mật khẩu cho tài khoản đang đăng nhập.');
        target.password=password_('11223344');target.mustChange=true;target.sessionVersion++;break;
      }
      case 'deleteUser': {
        admin_(u);const target=user_(db,a.id);
        if(target.id===u.id)throw new Error('Không xóa tài khoản đang đăng nhập.');
        if(db.assignments.some(x=>x.userId===target.id)||db.transactions.some(x=>x.enteredBy===target.id||x.enteredFor===target.id)||db.audit.some(x=>x.actor===target.id))throw new Error('Không xóa được: tài khoản đã được phân công xe hoặc có hoạt động liên quan.');
        target.deletedAt=now_();target.sessionVersion++;break;
      }
      case 'saveCar': {
        admin_(u);const existing=a.id?car_(db,a.id):null;version_(existing,a.version);
        const plate=string_(a.plate,30).toUpperCase();if(db.cars.some(x=>x.plate===plate&&x.id!==a.id))throw new Error('Biển số đã tồn tại.');
        const powerType=['fuel','electric','hybrid'].includes(a.powerType)?a.powerType:'fuel';
        const next={id:existing?existing.id:uuid_(),plate,name:string_(a.name,100),year:string_(String(a.year||''),4,true),powerType,odo:number_(a.odo,0,10000000),version:(existing?existing.version:0)+1,attachments:attachments_(a.attachments,existing?existing.attachments:[])};
        if(existing)db.cars[db.cars.indexOf(existing)]=next;else db.cars.push(next);break;
      }
      case 'deleteCar': {
        admin_(u);const c=car_(db,a.id);version_(c,a.version);
        if(a.confirmation!==c.plate)throw new Error('Nhập đúng biển số để xóa xe và giao dịch liên quan.');
        db.cars=db.cars.filter(x=>x.id!==c.id);db.transactions=db.transactions.filter(x=>x.carId!==c.id);db.assignments=db.assignments.filter(x=>x.carId!==c.id);break;
      }
      case 'assign': {
        admin_(u);car_(db,a.carId);const target=a.userId?user_(db,a.userId):null;if(target&&target.role!=='driver')throw new Error('Chỉ phân công xe cho người quản lý/lái xe.');
        db.assignments.filter(x=>x.carId===a.carId&&!x.endedAt).forEach(x=>x.endedAt=now_());
        if(target)db.assignments.push({id:uuid_(),carId:a.carId,userId:target.id,startedAt:now_(),assignedBy:u.id});break;
      }
      case 'saveTransaction': {
        const existing=a.id?transaction_(db,a.id):null;
        if(existing&&!canEdit_(u,existing))throw new Error('Chỉ được sửa giao dịch do mình nhập.');
        version_(existing,a.version);const selectedCar=car_(db,a.carId);
        if(u.role==='driver'&&existing&&a.carId!==existing.carId)throw new Error('Không được chuyển giao dịch sang xe khác.');
        // Drivers can enter on behalf for any car, but do not receive other records for that car.
        const enteredFor=a.enteredFor||assigned_(db,a.carId)||u.id;user_(db,enteredFor);
        if(!['fuel','charge','battery_rental','maintenance','parts','insurance','inspection','road_fee','other'].includes(a.category))throw new Error('Loại chi phí không hợp lệ.');
        if(selectedCar.powerType==='electric'&&a.category==='fuel')throw new Error('Xe điện không có chi phí đổ xăng.');
        if((!selectedCar.powerType||selectedCar.powerType==='fuel')&&['charge','battery_rental'].includes(a.category))throw new Error('Chi phí sạc xe/thuê pin chỉ áp dụng cho xe điện hoặc điện–xăng.');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||!Number.isFinite(Date.parse(a.date)))throw new Error('Ngày giao dịch không hợp lệ.');
        const insuranceStart=dateField_(a.insuranceStart,'Ngày hiệu lực'),insuranceExpiry=dateField_(a.insuranceExpiry,'Ngày hết hạn');
        if(['insurance','inspection','road_fee'].includes(a.category)&&!insuranceExpiry)throw new Error('Cần nhập ngày hết hạn.');
        if(insuranceStart&&insuranceExpiry<insuranceStart)throw new Error('Ngày hết hạn phải từ ngày hiệu lực trở đi.');
        const batteryFrom=number_(Number(a.batteryFrom||0),0,100),batteryTo=number_(Number(a.batteryTo||0),0,100);
        if(a.category==='charge'&&batteryTo<=batteryFrom)throw new Error('Pin sau sạc phải lớn hơn pin trước sạc.');
        const next={id:existing?existing.id:uuid_(),carId:a.carId,date:a.date,category:a.category,amount:number_(a.amount,0,1000000000000),odo:number_(a.odo,0,10000000),description:string_(a.description||'',1000,true),fuelPrice:number_(Number(a.fuelPrice||0),0,1000000000),liters:number_(Number(a.liters||0),0,1000000),batteryFrom,batteryTo,repeatKm:number_(Number(a.repeatKm||0),0,10000000),repeatMonths:number_(Number(a.repeatMonths||0),0,1200),insuranceProvider:string_(a.insuranceProvider||'',200,true),insurancePolicy:string_(a.insurancePolicy||'',200,true),insuranceStart,insuranceExpiry,note:string_(a.note||'',2000,true),enteredBy:existing?existing.enteredBy:u.id,enteredFor,createdAt:existing?existing.createdAt:now_(),updatedAt:now_(),version:(existing?existing.version:0)+1,attachments:attachments_(a.attachments,existing?existing.attachments:[])};
        if(existing)db.transactions[db.transactions.indexOf(existing)]=next;else db.transactions.push(next);break;
      }
      case 'deleteTransaction': {
        const t=transaction_(db,a.id);if(!canEdit_(u,t))throw new Error('Chỉ được xóa giao dịch do mình nhập.');version_(t,a.version);
        db.transactions=db.transactions.filter(x=>x.id!==t.id);break;
      }
      default:throw new Error('Thao tác không được hỗ trợ.');
    }
    audit_(db,u,action,a.id||a.carId||db.id);save_(db);return Object.assign({data:view_(db,u)},extra);
  });
}
function locked_(fn) {const lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw new Error('Dịch vụ đang bận. Hãy thử lại.');try{return fn();}finally{lock.releaseLock();}}
function props_(){const p=PropertiesService.getScriptProperties();if(!p.getProperty('SX_KEY'))throw new Error('Chủ thư mục cần khởi tạo dịch vụ trước.');return p;}
function load_(){
  const p=props_();if(p.getProperty('SX_STATE')!=='ready')throw new Error('Tổ chức chưa được tạo hoặc đã bị xóa.');
  const db=readDatabase_(SpreadsheetApp.openById(p.getProperty('SX_SHEET')));
  if(db.id!==p.getProperty('SX_ORG')||db.format!==SX_FORMAT_)throw new Error('Google Sheet không khớp tổ chức.');return db;
}
function save_(db){
  const spreadsheet=SpreadsheetApp.openById(props_().getProperty('SX_SHEET')),previous=readDatabase_(spreadsheet);
  db.revision++;writeDatabase_(spreadsheet,db);trashRemovedAttachments_(previous,db);
}
function view_(db,u){
  if(u.mustChange)return {organization:{id:db.id,name:db.name},me:{id:u.id,username:u.username,name:u.name,role:u.role,mustChange:true},revision:db.revision};
  const visible=db.transactions.filter(x=>canView_(db,u,x));
  const strip=x=>Object.assign({},x,{attachments:(x.attachments||[]).map(f=>({id:f.id,name:f.name,type:f.type,size:f.size}))});
  const full=u.role!=='driver';
  const assignedUserId=carId=>assigned_(db,carId),reminder=transaction=>({id:transaction.id,carId:transaction.carId,date:transaction.date,category:transaction.category,odo:transaction.odo,description:transaction.description||'',repeatKm:transaction.repeatKm||0,repeatMonths:transaction.repeatMonths||0,insuranceProvider:transaction.insuranceProvider||'',insurancePolicy:transaction.insurancePolicy||'',insuranceStart:transaction.insuranceStart||'',insuranceExpiry:transaction.insuranceExpiry||'',updatedAt:transaction.updatedAt||''});
  const result={organization:{id:db.id,name:db.name},me:{id:u.id,username:u.username,name:u.name,role:u.role,mustChange:false},revision:db.revision,
    users:db.users.filter(x=>!x.deletedAt).map(x=>({id:x.id,username:x.username,name:x.name,role:x.role,mustChange:x.mustChange})),
    cars:db.cars.filter(x=>full||visibleCar_(db,u,x.id)).map(strip),
    carChoices:db.cars.map(x=>({id:x.id,plate:x.plate,name:x.name,powerType:x.powerType||'fuel',assignedUserId:assignedUserId(x.id)})),transactions:visible.map(strip),assignments:db.assignments.filter(x=>full||x.userId===u.id)};
  if(u.role==='driver'){
    result.reminderTransactions=db.transactions.filter(x=>assignedUserId(x.carId)===u.id&&isReminder_(x)).map(reminder);
    result.reminderOdoByCar=Object.fromEntries(db.cars.filter(x=>assignedUserId(x.id)===u.id).map(c=>[c.id,Math.max(Number(c.odo)||0,...db.transactions.filter(t=>t.carId===c.id).map(t=>Number(t.odo)||0))]));
  }
  if(u.role==='admin')result.organization.sheetUrl='https://docs.google.com/spreadsheets/d/'+props_().getProperty('SX_SHEET')+'/edit';
  return result;
}
function assigned_(db,carId){const a=db.assignments.find(x=>x.carId===carId&&!x.endedAt);return a?a.userId:null;}
function canView_(db,u,t){return u.role!=='driver'||t.enteredBy===u.id||assigned_(db,t.carId)===u.id;}
function canEdit_(u,t){return u.role==='admin'||u.role==='driver'&&t.enteredBy===u.id;}
function visibleCar_(db,u,id){return u.role!=='driver'||assigned_(db,id)===u.id||db.transactions.some(x=>x.carId===id&&x.enteredBy===u.id);}
function admin_(u){if(u.role!=='admin')throw new Error('Chỉ Admin có quyền thực hiện thao tác này.');}
function user_(db,id){const x=db.users.find(x=>x.id===id&&!x.deletedAt);if(!x)throw new Error('Tài khoản không tồn tại.');return x;}
function car_(db,id){const x=db.cars.find(x=>x.id===id);if(!x)throw new Error('Xe không tồn tại.');return x;}
function transaction_(db,id){const x=db.transactions.find(x=>x.id===id);if(!x)throw new Error('Giao dịch không tồn tại.');return x;}
function version_(x,v){if(x&&x.version!==v)throw new Error('Dữ liệu đã được người khác sửa. Hãy tải lại trước khi lưu.');}
function audit_(db,u,action,target){db.audit.push({id:uuid_(),actor:u.id,action,target,at:now_()});}
function string_(x,max,empty){if(typeof x!=='string'||x.length>max||(!empty&&!x.trim()))throw new Error('Thông tin nhập thiếu hoặc quá dài.');return x.trim();}
function number_(x,min,max){if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw new Error('Giá trị số không hợp lệ.');return x;}
function dateField_(value,label){value=String(value||'');if(!value)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw new Error(label+' không hợp lệ.');return value;}
function isReminder_(t){return ['maintenance','parts'].includes(t.category)&&(t.repeatKm||t.repeatMonths)||['insurance','inspection','road_fee'].includes(t.category)&&t.insuranceExpiry;}
function strongPassword_(x){if(typeof x!=='string'||x.length<8||x.length>128||['11223344','123456','123789','12345678'].includes(x))throw new Error('Mật khẩu phải từ 8 đến 128 ký tự và khác mật khẩu mặc định.');}
function spreadsheet_(url){const m=String(url||'').match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{10,})(?:[/?#].*)?$/);if(!m)throw new Error('Link Google Sheet không hợp lệ.');return SpreadsheetApp.openById(m[1]);}
function ensureWorkbookAvailable_(spreadsheet){
  const marker=spreadsheet.getSheetByName('Cau_hinh');
  if(marker&&marker.getLastRow()>0)throw new Error('Google Sheet này đã có dữ liệu Sổ Xe. Hãy dùng một Sheet trống dành riêng cho ứng dụng.');
}
function sheet_(spreadsheet,name){return spreadsheet.getSheetByName(name)||spreadsheet.insertSheet(name);}
function encodeCell_(value){return JSON.stringify(value===undefined?null:value);}
function decodeCell_(value){if(value===''||value===null)return null;try{return JSON.parse(String(value));}catch(e){throw new Error('Dữ liệu trong Google Sheet không đúng định dạng tại giá trị: '+String(value).slice(0,40));}}
function writeRows_(spreadsheet,name,rows){
  const headers=SX_TABLES_[name],tab=sheet_(spreadsheet,name),values=[headers].concat(rows.map(row=>headers.map(key=>encodeCell_(row[key]))));
  tab.clearContents();tab.getRange(1,1,values.length,headers.length).setNumberFormat('@').setValues(values);tab.setFrozenRows(1);
}
function readRows_(spreadsheet,name){
  const tab=spreadsheet.getSheetByName(name);if(!tab||tab.getLastRow()<2)return [];
  const values=tab.getRange(1,1,tab.getLastRow(),SX_TABLES_[name].length).getValues(),headers=values.shift().map(String);
  if(headers.join('|')!==SX_TABLES_[name].join('|'))throw new Error('Cấu trúc bảng '+name+' đã bị thay đổi.');
  return values.filter(row=>row.some(value=>value!=='')).map(row=>Object.fromEntries(headers.map((key,index)=>[key,decodeCell_(row[index])])));
}
function writeDatabase_(spreadsheet,db){
  writeRows_(spreadsheet,'Cau_hinh',[
    {key:'format',value:db.format},{key:'id',value:db.id},{key:'name',value:db.name},
    {key:'revision',value:db.revision},{key:'createdAt',value:db.createdAt}
  ]);
  writeRows_(spreadsheet,'Nguoi_dung',db.users);
  writeRows_(spreadsheet,'Xe',db.cars);
  writeRows_(spreadsheet,'Giao_dich',db.transactions);
  writeRows_(spreadsheet,'Phan_cong',db.assignments);
  writeRows_(spreadsheet,'Nhat_ky',db.audit);
  SpreadsheetApp.flush();
}
function readDatabase_(spreadsheet){
  const settings=Object.fromEntries(readRows_(spreadsheet,'Cau_hinh').map(row=>[row.key,row.value]));
  if(!settings.id||settings.format!==SX_FORMAT_)throw new Error('Google Sheet chưa được khởi tạo hoặc không đúng phiên bản.');
  return {format:settings.format,id:settings.id,name:settings.name,revision:Number(settings.revision||0),createdAt:settings.createdAt,
    users:readRows_(spreadsheet,'Nguoi_dung'),cars:readRows_(spreadsheet,'Xe'),transactions:readRows_(spreadsheet,'Giao_dich'),
    assignments:readRows_(spreadsheet,'Phan_cong'),audit:readRows_(spreadsheet,'Nhat_ky')};
}
function attachmentIds_(db){
  const ids=new Set();db.cars.concat(db.transactions).forEach(record=>(record.attachments||[]).forEach(file=>{if(file.fileId)ids.add(file.fileId);}));return ids;
}
function trashRemovedAttachments_(before,after){
  const keep=attachmentIds_(after);attachmentIds_(before).forEach(id=>{if(!keep.has(id)){try{DriveApp.getFileById(id).setTrashed(true);}catch(e){console.warn('Không thể xóa tệp cũ '+id+': '+e.message);}}});
}
function exportSnapshot_(db){
  const snapshot=JSON.parse(JSON.stringify(db));snapshot.cars.concat(snapshot.transactions).forEach(record=>(record.attachments||[]).forEach(file=>{
    if(file.fileId)file.base64=Utilities.base64Encode(DriveApp.getFileById(file.fileId).getBlob().getBytes());
  }));return snapshot;
}
function attachments_(input,old){
  if(!Array.isArray(input)||input.length>5)throw new Error('Tối đa 5 tệp mỗi giao dịch/xe.');
  const seen={};return input.map(x=>{
    if(x.id){const keep=old.find(f=>f.id===x.id);if(!keep||seen[x.id])throw new Error('Tệp đính kèm không hợp lệ.');seen[x.id]=true;return keep;}
    const name=string_(x.name,150),type=String(x.type||'application/octet-stream');
    if(type.length>100||typeof x.base64!=='string'||x.base64.length>2800000||! /^[A-Za-z0-9+/]*={0,2}$/.test(x.base64))throw new Error('Tệp không hợp lệ hoặc lớn hơn 2 MB.');
    const bytes=unb64_(x.base64),size=bytes.length;if(size>2*1024*1024)throw new Error('Mỗi tệp tối đa 2 MB.');
    const blob=Utilities.newBlob(Array.from(bytes).map(v=>v>127?v-256:v),type,name),file=DriveApp.getFolderById(props_().getProperty('SX_FILES_FOLDER')).createFile(blob);
    return {id:uuid_(),name,type,size,fileId:file.getId()};
  });
}
function token_(db,u){const body=b64_(utf8_(JSON.stringify({org:db.id,uid:u.id,sv:u.sessionVersion,exp:Date.now()+8*60*60*1000,nonce:b64_(random_(16))})));return body+'.'+b64_(DriveCrypto.hmac(DriveCrypto.sha256,purposeKey_('session'),utf8_(body)));}
function auth_(db,token){
  if(typeof token!=='string'||token.length>2000)throw new Error('Cần đăng nhập lại.');const parts=token.split('.');
  if(parts.length!==2||!equal_(parts[1],b64_(DriveCrypto.hmac(DriveCrypto.sha256,purposeKey_('session'),utf8_(parts[0])))))throw new Error('Phiên đăng nhập không hợp lệ.');
  let t;try{t=JSON.parse(text_(unb64_(parts[0])));}catch(e){throw new Error('Phiên đăng nhập không hợp lệ.');}
  const u=user_(db,t.uid);if(t.org!==db.id||t.exp<Date.now()||t.sv!==u.sessionVersion)throw new Error('Phiên đăng nhập đã hết hạn.');return u;
}
function password_(password){const salt=random_(16);return {algorithm:'PBKDF2-SHA256',iterations:SX_PASSWORD_ROUNDS_,salt:b64_(salt),hash:b64_(DriveCrypto.pbkdf2(DriveCrypto.sha256,utf8_(password),salt,{c:SX_PASSWORD_ROUNDS_,dkLen:32}))};}
function verifyPassword_(password,stored){if(typeof password!=='string'||password.length>128)return false;return equal_(b64_(DriveCrypto.pbkdf2(DriveCrypto.sha256,utf8_(password),unb64_(stored.salt),{c:stored.iterations,dkLen:32})),stored.hash);}
function limited_(key){if(Number(CacheService.getScriptCache().get('failure:'+key)||0)>=5)throw new Error('Đăng nhập sai quá nhiều lần. Hãy thử lại sau 15 phút.');}
function failed_(key){const c=CacheService.getScriptCache(),k='failure:'+key;c.put(k,String(Number(c.get(k)||0)+1),900);}
function purposeKey_(purpose){return DriveCrypto.hmac(DriveCrypto.sha256,key_(),utf8_('so-xe-v2:'+purpose));}
function key_(){return unb64_(props_().getProperty('SX_KEY'));}
function seal_(value){const nonce=random_(12),aad=utf8_('so-xe-drive-v2');return JSON.stringify({format:'so-xe-drive-encrypted',version:2,cipher:'AES-256-GCM',nonce:b64_(nonce),ciphertext:b64_(DriveCrypto.gcm(key_(),nonce,aad).encrypt(utf8_(JSON.stringify(value))))});}
function open_(text){const x=JSON.parse(text);if(x.format!=='so-xe-drive-encrypted'||x.version!==2||x.cipher!=='AES-256-GCM')throw new Error('Định dạng mã hóa không được hỗ trợ.');return JSON.parse(text_(DriveCrypto.gcm(key_(),unb64_(x.nonce),utf8_('so-xe-drive-v2')).decrypt(unb64_(x.ciphertext))));}
function random_(length){return DriveCrypto.sha256(utf8_(Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid())).slice(0,length);}
function uuid_(){return Utilities.getUuid();}
function now_(){return new Date().toISOString();}
function hash_(text){return b64_(DriveCrypto.sha256(utf8_(text)));}
function utf8_(text){return Uint8Array.from(Utilities.newBlob(text).getBytes().map(x=>x&255));}
function text_(bytes){return Utilities.newBlob(Array.from(bytes).map(x=>x>127?x-256:x)).getDataAsString('UTF-8');}
function b64_(bytes){return Utilities.base64Encode(Array.from(bytes).map(x=>x>127?x-256:x));}
function unb64_(text){return Uint8Array.from(Utilities.base64Decode(text).map(x=>x&255));}
function equal_(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0;}
