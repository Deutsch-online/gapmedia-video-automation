# بات پاسخ‌گوی فوری تلگرام — میزبانی رایگان

این Worker پیام‌های تلگرام را فوراً پاسخ می‌دهد و فرمان‌های ساخت ویدیو را به GitHub Actions می‌سپارد. چت با مدل مستقیم Llama 4 Scout در Workers AI رایگان Cloudflare انجام می‌شود و خود Worker رندر نمی‌کند.

## یک‌بار راه‌اندازی

1. در Cloudflare یک حساب رایگان بسازید.
2. در پوشه `worker`، `npm install` و سپس `npx wrangler login` را اجرا کنید.
3. Secretهای زیر را وارد کنید؛ هیچ‌کدام را در فایل یا GitHub ثبت نکنید:

```powershell
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put ALLOWED_CHAT_ID
npx wrangler secret put GITHUB_TOKEN
```

`GITHUB_TOKEN` باید یک Fine-grained Personal Access Token با دسترسی **Contents: Read and write** برای همین repository باشد. بات با یک Push امن، ساخت درس آلمانی را آغاز می‌کند؛ بنابراین به دسترسی Actions وابسته نیست. چت از سهمیهٔ رایگان روزانهٔ Workers AI استفاده می‌کند؛ MiniMax برای پاسخ‌گویی این بات لازم نیست.

4. اجرا کنید: `npm run deploy`
5. URL نمایش‌داده‌شده را برای webhook ثبت کنید (SECRET همان مقدار `TELEGRAM_WEBHOOK_SECRET`):

```powershell
$token = Read-Host 'Telegram bot token'
$url = Read-Host 'Worker URL'
$secret = Read-Host 'Webhook secret'
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -Body @{ url=$url; secret_token=$secret }
```

بعد از webhook، دیگر هیچ listener زمان‌بندی‌شده‌ای پیام‌ها را نمی‌خواند؛ فقط Worker پاسخ می‌دهد تا پیام‌ها دو بار پردازش نشوند.

## حافظهٔ گفت‌وگو (اختیاری)

برای نگهداری چند پیام اخیر، یک Workers KV namespace رایگان بسازید و شناسه‌اش را در `wrangler.jsonc` طبق کامنت اضافه کنید. بدون KV نیز بات پاسخ می‌دهد، اما گفت‌وگو را میان پیام‌ها به یاد نمی‌سپارد.
