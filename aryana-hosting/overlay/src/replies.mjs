// Reliable short social replies; anything else goes to the configured model.
export function stockReply(comment){
 const text=String(comment||'').normalize('NFC').replaceAll('ي','ی').replaceAll('ك','ک').replace(/[!؟?،,.]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
 if(/^(سلام|سلام آریانا|سلام اریانا|درود|hello|hi|hello aryana|hi aryana)$/.test(text))return /[\u0600-\u06ff]/.test(text)?'سلام، خوش آمدید! از همراهی‌تان خوشحالم.':'Hello, welcome! It is lovely to have you here.';
 if(text.length<80&&/^(سلام( آریانا| اریانا)? )?(امروز )?(چطوری|چطور هستی|حالت چطور است|حالت چطوره)$/.test(text))return 'خوب هستم، تشکر از احوال‌پرسی‌تان. شما چطور هستید؟';
 if(/^(how are you|how are you today|hi how are you)$/.test(text))return 'I am doing well, thank you for asking! How are you?';
 if(/^(تشکر|خیلی تشکر|ممنون|مرسی|سپاس)$/.test(text))return 'خواهش می‌کنم، خوشحالم که همراه ما هستید!';
 if(/^(thanks|thank you|thanks aryana|thank you aryana)$/.test(text))return 'You are very welcome! Thank you for being here.';
 if(/^(تو واقعی هستی|تو انسان هستی|انسان واقعی هستی|تو ربات هستی|are you real|are you a real person|are you human)$/.test(text))return /[\u0600-\u06ff]/.test(text)?'من آریانا هستم، یک شخصیت مجازی ساخته‌شده با هوش مصنوعی. خوشحالم که همراه شما هستم.':'I am Aryana, a virtual character made with AI. I am happy to be here with you.';
 return null;
}
