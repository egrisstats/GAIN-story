// node audit.js w h  -> every distinct text drawn, with its smallest rendered px size while visible
const http=require('http'),fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const [w,h]=process.argv.slice(2); const SRC=path.join(__dirname,'src');
const srv=http.createServer((q,r)=>{const f=path.join(SRC,decodeURIComponent(q.url.split('?')[0]));if(!fs.existsSync(f)){r.writeHead(404);return r.end();}fs.createReadStream(f).pipe(r);}).listen(0,async()=>{
 const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
 const p=await b.newPage(); await p.setViewport({width:+w,height:+h});
 await p.goto(`http://localhost:${srv.address().port}/film.html?w=${w}&h=${h}`,{waitUntil:'networkidle0'}); await p.evaluate(()=>window.filmReady);
 const res=await p.evaluate(()=>{const m={};for(let t=0;t<58;t+=0.25){window.__audit=[];window.renderFrame(t);for(const [s,px,a] of window.__audit){if(a<0.9)continue;if(!(s in m)||px>m[s][0])m[s]=[px,t];}}return m;});
 Object.entries(res).sort((a,b)=>a[1][0]-b[1][0]).forEach(([s,[px,t]])=>console.log((px<24?'FAIL ':'ok   ')+String(px).padStart(6)+'px  t='+t.toFixed(2)+'  '+s));
 await b.close(); srv.close();});
