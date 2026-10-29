# ابزارهای اختیاری صدا و چهره

این دو ابزار مستقل از سرور و برنامهٔ رانندگی هستند. کدهای کمکی از پروژهٔ موجود مالک استخراج شده‌اند؛ مدل‌ها و محیط Python جداگانه می‌خواهند و با نصب معمول برنامه نصب نمی‌شوند.

## تبدیل رنگ صدا با OpenVoice V2

کد OpenVoice: `myshell-ai/OpenVoice` در revision `74a1d147b17a8c3092dd5430504bd83ef6c7eb23`؛ مدل عمومی `myshell-ai/OpenVoiceV2` در revision `f36e7edfe1684461a8343844af60babc2efbb727`، با مجوز MIT. اسکریپت SHA-256 مدل و تنظیمات را بررسی می‌کند.

```sh
python tools/clone-voice.py --reference /private/authorized-reference.wav --source /private/spoken.wav --output /private/converted.wav --openvoice-root /models/OpenVoice --model-dir /models/openvoice-converter
```

نمونه باید از خودتان یا صاحب صدای راضی باشد. نتیجه نیازمند شنیدن است؛ شباهت کامل، لهجهٔ دری یا سرعت زنده تضمین نمی‌شود. اسکریپت خودش نمونه را به سرویس خارجی نمی‌فرستد.

## پیش‌نمایش متحرک با SadTalker روی CPU

کد `OpenTalker/SadTalker` در revision `cd4c0465ae0b54a6f85af57f5c65fec9fe23e7f8`؛ مدل `vinthony/SadTalker-V002rc` در revision `df6f230f2fbec618d69e47229ea32dd224fc9c5c`، فایل‌های `SadTalker_V0.0.2_256.safetensors` و `mapping_00109-model.pth.tar`. مجوز Apache 2.0 و اطلاعیه‌های بالادستی حفظ شوند.

```sh
python tools/render-avatar-cpu.py --sadtalker-root /models/SadTalker --portrait public/assets/aryana.png --audio public/assets/introduction.mp3 --output-dir /private/avatar-preview
```

این ابزار پیش‌پردازش ویدیوی آفلاین است؛ اجرای کامل آن روی لپ‌تاپ یا سرعت زنده در این نسخه تأیید نشده است. خروجی نهاییِ بررسی‌شده را می‌توان با نام `public/assets/introduction.mp4` برای دکمهٔ معرفی اضافه کرد. آن را برای همهٔ جمله‌ها به‌صورت حلقه پخش نکنید؛ حرکت لب باید با همان صدای کلیپ مطابقت داشته باشد.
