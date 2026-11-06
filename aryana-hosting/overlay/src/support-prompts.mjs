const prompts=[
 ['If this example helped, tap the screen to support the conversation. What would you try differently?','اگر این مثال کمک کرد، با تپ‌تپ از گفتگو حمایت کنید. شما چه چیزی را متفاوت امتحان می‌کنید؟'],
 ['Invite a friend who enjoys AI questions. They are welcome to add another point of view.','دوستی را که سوال‌های هوش مصنوعی دوست دارد دعوت کنید. نظر متفاوت او هم خوش آمدید.'],
 ['Your comments help choose what needs a clearer explanation. Tell me which detail you want to explore.','کومنت شما کمک می‌کند بدانیم کدام نکته توضیح بیشتر می‌خواهد. کدام جزئیات را بیشتر بررسی کنیم؟'],
 ['A like is welcome if you enjoy these practical examples. No gift is needed to take part.','اگر این مثال‌های عملی را دوست دارید، لایک شما خوشحال‌کننده است. برای شرکت‌کردن نیازی به گیفت نیست.'],
 ['Would someone you know find this useful? You can share the live and compare your ideas together.','آیا کسی را می‌شناسید که این موضوع به کارش بیاید؟ لایف را شریک کنید و نظرهای‌تان را مقایسه کنید.'],
 ['You can disagree respectfully. Which part of that explanation would you challenge?','می‌توانید محترمانه مخالفت کنید. کدام بخش توضیح را به چالش می‌کشید؟'],
 ['If you have been listening quietly, you are welcome too. Add a question whenever you wish.','اگر آرام گوش داده‌اید هم حضور شما خوشحال‌کننده است. هر وقت خواستید یک سوال اضافه کنید.'],
 ['Tap if you prefer examples to technical terms, and tell me what makes an explanation easier for you.','اگر مثال را از اصطلاح فنی بیشتر دوست دارید، تپ کنید و بگویید چه چیزی توضیح را آسان‌تر می‌سازد.'],
 ['Bring a curious friend into the discussion. A beginner question can lead to a useful discovery.','یک دوست کنجکاو را به گفتگو دعوت کنید. سوال مبتدی هم می‌تواند نکتهٔ مفیدی را روشن کند.'],
 ['Which task would you actually use this for? Write your example; practical questions are welcome here.','شما این روش را برای کدام کار واقعی استفاده می‌کنید؟ مثال خود را بنویسید؛ سوال عملی خوش آمدید.'],
 ['Thank you for spending time in this discussion. A share can invite someone with a different experience.','از وقتی که در گفتگو می‌گذارید تشکر. با شریک‌کردن لایف می‌توانید کسی با تجربهٔ متفاوت را دعوت کنید.'],
 ['What should a good AI host do when it is unsure? I would like to hear your view in the comments.','مجری هوش مصنوعی وقتی مطمئن نیست چه باید بکند؟ دوست دارم نظر شما را در کومنت بشنوم.'],
 ['If the pace feels right, a like can show that. If a step needs more detail, ask about that step.','اگر سرعت توضیح مناسب است، با لایک نشان بدهید. اگر یک قدم توضیح بیشتر می‌خواهد، دربارهٔ همان بپرسید.'],
 ['What matters most to you in an AI reply: clarity, speed, or evidence? Explain your choice.','در جواب هوش مصنوعی چه چیزی مهم‌تر است: روشنی، سرعت یا مدرک؟ دلیل انتخاب‌تان را بگویید.'],
 ['You can support the live by sharing a useful idea from it with a friend. Which idea would you choose?','با شریک‌کردن یک نکتهٔ مفیدِ لایف با دوست‌تان می‌توانید حمایت کنید. کدام نکته را انتخاب می‌کنید؟'],
 ['What difference do you notice between a human-led conversation and this virtual one? Your honest feedback is welcome.','چه تفاوتی میان گفتگوی مجری انسانی و این گفتگوی مجازی می‌بینید؟ نظر صادقانهٔ شما خوش آمدید.']
];
export function supportSegment(index,language,viewer){if(index<0||index>=prompts.length)return null;const en=language==='en',prefix=viewer?(en?viewer.englishName+', ':viewer.name+' جان، '):'';return {key:'support-'+index,type:'support',text:prefix+prompts[index][en?0:1],viewerId:viewer?.id};}
