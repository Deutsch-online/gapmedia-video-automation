export const topicChoices=['ai','food','travel','music','daily'];
const topics={
 ai:{fa:['هوش مصنوعی به کارهای روزمره راه پیدا کرده است. شما دوست دارید کدام کارتان را یک دستیار هوشمند انجام بدهد؟','وقتی از هوش مصنوعی جواب می‌گیرید، چطور درستی آن را بررسی می‌کنید؟','از هوش مصنوعی برای یادگیری زبان، ساخت ویدیو یا تنظیم برنامهٔ روزانه استفاده می‌کنید؟','به نظر شما با پیشرفت هوش مصنوعی، یادگرفتن کدام مهارت مهم‌تر می‌شود؟','ویدیوهای ساخته‌شده با هوش مصنوعی باید برچسب داشته باشند؟ چه چیزی به بیننده کمک می‌کند؟','هوش مصنوعی چطور می‌تواند به کارهای خلاقانه کمک کند؟ شما دوست دارید چه پروژه‌ای بسازید؟'],en:['AI is becoming part of everyday work. Which task would you like an AI assistant to handle for you?','How do you decide whether an AI answer is trustworthy? Do you check another source?','Would you use AI for learning a language, creating videos, or planning your day?','What skill should people focus on as AI tools improve?','Should an AI video always carry a clear label? What would help viewers understand it?','Can AI make creativity more accessible? Which type of project would you try?']},
 food:{fa:['منتو و آشک از غذاهای شناخته‌شدهٔ افغانستان‌اند. شما کدام غذا را برای یک مهمانی انتخاب می‌کنید؟','دربارهٔ قابلی‌پلو صحبت کنیم؛ به نظر شما چه چیزی مزه‌اش را بهتر می‌کند؟','چای سبز یا چای سیاه؛ برای یک گفتگوی دوستانه کدام را بیشتر دوست دارید؟','اگر بخواهید یک غذای افغانستان را به دوستان‌تان معرفی کنید، انتخاب‌تان چیست؟'],en:['Mantu and ashak are well-known Afghan dishes. Which dish would you choose for a gathering?','Let us talk about Kabuli pulao. What do you think makes a great plate of it?','Green tea or black tea: which would you choose for a friendly conversation?','If you could introduce one Afghan dish to a friend, what would it be?']},
 travel:{fa:['هر شهر حال‌وهوای خودش را دارد. شما دوست دارید روزی کدام شهر را ببینید و چرا؟','برای سفر، کوهستان را دوست دارید یا کنار دریا را؟ چه چیزی برای‌تان جذاب‌تر است؟','اگر یک مهمان به شهر شما بیاید، اول کدام جای دیدنی را معرفی می‌کنید؟'],en:['Every city has its own atmosphere. Which city would you like to visit one day, and why?','For a trip, would you choose mountains or the seaside? What draws you there?','If someone visited your city, which place would you recommend first?']},
 music:{fa:['بعضی آهنگ‌ها حال آدم را بهتر می‌کنند. شما چه نوع موسیقی را برای یک روز آرام می‌پسندید؟','ساز زنده را بیشتر دوست دارید یا موسیقی ضبط‌شده را؟ دلیل انتخاب‌تان چیست؟','به نظر شما آهنگ آرام برای گفتگو بهتر است یا آهنگ پرانرژی؟'],en:['Some songs can lift the mood. What kind of music would you choose for a peaceful day?','Do you prefer live instruments or recorded music? What makes you choose one?','For a conversation, would you choose calm music or something energetic?']},
 daily:{fa:['گاهی یک کار کوچک روز آدم را بهتر می‌کند. امروز چه چیزی باعث خوشحالی شما شد؟','اگر امروز یک ساعت وقت آزاد داشته باشید، دوست دارید آن را چطور بگذرانید؟','برای شروع یک روز خوب، شما کدام عادت کوچک را پیشنهاد می‌کنید؟'],en:['Sometimes a small thing can brighten a day. What made you smile today?','If you had a free hour today, how would you spend it?','What small habit would you recommend for starting a good day?']}
};
const invitations={
 fa:[
  'به نظر شما لایف با مجری انسانی و لایف با مجری هوش مصنوعی چه تفاوتی دارد؟ دوست دارم از شما بشنوم؛ منتظر نظریات‌تان هستم، کمنت کنید.',
  'سوال‌های‌تان را در کمنت بپرسید تا برای‌تان جواب بدهم. دربارهٔ هوش مصنوعی چه چیزی را دوست دارید بدانید؟',
  'اگر از این گفتگو لذت می‌برید، برای حمایت از لایف صفحه را تپ‌تپ کنید و لایف را با دوستان‌تان شریک کنید تا آن‌ها هم در گفتگو همراه شوند.'
 ],
 en:[
  'What feels different between a live with a human host and one with an AI host? I would love to hear your thoughts. Tell me in the comments!',
  'Ask me your questions in the comments, and I will answer. What would you like to know about AI?',
  'If you enjoy this conversation, tap the screen and share this live with your friends to support it. Invite them to join our AI conversation!'
 ]
};
export class TopicConversation{
 constructor({now=()=>Date.now(),interval=75000}={}){this.now=now;this.interval=interval;this.nextAt=now()+30000;this.turns=new Map();}
 take({connected,enabled,autoSpeak,busy,lastActivity=0,topic='ai',language='fa'}){const time=this.now();if(!connected||!enabled||!autoSpeak||busy||time<this.nextAt||time-lastActivity<15000)return null;if(language==='en')topic='ai';const bank=topics[topic]||topics.ai,locale=language==='en'?'en':'fa',key=topic+locale,index=this.turns.get(key)||0;this.turns.set(key,index+1);this.nextAt=time+this.interval;return index%2===1?invitations[locale][Math.floor(index/2)%invitations[locale].length]:bank[locale][Math.floor(index/2)%bank[locale].length];}
 defer(){this.nextAt=this.now()+30000;}
}
