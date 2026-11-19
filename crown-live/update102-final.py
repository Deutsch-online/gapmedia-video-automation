from pathlib import Path
import sys,runpy
runpy.run_path(str(Path(__file__).with_name('update102.py')),run_name='__main__')
p=Path(sys.argv[1])/'public/quiz-show-view.mjs';s=p.read_text().replace('while(font>36&&range.getBoundingClientRect().height>q.clientHeight-48)', "while(font>36&&range.getBoundingClientRect().height/($('broadcast').getBoundingClientRect().width/1080)>q.clientHeight-48)");p.write_text(s)
print('LONG_QUESTION_FITS_NATIVE_AND_SCALED_OUTPUT')
