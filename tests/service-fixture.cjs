const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto');
const bundledCrypto=Function(fs.readFileSync('apps-script/Crypto.gs','utf8')+'; return DriveCrypto;')();
function service(){
  const props=new Map(),cache=new Map(),files=new Map(),folders=new Map(),spreadsheets=new Map(),sheetId='testSpreadsheet12345';
  let locked=false,acquisitions=0;
  const iterator=list=>({hasNext:()=>list.length>0,next:()=>list.shift()});
  function makeFile(id,name,content,folder){const bytes=Buffer.isBuffer(content)?content:Buffer.from(content||'');const f={id,name,content:bytes,folder,trashed:false,getId(){return this.id},isTrashed(){return this.trashed},getBlob(){return {getBytes:()=>[...this.content],getDataAsString:()=>this.content.toString('utf8')}},setContent(t){this.content=Buffer.from(t)},setTrashed(t){this.trashed=t},moveTo(target){this.folder=target.getId()}};files.set(id,f);return f;}
  function makeFolder(id){const folder={id,trashed:false,getId(){return this.id},isTrashed(){return this.trashed},setTrashed(t){this.trashed=t},getFilesByName:n=>iterator([...files.values()].filter(f=>!f.trashed&&f.folder===id&&f.name===n)),createFile(name,content){if(typeof name==='object'){const blob=name;return makeFile(crypto.randomUUID(),blob.name,blob.bytes,id);}return makeFile(crypto.randomUUID(),name,content,id)}};folders.set(id,folder);return folder;}
  function makeSpreadsheet(id){
    const tabs=new Map(),bookFile=makeFile(id,'database-sheet','',null);
    const spreadsheet={
      getId:()=>id,
      getSheetByName:n=>tabs.get(n)||null,
      insertSheet(n){
        const tab={
          name:n,data:[],
          getLastRow(){let last=0;this.data.forEach((row,i)=>{if(row.some(v=>v!==''&&v!==null&&v!==undefined))last=i+1});return last;},
          clearContents(){this.data=[];return this;},
          setFrozenRows(){return this;},
          getRange(row,col,numRows,numCols){
            const target=this;
            return {
              setNumberFormat(){return this;},
              setValues(values){for(let r=0;r<numRows;r++){target.data[row-1+r]??=[];for(let c=0;c<numCols;c++)target.data[row-1+r][col-1+c]=values[r][c];}return this;},
              getValues(){return Array.from({length:numRows},(_,r)=>Array.from({length:numCols},(_,c)=>target.data[row-1+r]?.[col-1+c]??''));}
            };
          }
        };
        tabs.set(n,tab);return tab;
      },
      _tabs:tabs,_file:bookFile
    };
    spreadsheets.set(id,spreadsheet);return spreadsheet;
  }
  makeSpreadsheet(sheetId);makeSpreadsheet('anotherSpreadsheet12345');
  const properties={getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),setProperties:p=>Object.entries(p).forEach(([k,v])=>props.set(k,v)),deleteProperty:k=>props.delete(k)};
  const context={DriveCrypto:bundledCrypto,Uint8Array,Uint32Array,Int32Array,ArrayBuffer,DataView,TextEncoder,TextDecoder,console:{log(){},warn(){}},
    PropertiesService:{getScriptProperties:()=>properties},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
    Utilities:{getUuid:()=>crypto.randomUUID(),base64Encode:b=>Buffer.from(b).toString('base64'),base64Decode:s=>[...Buffer.from(s,'base64')],newBlob:(v,type,name)=>{const b=typeof v==='string'?Buffer.from(v):Buffer.from(v);return {bytes:b,type,name:name||'',getBytes:()=>[...b],getDataAsString:()=>b.toString('utf8')}}},
    LockService:{getScriptLock:()=>({tryLock(){assert.equal(locked,false);locked=true;acquisitions++;return true},releaseLock(){locked=false}})},
    DriveApp:{createFolder:()=>makeFolder(crypto.randomUUID()),getFolderById:id=>{if(!folders.has(id))throw new Error('No folder access');return folders.get(id)},getFileById:id=>{if(!files.has(id))throw new Error('No file');return files.get(id)}},
    SpreadsheetApp:{create:()=>makeSpreadsheet('generatedSpreadsheet12345'),openById:id=>{if(!spreadsheets.has(id))throw new Error('No spreadsheet access');return spreadsheets.get(id)},flush(){}},
    ScriptApp:{getService:()=>({getUrl:()=> 'https://script.google.com/macros/s/test/exec'})},MimeType:{PLAIN_TEXT:'text/plain'},HtmlService:{XFrameOptionsMode:{ALLOWALL:'ALLOWALL'}}};
  vm.createContext(context);vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),context);
  context.initializeDeployment_();
  const boot={username:'admin',password:'123789'};
  const invoke=(token,action,args={})=>context.api({token,action,args});
  return {context,props,cache,files,folders,spreadsheets,boot,invoke,get locked(){return locked},get acquisitions(){return acquisitions}};
}
module.exports={service};
