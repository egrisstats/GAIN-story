// node render.js <w> <h> <out.mp4> [--stills t1,t2,...] [--fps 30]
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const [w, h, out] = process.argv.slice(2);
const stillsArg = process.argv.indexOf('--stills');
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;
const fps = 30, DUR = 58;
const SRC = path.join(__dirname, 'src');
const types = { '.jpg': 'image/jpeg', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.otf': 'font/otf' };
const srv = http.createServer((q, r) => {
  const f = path.join(SRC, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(SRC) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const port = srv.address().port;
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--force-color-profile=srgb'] });
  const page = await browser.newPage();
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(`http://localhost:${port}/film.html?w=${w}&h=${h}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.filmReady);
  const grab = async t => Buffer.from(await page.evaluate(t => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, t), 'base64');
  if (stills) {
    fs.mkdirSync(out, { recursive: true });
    for (const t of stills) fs.writeFileSync(path.join(out, `t${t.toFixed(2).padStart(5, '0')}.png`), await grab(t));
  } else {
    const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(fps), out], { stdio: ['pipe', 'ignore', 'inherit'] });
    const N = Math.round(DUR * fps);
    for (let i = 0; i < N; i++) {
      const b = await grab(i / fps);
      if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${N}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close(); srv.close();
});
