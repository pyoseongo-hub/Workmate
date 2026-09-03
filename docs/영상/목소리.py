import json, asyncio, sys, subprocess, imageio_ffmpeg
import edge_tts
V = sys.argv[1]
scenes = json.load(open(f"{V}/scenes.json", encoding="utf-8"))
ff = imageio_ffmpeg.get_ffmpeg_exe()
async def one(s):
    out = f"{V}/voice/{s['id']}.mp3"
    await edge_tts.Communicate(s["say"], "ko-KR-SunHiNeural", rate="-5%").save(out)
    r = subprocess.run([ff, "-i", out, "-f", "null", "-"], capture_output=True, text=True)
    import re
    m = re.findall(r"time=(\d+):(\d+):([\d.]+)", r.stderr)[-1]
    return s["id"], int(m[0])*3600 + int(m[1])*60 + float(m[2])
async def main():
    res = await asyncio.gather(*(one(s) for s in scenes))
    d = dict(res)
    json.dump(d, open(f"{V}/durations.json", "w"), indent=1)
    print(f"{len(d)} 개, 총 {sum(d.values()):.0f}초")
asyncio.run(main())
