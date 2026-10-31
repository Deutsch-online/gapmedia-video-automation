"""Local, deterministic appointment graphics; no API, patient data or booking.

The original speaking clip and aligned speech remain intact. Designed UI lives
beside the complete uncropped clip, above the separate bilingual caption area.
"""
import array
import math
import sys
import wave
from pathlib import Path

STEPS = ('search', 'check', 'slot', 'details', 'submit', 'confirmed')
DISCLOSURE = 'BEISPIEL · KEINE ECHTE BUCHUNG'
PANELS = {
    'search': ('Praxis suchen', ['Hausarztpraxis', 'Ort eingeben', 'Praxen anzeigen'], 2),
    'check': ('Praxis prüfen', ['Ort passend?', 'Versicherung prüfen', 'Angaben der Praxis lesen'], 1),
    'slot': ('Freie Zeit wählen', ['Verfügbare Zeiten', 'Beispiel: Di, 10:30', 'Passenden Termin wählen'], 1),
    'details': ('Angaben prüfen', ['Kontaktdaten prüfen', 'Terminart prüfen', 'Noch nichts gebucht'], 0),
    'submit': ('Buchung absenden', ['Alles geprüft?', 'Buchung bestätigen', 'Bestätigung abwarten'], 1),
    'confirmed': ('Bestätigung lesen', ['Beispiel: Termin bestätigt', 'Zeit und Ort merken', 'Geschafft!'], 0),
}
RENTAL_STEPS = ('rental_offer', 'rental_hope', 'rental_question', 'rental_warning',
                'rental_pause', 'rental_capture', 'rental_report', 'rental_cancel', 'rental_relief')
RENTAL_DISCLOSURE = 'BEISPIEL · KEINE ECHTE ZAHLUNG'
PANELS.update({
    'rental_offer': ('800 Euro vorab?', ['Wohnung reservieren?', 'Zahlung noch offen', 'Noch nichts gesendet'], 1),
    'rental_hope': ('Endlich ein Zuhause?', ['Schöne Wohnungsfotos', 'Große Hoffnung', 'Noch nicht besichtigt'], 2),
    'rental_question': ('Schon besichtigt?', ['Wohnung selbst gesehen?', 'Nein', 'Erst prüfen'], 1),
    'rental_warning': ('Schlüssel nach Geld?', ['800 Euro vor Besichtigung', 'Das ist ein Warnsignal', 'Nicht überweisen'], 1),
    'rental_pause': ('1. Zahlung stoppen', ['Nicht unter Druck zahlen', 'Finger weg vom Senden', 'Noch kein Geld weg'], 1),
    'rental_capture': ('2. Belege sichern', ['Anzeige als Screenshot', 'Nachrichten sichern', 'Keine Daten senden'], 0),
    'rental_report': ('3. Angebot melden', ['Verdächtiges Angebot', 'Im Portal melden', 'Keine echte Meldung'], 1),
    'rental_cancel': ('4. Zahlung abbrechen', ['Zahlung noch nicht gesendet', 'Abbrechen', '0 Euro überwiesen'], 1),
    'rental_relief': ('Geld bleibt bei Marta', ['0 Euro überwiesen', 'In Ruhe weitersuchen', 'Erst prüfen, dann handeln'], 0),
})


def validate_graphic_story(plan):
    value = plan.get('graphic_story')
    if not isinstance(value, dict) or value.get('version') != 1 or value.get('kind') not in ('doctor-appointment-demo', 'rental-advance-warning-demo'):
        raise ValueError('Unknown graphic story format')
    if value['kind'] == 'rental-advance-warning-demo':
        if (value.get('real_booking') is not False or value.get('real_payment') is not False or
                value.get('disclosure_de') != RENTAL_DISCLOSURE):
            raise ValueError('Rental graphics must disclose that no real payment occurs')
        if plan.get('duration_seconds') != 45 or len(plan.get('scenes', [])) != 9:
            raise ValueError('The rental story must finish in exactly 45 seconds')
        if tuple(s.get('graphic_step') for s in plan['scenes']) != RENTAL_STEPS:
            raise ValueError('Show the rental stakes, friend and prevention actions in order')
        return
    if value.get('real_booking') is not False or value.get('disclosure_de') != DISCLOSURE:
        raise ValueError('Appointment graphics must clearly disclose an illustrative booking')
    scenes = plan.get('scenes', [])
    if plan.get('duration_seconds') != 45 or len(scenes) != 9:
        raise ValueError('The appointment demonstration must finish in exactly 45 seconds')
    if any(s.get('graphic_step') for s in scenes[:3]) or tuple(s.get('graphic_step') for s in scenes[3:]) != STEPS:
        raise ValueError('Show the problem and friend first, then all six app steps in order')


