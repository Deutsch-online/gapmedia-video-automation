export function renderPresenter(state){
 const el=document.getElementById('teachingPresenter'),show=document.getElementById('show'),options=document.getElementById('options'),config=state.presenterDisplay;
 if(!el)return;el.classList.toggle('hidden',!config?.enabled);if(!config?.enabled)return;
 // Fit below answer choices. Never cover the quiz to make room for the portrait.
 const scale=show.getBoundingClientRect().height/1920,optionsBottom=(options.getBoundingClientRect().bottom-show.getBoundingClientRect().top)/scale;
 const available=1920-50-optionsBottom-130,width=Math.min(config.width,Math.max(0,available)*4/3);
 el.classList.toggle('hidden',width<200);el.style.width=width+'px';el.style.bottom='42px';
}
