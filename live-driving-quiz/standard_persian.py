"""Literal standard Persian reading. Never substitute Afghan vocabulary or owner audio."""
import re,unicodedata

def speech_text(text):
    text=unicodedata.normalize('NFC',text).translate(str.maketrans('يك٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','یک01234567890123456789'))
    # An explicit vowel prevents a consonant/short-vowel ambiguity in a core lesson word.
    text=re.sub(r'(?<![\w\u200c])یک(?![\w\u200c])','یِک',text)
    text=re.sub(r'(?<=\d)[.٫](?=\d)',' ممیز ',text).replace('%',' درصد ').replace('٪',' درصد ')
    text=''.join(c if c in '.,،؟!\u200c' or not unicodedata.category(c).startswith(('P','S','C')) else ' ' for c in text)
    return re.sub(r'\s+',' ',text).strip()