def font(size, bold=False):
    from PIL import ImageFont
    path = '/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold' if bold else '') + '.ttf'
    return ImageFont.truetype(path, size)


def panel(step, target):
    """400px-wide example phone; all text is designed, never model-generated."""
    from PIL import Image, ImageDraw
    if step not in PANELS:
        raise ValueError('Unknown appointment graphic step')
    if step in RENTAL_STEPS:
        return rental_panel(step, target)
    image = Image.new('RGBA', (400, 900), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, 399, 899), radius=44, fill='#173B45')
    draw.rounded_rectangle((10, 10, 389, 889), radius=36, fill='#F5FAF8')
    draw.rounded_rectangle((142, 22, 258, 37), radius=8, fill='#173B45')
    rental = step in RENTAL_STEPS
    draw.text((30, 64), 'WOHNUNG GESUCHT' if rental else 'ARZTTERMIN', font=font(24, True), fill='#173B45')
    draw.text((30, 102), 'Illustrative App', font=font(18), fill='#4D666E')
    steps = RENTAL_STEPS if rental else STEPS
    n = steps.index(step)
    for index in range(len(steps)):
        x = 30 + index * (340 // len(steps))
        draw.rounded_rectangle((x, 146, x + (250 // len(steps)), 154), radius=4,
                               fill='#137F82' if index <= n else '#D7E5E3')
    draw.text((30, 183), f'{"SZENE" if rental else "SCHRITT"} {n + 1} / {len(steps)}', font=font(19, True), fill='#137F82')
    title, rows, selected = PANELS[step]
    draw.text((30, 228), title, font=font(25, True), fill='#173B45')
    for index, text in enumerate(rows):
        top = 310 + index * 110
        active = index == selected
        draw.rounded_rectangle((24, top, 376, top + 84), radius=16,
                               fill='#D5F0E9' if active else '#FFFFFF',
                               outline='#137F82' if active else '#D8E5E3', width=3 if active else 1)
        # Wrap to fit instead of shrinking text until it is unreadable.
        words, result, line = text.split(), [], ''
        for word in words:
            candidate = (line + ' ' + word).strip()
            if draw.textlength(candidate, font=font(21, True)) > 308:
                result.append(line)
                line = word
            else:
                line = candidate
        result.append(line)
        for j, line in enumerate(result):
            draw.text((43, top + (25 if len(result) == 1 else 13) + j * 28), line,
                      font=font(21, True), fill='#173B45')
    if step in ('confirmed', 'rental_relief'):
        draw.ellipse((164, 674, 236, 746), fill='#137F82')
        draw.line([(184, 708), (197, 721), (220, 694)], fill='white', width=6)
    elif rental:
        draw.text((30, 694), '800 €?' if n < 5 else '0 € gesendet', font=font(40, True), fill='#A3412B' if n < 5 else '#137F82')
    else:
        draw.text((30, 700), 'Schritt für Schritt', font=font(21), fill='#4D666E')
    draw.rounded_rectangle((23, 786, 377, 866), radius=12, fill='#FBE8CA')
    draw.text((36, 798), 'BEISPIEL', font=font(20, True), fill='#694C27')
    draw.text((36, 832), 'KEINE ECHTE ZAHLUNG' if rental else 'KEINE ECHTE BUCHUNG', font=font(19, True), fill='#694C27')
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target)
    return target


def rental_panel(step, target):
    """One large visual decision per shot instead of a miniature checklist."""
    from PIL import Image, ImageDraw
    image = Image.new('RGBA', (400, 900), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, 399, 899), radius=36, fill='#173B45')
    draw.rounded_rectangle((9, 9, 390, 890), radius=29, fill='#F5FAF8')
    title, rows, selected = PANELS[step]
    n = RENTAL_STEPS.index(step)
    color = '#A3412B' if n < 5 else '#137F82'
    def words(text, size, y, fill, width=330):
        face = font(size, True)
        line, lines = '', []
        for word in text.split():
            trial = (line + ' ' + word).strip()
            if draw.textlength(trial, font=face) > width and line:
                lines.append(line)
                line = word
            else:
                line = trial
        for line in lines + [line]:
            draw.text((34, y), line, font=face, fill=fill)
            y += size + 9
        return y
    words(title, 33, 43, '#173B45')
    symbols = ['800 €', '800 €', 'GESEHEN?', '800 €', 'STOPP', 'BELEGE', 'MELDEN', 'ABBRUCH', '0 €']
    draw.text((30, 210), symbols[n], font=font(84 if n in (0, 1, 3, 8) else 54, True), fill=color)
    draw.rounded_rectangle((24, 355, 376, 650), radius=22, fill='#FBE5DA' if n < 5 else '#D5F0E9')
    words(rows[selected], 43, 382, '#173B45', 308)
    words('Noch nichts gesendet' if n < 5 else '0 Euro überwiesen', 29, 680, color)
    draw.rounded_rectangle((23, 780, 377, 866), radius=12, fill='#FBE8CA')
    draw.text((35, 789), 'BEISPIEL', font=font(27, True), fill='#694C27')
    draw.text((35, 829), 'KEINE ECHTE ZAHLUNG', font=font(20, True), fill='#694C27')
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target)
    return target


