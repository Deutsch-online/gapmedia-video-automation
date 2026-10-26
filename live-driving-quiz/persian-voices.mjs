export const PERSIAN_VOICES=Object.freeze({male:{id:'fa-IR-FaridNeural',label:'مرد · فرید'},female:{id:'fa-IR-DilaraNeural',label:'زن · دیلارا'}});
export const validPersianVoice=value=>Object.hasOwn(PERSIAN_VOICES,value);
export const persianVoice=value=>PERSIAN_VOICES[validPersianVoice(value)?value:'male'];
