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


def validate_graphic_story(plan):
    value = plan.get('graphic_story')
    if not isinstance(value, dict) or value.get('version') != 1 or value.get('kind') != 'doctor-appointment-demo':
        raise ValueError('Unknown graphic story format')
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
    image = Image.new('RGBA', (400, 900), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, 399, 899), radius=44, fill='#173B45')
    draw.rounded_rectangle((10, 10, 389, 889), radius=36, fill='#F5FAF8')
    draw.rounded_rectangle((142, 22, 258, 37), radius=8, fill='#173B45')
    draw.text((30, 64), 'ARZTTERMIN', font=font(24, True), fill='#173B45')
    draw.text((30, 102), 'Illustrative App', font=font(18), fill='#4D666E')
    n = STEPS.index(step)
    for index in range(6):
        x = 30 + index * 57
        draw.rounded_rectangle((x, 146, x + 42, 154), radius=4,
                               fill='#137F82' if index <= n else '#D7E5E3')
    draw.text((30, 183), f'SCHRITT {n + 1} / 6', font=font(19, True), fill='#137F82')
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
    if step == 'confirmed':
        draw.ellipse((164, 674, 236, 746), fill='#137F82')
        draw.line([(184, 708), (197, 721), (220, 694)], fill='white', width=6)
    else:
        draw.text((30, 700), 'Schritt für Schritt', font=font(21), fill='#4D666E')
    draw.rounded_rectangle((23, 786, 377, 866), radius=12, fill='#FBE8CA')
    draw.text((36, 798), 'BEISPIEL', font=font(20, True), fill='#694C27')
    draw.text((36, 832), 'KEINE ECHTE BUCHUNG', font=font(19, True), fill='#694C27')
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target)
    return target


def tap_ring(step, target):
    from PIL import Image, ImageDraw
    image = Image.new('RGBA', (400, 900), (0, 0, 0, 0))
    y = 352 + PANELS[step][2] * 110
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
    if onset > 4.75 or step == 'confirmed':
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
    result = ('[0:v]scale=620:1320:force_original_aspect_ratio=decrease:force_divisible_by=2,'
              'pad=1080:1920:0:0:color=0xEEF4F8,setsar=1,fps=30[base];'
              '[base][2:v]overlay=650:210[phone];')
    onset = graphic['tap_at']
    if onset is None:
        result += '[phone]null[v];'
    else:
        result += f"[phone][3:v]overlay=650:210:enable='between(t,{onset:.6f},{onset + .28:.6f})'[v];"
    return result + '[1:a][4:a]amix=inputs=2:duration=first:normalize=0,atrim=0:5,aresample=48000[a]'
