# Кадры пролёта из видео Higgsfield _src/v3/v1.mp4: облака -> лес с 1500 м (без промпарка, по просьбе клиента).
# Запуск: uv run --no-project --with imageio-ffmpeg --with pillow python scripts/frames.py
# Пишет public/assets/film/d3 (компьютер, 1600 px, 139 кадров) и m6 (телефон, центральные 80%, 720 px, 90 кадров); с аргументом m - только телефон,
# а также public/assets/img/forest.webp (финальный кадр 1400 x 791). Генплан промпарка - plan2.webp, его не трогает.
import os, subprocess, tempfile, glob, shutil
import imageio_ffmpeg
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '_src', 'v3')
FILM = os.path.join(ROOT, 'public', 'assets', 'film')
FF = imageio_ffmpeg.get_ffmpeg_exe()

tmp = tempfile.mkdtemp()
seq = []
for k, name in enumerate(['v1.mp4']):
    out = os.path.join(tmp, f'{k}_%04d.png')
    subprocess.run([FF, '-loglevel', 'error', '-i', os.path.join(SRC, name), out], check=True)
    fr = sorted(glob.glob(os.path.join(tmp, f'{k}_*.png')))
    if k:
        fr = fr[1:]  # первый кадр второго видео совпадает с последним кадром первого
    seq += fr
print('всего кадров в видео:', len(seq))

def pick(n):
    return [seq[round(i * (len(seq) - 1) / (n - 1))] for i in range(n)]

def write(dirname, n, width, crop, q):
    d = os.path.join(FILM, dirname)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    for i, f in enumerate(pick(n)):
        im = Image.open(f).convert('RGB')
        if crop:
            w = im.width
            im = im.crop((round(w * crop[0]), 0, round(w * (crop[0] + crop[1])), im.height))
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        im.save(os.path.join(d, f'{i + 1:03d}.webp'), quality=q, method=6)
    print(dirname, n, 'кадров')

import sys
if 'm' not in sys.argv[1:]:
    write('d3', 139, 1600, None, 74)
write('m6', 90, 720, (.1, .8), 68)

# финальный кадр сверху: ключевой кадр в полном разрешении (видео заканчивается на нём)
Image.open(os.path.join(SRC, 'k2.png')).convert('RGB').resize((1400, 791), Image.LANCZOS) \
    .save(os.path.join(ROOT, 'public', 'assets', 'img', 'forest.webp'), quality=82, method=6)
print('forest.webp')
shutil.rmtree(tmp)
