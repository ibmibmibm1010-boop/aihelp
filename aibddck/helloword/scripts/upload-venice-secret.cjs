/**
 * Загружает VENICE_API_KEY в Cloudflare Worker (helloword) через `wrangler secret bulk`.
 * Значение берётся только из переменной окружения — не храните ключ в файлах репозитория.
 *
 * PowerShell:
 *   $env:VENICE_API_KEY = "ваш_ключ"
 *   npm run secret:upload
 */
const { writeFileSync, unlinkSync, existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const root = join(__dirname, '..');
const tmp = join(root, '.venice-bulk-tmp.env');

const key = process.env.VENICE_API_KEY?.trim();
if (!key) {
	console.error(
		'Задай ключ в среде и повтори:\n' +
			'  PowerShell:  $env:VENICE_API_KEY = "..." ; npm run secret:upload\n' +
			'  cmd:         set VENICE_API_KEY=... && npm run secret:upload'
	);
	process.exit(1);
}

try {
	writeFileSync(tmp, `VENICE_API_KEY=${key}\n`, { encoding: 'utf8' });
	execSync(`npx wrangler secret bulk "${tmp}"`, { cwd: root, stdio: 'inherit' });
	console.log('\nГотово. Проверка: npx wrangler secret list');
} finally {
	if (existsSync(tmp)) {
		try {
			unlinkSync(tmp);
		} catch {
			// ignore
		}
	}
}
