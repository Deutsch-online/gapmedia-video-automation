export function bankSections(questions){
 const technical=questions.filter(q=>q.id.startsWith('2.7.')).map(q=>q.id);
 const groups={};
 for(const q of questions){const id=q.id.match(/^\d\.\d\.\d{2}/)?.[0];if(!id)continue;
 let label=id;try{const slug=new URL(q.source).pathname.split('/').find(x=>x.startsWith(id+'-'));if(slug)label=id+' · '+slug.slice(id.length+1).replaceAll('-',' ');}catch{}
 (groups[id]??={label,ids:[]}).ids.push(q.id);}
 if(technical.length)groups.technical={label:'تخنیک موتر · جلسهٔ کامل با تشریح',ids:technical};
 return Object.fromEntries(Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)));
}
