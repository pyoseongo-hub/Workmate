# 사용법 영상 다시 만들기

화면 글자가 바뀌면 영상도 다시 만들어야 합니다. 세 단계입니다.

```bash
# 0. 서버를 띄운다 (자료 창고 없이 메모리로 충분)
pnpm build && PORT=3000 node dist/server.js

# 1. 스틸컷 — 장면마다 폰 화면 + "눌러야 할 곳" 위치
node tests/영상캡처.mjs <작업폴더>

# 2. 목소리 — 대본.json 을 읽어 장면마다 mp3 (edge-tts, 선희 목소리)
cp docs/영상/대본.json <작업폴더>/scenes.json
python docs/영상/목소리.py <작업폴더>

# 3. 합치기 — 사진 + 빨간 테두리 + 자막 + 목소리 → mp4 + srt
python docs/영상/합치기.py <작업폴더>
```

필요한 것: `pip install edge-tts imageio-ffmpeg pillow` (ffmpeg 는 imageio-ffmpeg 안에 들어 있다)

- 대본은 `대본.json` 한 곳에만 있다. 말을 고치면 목소리를 다시 만든다
- 장면 번호(`id`)가 `tests/영상캡처.mjs` 의 `shot(...)` 과 맞아야 한다
- 앱 안 사용법(`Guide.tsx`)과 **같은 말**을 쓴다. 다르면 없느니만 못하다
