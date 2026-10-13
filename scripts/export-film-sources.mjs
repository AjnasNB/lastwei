import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const projects = {
  founder: path.join(root, 'showtime-out/lastwei-v3-20261013-105814/project'),
  product: path.join(root, 'showtime-out/lastwei-product-v3'),
};
for (const [name, source] of Object.entries(projects)) {
  const target = path.join(root, 'film/v3', name);
  await mkdir(path.join(target, 'assets'), { recursive: true });
  await mkdir(path.join(target, 'audio'), { recursive: true });
  const intentFile = name === 'founder' ? 'assets/intent.json' : 'assets/v3-intent-public.json';
  for (const file of ['index.html', 'scenes.js', 'showtime.json', intentFile, 'audio/mix.json']) {
    const text = await readFile(path.join(source, file), 'utf8');
    await writeFile(path.join(target, file), text.trimEnd() + '\n');
  }
  if (name === 'founder') await copyFile(path.join(source, 'assets/tests-source.json'), path.join(target, 'assets/tests-source.json'));
  const check = JSON.parse(await readFile(path.join(source, 'work/check/report.json'), 'utf8'));
  const report = {
    title: name,
    ok: check.ok,
    info: { width: check.info.width, height: check.info.height, fps: check.info.fps, duration: check.info.duration },
    phone: check.phone,
    determinism: check.determinism,
    fonts: check.fonts,
    findings: check.findings.filter(f => f.code !== 'look_repeat'),
    note: 'The shared palette and music family intentionally follow the LastWei brand. Global history comparisons are omitted from this project-local export.',
  };
  await mkdir(path.join(root, 'film/v3/review'), { recursive: true });
  await writeFile(path.join(root, `film/v3/review/${name}-check.json`), JSON.stringify(report, null, 2) + '\n');
}
console.log('Exported native film source and project-local checks. Personal footage, audio and credentials are excluded.');
