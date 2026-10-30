import {HOST_ORIGIN} from './replies.mjs';
export const languageChoices=new Set(['auto','fa','en']);
export function outputLanguage(selected,text){return selected==='fa'||selected==='en'?selected:/[\u0600-\u06ff]/.test(String(text))?'fa':'en';}
const english=new Map([
 [HOST_ORIGIN.fa,HOST_ORIGIN.en],
 ['بسیار تشکر!','Thank you very much!'],
 ['سلام، خوش آمدید!','Hello, welcome!'],
 ['سلام دوستان عزیز، من آریانا هستم. به لایف ما خوش آمدید!','Hello dear friends, I am Aryana. Welcome to our live!'],
 ['سلام، خوش آمدید! از همراهی‌تان خوشحالم.','Hello, welcome! It is lovely to have you here.'],
 ['خوب هستم، تشکر از احوال‌پرسی‌تان. شما چطور هستید؟','I am doing well, thank you for asking! How are you?'],
 ['خواهش می‌کنم، خوشحالم که همراه ما هستید!','You are very welcome! Thank you for being here.'],
 ['من آریانا هستم، یک شخصیت مجازی ساخته‌شده با هوش مصنوعی. خوشحالم که همراه شما هستم.','I am Aryana, a virtual character made with AI. I am happy to be here with you.'],
]);
const persian=new Map([...english].map(([fa,en])=>[en,fa]));
export function localizedReply(text,selected){if(selected==='en')return english.get(text)||(!/[\u0600-\u06ff]/.test(text)?text:null);if(selected==='fa')return persian.get(text)||(/[\u0600-\u06ff]/.test(text)?text:null);return text;}
export function localizedReaction(text,selected){if(selected!=='en')return text;return english.get(text)||(/خوش آمدید/.test(text)?(text.match(/^(.+?) جان،/)?.[1]?`A warm welcome, ${text.match(/^(.+?) جان،/)[1]}! It is lovely to have you here.`:'Welcome! It is an honor to have you here.'):text);}
