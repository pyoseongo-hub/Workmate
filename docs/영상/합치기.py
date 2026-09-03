"""
스틸컷 + 빨간 테두리 + 자막 + 목소리 → 사용법 영상 (1920x1080, 유튜브용)

  python compose.py <작업 폴더>

읽는 것: scenes.json, shots.json, shots/*.png, voice/*.mp3, durations.json
만드는 것: frames/*.png, segs/*.mp4, 워크메이트_사용법.mp4, 워크메이트_사용법.srt
"""
import json, os, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

V = sys.argv[1]
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H = 1920, 1080
PAD = 0.9  # 장면 사이 숨 고르기(초)
APP_URL = "workmate-cww0.onrender.com"

scenes = json.load(open(f"{V}/scenes.json", encoding="utf-8"))
shots = {s["id"]: s for s in json.load(open(f"{V}/shots.json", encoding="utf-8"))}
dur = json.load(open(f"{V}/durations.json"))
os.makedirs(f"{V}/frames", exist_ok=True)
os.makedirs(f"{V}/segs", exist_ok=True)

F_BOLD = "C:/Windows/Fonts/malgunbd.ttf"
F_REG = "C:/Windows/Fonts/malgun.ttf"
font = lambda p, size: ImageFont.truetype(p, size)

BG = (246, 248, 251)
INK = (15, 23, 42)
MUTED = (100, 116, 139)
RED = (225, 29, 72)
OWNER = ((219, 234, 254), (29, 78, 216))   # 파랑
STAFF = ((237, 233, 254), (109, 40, 217))  # 보라


def rounded_shadow(canvas, box, radius, shadow=18):
    """사진 뒤에 부드러운 그림자"""
    x0, y0, x1, y1 = box
    for i in range(shadow, 0, -1):
        a = int(28 * (1 - i / shadow))
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle(
            (x0 - i, y0 - i + 6, x1 + i, y1 + i + 6), radius + i, fill=(15, 23, 42, a)
        )
        canvas.alpha_composite(layer)


def wrap(draw, text, fnt, max_w):
    """띄어쓰기 단위로 줄을 바꿉니다 (낱말 중간에서 끊지 않게)"""
    lines, cur = [], ""
    for word in text.split(" "):
        trial = (cur + " " + word) if cur else word
        if draw.textlength(trial, font=fnt) > max_w and cur:
            lines.append(cur)
            cur = word
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def frame(idx, sc):
    canvas = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(canvas)

    # ── 오른쪽: 폰 화면 ────────────────────────────────
    shot = Image.open(f"{V}/shots/{sc['id']}.png").convert("RGBA")
    ph = 980
    scale = ph / shot.height
    pw = round(shot.width * scale)
    shot = shot.resize((pw, ph), Image.LANCZOS)
    px, py = W - pw - 150, (H - ph) // 2
    rounded_shadow(canvas, (px, py, px + pw, py + ph), 36)
    mask = Image.new("L", (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw, ph), 36, fill=255)
    canvas.paste(shot, (px, py), mask)
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((px, py, px + pw, py + ph), 36, outline=(203, 213, 225), width=3)

    # 빨간 테두리 (스크린샷은 2배 해상도라 좌표 ×2)
    boxes = shots.get(sc["id"], {}).get("boxes", [])
    for n, b in enumerate(boxes):
        bx0 = px + (b["x"] * 2) * scale - 8
        by0 = py + (b["y"] * 2) * scale - 8
        bx1 = px + (b["x"] + b["width"]) * 2 * scale + 8
        by1 = py + (b["y"] + b["height"]) * 2 * scale + 8
        d.rounded_rectangle((bx0, by0, bx1, by1), 14, outline=RED, width=6)
        # 번호 동그라미 (여러 곳일 때만)
        if len(boxes) > 1:
            r = 22
            # 상자 왼쪽 바깥 가운데에 번호. 자리가 없으면 왼쪽 위 모서리에
            cx, cy = bx0 - 30, (by0 + by1) / 2
            if cx - r < px + 6:
                cx, cy = bx0 - 6, by0 - 6
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=RED)
            d.text((cx, cy), str(n + 1), font=font(F_BOLD, 26), fill="white", anchor="mm")

    # ── 왼쪽: 글 ────────────────────────────────────────
    lx, ly = 120, 120
    if sc["part"]:
        bg, fg = OWNER if sc["part"] == "사장님" else STAFF
        chip = font(F_BOLD, 30)
        tw = d.textlength(sc["part"], font=chip)
        d.rounded_rectangle((lx, ly, lx + tw + 44, ly + 56), 28, fill=bg)
        d.text((lx + 22, ly + 28), sc["part"], font=chip, fill=fg, anchor="lm")
        ly += 90

    d.text((lx, ly), f"{idx:02d}", font=font(F_BOLD, 40), fill=MUTED)
    ly += 60
    for line in wrap(d, sc["title"], font(F_BOLD, 76), 1000):
        d.text((lx, ly), line, font=font(F_BOLD, 76), fill=INK)
        ly += 96
    ly += 30
    d.line((lx, ly, lx + 120, ly), fill=RED, width=6)
    ly += 50
    body = font(F_REG, 42)
    for line in wrap(d, sc["say"], body, 1000):
        d.text((lx, ly), line, font=body, fill=(51, 65, 85))
        ly += 66

    if sc["id"] == "END":
        ly += 40
        d.text((lx, ly), APP_URL, font=font(F_BOLD, 54), fill=OWNER[1])

    # 아래 띠: 앱 이름 + 주소
    d.text((lx, H - 80), "WorkMate 사용법", font=font(F_BOLD, 28), fill=MUTED)
    d.text((lx + 300, H - 80), APP_URL, font=font(F_REG, 28), fill=MUTED)

    out = f"{V}/frames/{idx:02d}_{sc['id']}.png"
    canvas.convert("RGB").save(out)
    return out


