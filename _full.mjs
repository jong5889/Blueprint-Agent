import { chromium } from 'playwright';
const B='http://localhost:3900', DIR='/Users/jdlee/dev/GitHub/Blueprint-Agent/screenshots';
const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1440,height:900}});
const stage=async(m)=>{ await pg.getByText(m,{exact:false}).first().click(); };
const waitMain=async(re,ms)=>{const t=Date.now();while(Date.now()-t<ms){const x=await pg.locator('main').first().innerText().catch(()=>'');if(re.test(x)&&x.length>300)return true;await pg.waitForTimeout(2500);}return false;};
await pg.goto(B+'/?dev=1',{waitUntil:'networkidle'}); await pg.waitForTimeout(1200);
await stage('⓪'); await waitMain(/근거|화면|목적|필드/,120000);
await stage('①'); await pg.waitForSelector('iframe',{timeout:120000}); await pg.waitForTimeout(4000);
await stage('②'); await pg.waitForTimeout(6000);
await stage('③'); await waitMain(/FR-0|SRS|ERD|OpenAPI/,180000);
await stage('④'); const ok=await waitMain(/```|schema|route|CREATE TABLE|tsx/,180000);
// open 코드 tab (exact, to avoid ④코드생성)
await pg.getByRole('button',{name:'코드',exact:true}).click().catch(async()=>{ await pg.getByText('코드',{exact:true}).first().click().catch(()=>{}); });
await pg.waitForTimeout(2000);
await pg.screenshot({path:DIR+'/drive-5-code.png'});
console.log('code populated:', ok);
await br.close();