def tap_ring(step, target):
    from PIL import Image, ImageDraw
    image = Image.new('RGBA', (400, 900), (0, 0, 0, 0))
    y = 600 if step in RENTAL_STEPS else 352 + PANELS[step][2] * 110
    draw = ImageDraw.Draw(image)
    draw.ellipse((318, y - 25, 368, y + 25), outline='#E58D47', width=5)
    draw.ellipse((336, y - 7, 350, y + 7), fill='#E58D47')
    image.save(target)


def tap_audio(target, onset):
    """A short quiet original UI cue; the stem is zero outside the tap."""
    rate = 48000
    samples = array.array('h', [0]) * (5 * rate)
    if onset is not None:
        for i in range(int(.045 * rate)):
            t = i / rate
            envelope = min(1, t / .002) * math.exp(-t * 105)
            samples[int(onset * rate) + i] = round(900 * envelope * math.sin(2 * math.pi * 880 * t))
    if sys.byteorder != 'little':
        samples.byteswap()
    with wave.open(str(target), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(samples.tobytes())


def prepare_step(scene, audio, folder, index):
    """Place both tap and ring after measured speech; omit sound if no safe pause."""
    from cinematic_music import protected_speech
    step = scene['graphic_step']
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    protected = protected_speech(audio, 5)
    onset = max(1.0, max(b for _, b in protected) + .08)
    if onset > 4.75 or step in ('confirmed', 'rental_relief'):
        onset = None
    png = panel(step, folder / f'graphic-{index:02}.png')
    ring = folder / f'graphic-{index:02}-tap.png'
    tap_ring(step, ring)
    wav = folder / f'graphic-{index:02}-tap.wav'
    tap_audio(wav, onset)
    return {'panel': png, 'ring': ring, 'audio': wav, 'tap_at': onset,
            'protected_speech': protected, 'step': step}


def filters(graphic):
    # Fit the complete speaking frame at left; preserve face, hands and props.
    # Every UI panel occupies the same slot, with a deterministic, brief tap cue.
    if graphic['step'] in RENTAL_STEPS:
        result = ('[0:v]scale=640:1320:force_original_aspect_ratio=decrease:force_divisible_by=2,'
                  'pad=1080:1920:0:60:color=0xEEF4F8,setsar=1,fps=30[base];'
                  '[2:v]scale=340:765[panel];[base][panel]overlay=650:240[phone];')
        onset = graphic['tap_at']
        if onset is None:
            result += '[phone]null[v];'
        else:
            result += '[3:v]scale=340:765[ring];'
            result += f"[phone][ring]overlay=650:240:enable='between(t,{onset:.6f},{onset + .28:.6f})'[v];"
        return result + '[1:a][4:a]amix=inputs=2:duration=first:normalize=0,atrim=0:5,aresample=48000[a]'
    result = ('[0:v]scale=540:1320:force_original_aspect_ratio=decrease:force_divisible_by=2,'
              'pad=1080:1920:0:0:color=0xEEF4F8,setsar=1,fps=30[base];'
              '[base][2:v]overlay=580:210[phone];')
    onset = graphic['tap_at']
    if onset is None:
        result += '[phone]null[v];'
    else:
        result += f"[phone][3:v]overlay=580:210:enable='between(t,{onset:.6f},{onset + .28:.6f})'[v];"
    return result + '[1:a][4:a]amix=inputs=2:duration=first:normalize=0,atrim=0:5,aresample=48000[a]'
