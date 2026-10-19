const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const {service}=require('./service-fixture.cjs');
test('desktop/mobile onboarding, create user and car, transactions and driver permissions',async()=>{
  const testDriverPassword=require('node:crypto').randomBytes(24).toString('base64url');
  const s=service(),browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.exposeFunction('invokeServer',({method,payload})=>{
      if(!['health','bootstrap','login','api'].includes(method))throw new Error('Not public');
      return s.context[method](payload);
    });
    await page.evaluate(()=>{window.google={script:{run:new Proxy({}, {get(target,key){
      if(key==='withSuccessHandler')return fn=>{target.success=fn;return google.script.run};
      if(key==='withFailureHandler')return fn=>{target.failure=fn;return google.script.run};
      return payload=>{const success=target.success,failure=target.failure;window.invokeServer({method:key,payload}).then(success).catch(e=>failure({message:e.message}));};
    }})}};});
    await page.setContent(fs.readFileSync('apps-script/Index.html','utf8'));
    assert.equal(await page.locator('#initialUsername').inputValue(),'admin');
    await page.locator('#initialPassword').fill('123789');
    await page.getByRole('button',{name:'Đăng nhập và tự động thiết lập'}).click();
    await page.locator('#app').waitFor({state:'visible',timeout:20000});
    await page.getByRole('button',{name:'Người sử dụng',exact:true}).click();
    await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
    await page.locator('[name=name]').fill('Driver One');await page.locator('[name=username]').fill('driver.one');
    await page.locator('#modalSubmit').click();
    await page.locator('#modal').waitFor({state:'hidden',timeout:20000});
    await page.getByRole('button',{name:'Xe',exact:true}).click();await page.getByRole('button',{name:'Thêm xe',exact:true}).click();
    await page.locator('[name=plate]').fill('51A-12345');await page.locator('[name=name]').fill('Test Car');await page.locator('#modalSubmit').click();
    await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Phân công',exact:true}).click();await page.locator('[name=userId]').selectOption({label:'Driver One'});await page.locator('#modalSubmit').click();await page.locator('#modal').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Giao dịch',exact:true}).click();await page.getByRole('button',{name:'Nhập giao dịch',exact:true}).click();
    await page.locator('[name=amount]').fill('250000');await page.locator('[name=note]').fill('Fuel receipt');await page.locator('#modalSubmit').click();await page.locator('#modal').waitFor({state:'hidden'});
    assert(await page.locator('#content').innerText().then(s=>s.includes('250.000')));
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await page.screenshot({path:'/tmp/so-xe-drive-mobile.png',fullPage:true});
    await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
    await page.locator('#username').waitFor({state:'visible'});
    await page.locator('#username').fill('driver.one');
    await page.locator('#password').fill('11223344');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await page.locator('#current').fill('11223344');await page.locator('#new').fill(testDriverPassword);await page.locator('#confirm').fill(testDriverPassword);
    await page.getByRole('button',{name:'Đổi mật khẩu và vào ứng dụng'}).click();await page.locator('#app').waitFor({state:'visible',timeout:20000});
    assert.equal(await page.locator('[data-tab=settings]').count(),0);
    await page.getByRole('button',{name:'Giao dịch',exact:true}).click();
    assert.equal(await page.locator('[data-edit-transaction]').count(),0); // admin entered this transaction
    assert.equal(await page.locator('[data-delete-transaction]').count(),0);
    assert(await page.locator('#content').innerText().then(s=>s.includes('Fuel receipt')));
    await page.getByRole('button',{name:'Nhập giao dịch',exact:true}).click();await page.locator('[name=amount]').fill('50000');await page.locator('[name=note]').fill('Driver expense');
    await page.locator('#modalSubmit').click();await page.locator('#modal').waitFor({state:'hidden'});
    assert.equal(await page.locator('[data-edit-transaction]').count(),1);
    await page.locator('[data-edit-transaction]').click();await page.locator('[name=amount]').fill('75000');await page.locator('#modalSubmit').click();await page.locator('#modal').waitFor({state:'hidden'});
    assert(await page.locator('#content').innerText().then(s=>s.includes('75.000')));
    await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();assert.equal(await page.locator('#username').inputValue(),'');
    assert.equal(await page.locator('#content').innerHTML(),'');
    await page.locator('#username').fill('driver.one');
    await page.locator('#password').fill(testDriverPassword);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await page.locator('#app').waitFor({state:'visible',timeout:20000});assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
