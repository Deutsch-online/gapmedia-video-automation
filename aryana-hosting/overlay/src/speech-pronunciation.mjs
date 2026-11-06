import {applyCorrections} from './host.mjs';
export function speechText(text,rules={}){return applyCorrections(text,rules).replace(/(^|[^\p{L}\p{M}])(مجر[\u064b-\u065f]*ی|کوم[\u064b-\u065f]*نت)(?=$|[^\p{L}\p{M}]|های|ها|تان)/gu,(_,before,word)=>before+(word.startsWith('مجر')?'مجرِی':'کومِنت'));}