def title_card():
    canvas = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(canvas)
    d.text((W // 2, H // 2 - 90), "WorkMate", font=font(F_BOLD, 120), fill="white", anchor="mm")
    d.text((W // 2, H // 2 + 40), "작은 가게 근무표 — 사용법", font=font(F_REG, 56), fill=(203, 213, 225), anchor="mm")
    d.text((W // 2, H // 2 + 150), APP_URL, font=font(F_BOLD, 44), fill=(96, 165, 250), anchor="mm")
    out = f"{V}/frames/00_TITLE.png"
    canvas.save(out)
    return out


def seg(png, mp3, length, out):
    cmd = [FF, "-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", png]
    if mp3:
        cmd += ["-i", mp3, "-af", f"apad=pad_dur={PAD}", "-shortest"]
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono"]
    cmd += ["-t", f"{length:.2f}", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "24000", out]
    subprocess.run(cmd, check=True)


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms//3600000:02d}:{ms%3600000//60000:02d}:{ms%60000//1000:02d},{ms%1000:03d}"


segs, srt, t = [], [], 0.0
# 제목 카드 3초
p = title_card()
o = f"{V}/segs/00.mp4"
seg(p, None, 3.0, o)
segs.append(o)
t += 3.0

for i, sc in enumerate(scenes, start=1):
    p = frame(i, sc)
    length = dur[sc["id"]] + PAD
    o = f"{V}/segs/{i:02d}.mp4"
    seg(p, f"{V}/voice/{sc['id']}.mp3", length, o)
    segs.append(o)
    srt.append(f"{len(srt)+1}\n{srt_time(t)} --> {srt_time(t + dur[sc['id']])}\n{sc['say']}\n")
    t += length
    print(f"  {i:02d} {sc['id']} {length:.1f}s")

lst = f"{V}/segs/list.txt"
open(lst, "w", encoding="utf-8").write("".join(f"file '{os.path.basename(s)}'\n" for s in segs))
final = f"{V}/워크메이트_사용법.mp4"
subprocess.run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                "-c", "copy", final], check=True, cwd=f"{V}/segs")
open(f"{V}/워크메이트_사용법.srt", "w", encoding="utf-8").write("\n".join(srt))
print(f"끝: {final}  ({t/60:.1f}분, {os.path.getsize(final)/1e6:.1f} MB)")
