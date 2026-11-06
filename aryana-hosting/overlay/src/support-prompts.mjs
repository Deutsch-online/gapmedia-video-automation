import {dailyQuestion,dailyQuestionCount} from './daily-questions.mjs';
export function supportSegment(index,language,viewer){if(index<0||index>=dailyQuestionCount)return null;const en=language==='en',prefix=viewer?(en?viewer.englishName+', ':viewer.name+' جان، '):'';return {key:'daily-'+index,type:'support',text:prefix+dailyQuestion(index,language),viewerId:viewer?.id};}
