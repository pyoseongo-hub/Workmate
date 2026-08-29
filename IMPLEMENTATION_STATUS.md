# WorkMate - 구현 현황

## 완료된 기능

### ✅ 기본 근무 관리
- [x] 기본 근무요일·시간·휴게시간 등록
- [x] 기본 근무일자 기반 월간 근무표 자동 생성
- [x] 월간 근무표·휴무·확정 교대 상태 확인

### ✅ 교대 관리
- [x] 상대 알바생 확인 및 거절 흐름
- [x] 알바생 거절 버튼을 `swaps.confirm confirmed=false`와 연결
- [x] 사장님 교대 승인·반려 흐름

### ✅ 근무 기록
- [x] 예정 근무와 실제 출퇴근 기록 분리
- [x] 날짜별 근무일지 및 특이사항 기록
- [x] 지난 날짜 기록 기본 잠금
- [x] 지난 날짜 자동 `lockedAt` 설정
- [x] 과거 기록 사장님 전용 수정 권한

### ✅ 감사 로그
- [x] 모든 변경 전후 값과 수정자·시각 이력 저장
- [x] `auditLogs` 테이블에 모든 mutation 기록

### ✅ 알림 시스템
- [x] 앱 내 알림 목록·상세 UI 추가
- [x] 교대·확인·승인 알림 표시
- [x] 알림 센터 컴포넌트 구현

### ✅ UI/UX
- [x] 반응형 모바일·PC 레이아웃
- [x] 설치형 웹앱(PWA) manifest 및 아이콘 기반 구조
- [x] 세련되고 일관된 WorkMate 디자인 시스템

### ✅ 기술
- [x] 타입 안전 tRPC API
- [x] Drizzle ORM 기반 데이터베이스
- [x] Vitest 단위 테스트 작성 및 실행
- [x] 브라우저 기능 검증과 반응형 스크린샷 검증

## 새로 추가된 기능

### 🆕 알림 센터 (NotificationCenter.tsx)
- 종 아이콘 클릭 시 알림 목록 표시
- 읽음/미읽음 상태 구분
- 알림 타입별 아이콘 표시
- 실시간 알림 목록 갱신 (3초 간격)

### 🆕 근무일지 개선
- 월별 근무일지 조회 필터링 추가
- 실제 출퇴근 시간 입력 UI 개선
- 예정 근무 시간 동적 표시
- 근무일지 생성 시 자동 잠금 로직

### 🆕 교대 거절 기능
- `rejectEmployeeSwap` 함수 추가
- 알바생이 교대 요청을 거절할 수 있도록 기능 구현

## 프로젝트 구조

```
workmate/
├── client/                    # React + Vite 프론트엔드
│   ├── src/
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── components/       # 재사용 컴포넌트
│   │   │   └── NotificationCenter.tsx  # 🆕 알림 센터
│   │   └── lib/              # 유틸리티
│   └── public/               # 정적 파일
├── server/                    # Express + tRPC 백엔드
│   ├── routers.ts            # tRPC 라우터
│   ├── db.ts                 # 데이터베이스 유틸
│   └── _core/                # 핵심 모듈
├── drizzle/                  # 데이터베이스 마이그레이션
│   ├── schema.ts             # 테이블 스키마
│   └── migrations/           # 마이그레이션 파일
└── shared/                   # 공유 코드
```

## 데이터베이스 테이블

- `users` - 사용자 정보
- `workspaces` - 매장 정보
- `workspaceMembers` - 매장 멤버십
- `recurringSchedules` - 반복 근무 패턴
- `workShifts` - 월간 근무표
- `shiftSwaps` - 교대 요청
- `workLogs` - 근무일지 기록
- `auditLogs` - 변경 이력
- `notifications` - 알림

## API 엔드포인트

### 근무표 (schedules)
- `schedules.list` - 월별 근무표 조회
- `schedules.add` - 개별 근무일자 등록
- `schedules.recurringAdd` - 반복 근무 패턴 등록
- `schedules.generateMonth` - 월간 근무표 생성

### 교대 (swaps)
- `swaps.pending` - 대기 중인 교대 조회
- `swaps.request` - 교대 신청
- `swaps.confirm` - 상대 확인/거절 ✅ **개선**
- `swaps.decide` - 사장님 승인/반려

### 근무일지 (workLogs)
- `workLogs.list` - 월별 근무일지 조회 ✅ **개선**
- `workLogs.create` - 근무일지 생성 (자동 잠금) ✅ **개선**
- `workLogs.update` - 근무일지 수정

### 알림 (notifications)
- `notifications.mine` - 내 알림 조회
- `notifications.unreadCount` - 미읽은 알림 수

## 테스트 현황

```
✓ server/workmate.features.test.ts (3 tests)
✓ server/auth.logout.test.ts (1 test)

Test Files  2 passed (2)
Tests       4 passed (4)
```

## 빌드 결과

```
✓ Frontend: 470.46 KB (gzip: 139.05 KB)
✓ Backend: 46.3 KB
✓ HTML: 368.23 KB (gzip: 105.85 KB)
```

## 다음 단계 (선택사항)

1. [ ] 알바생 간 합의 교대 등록 UI
2. [ ] 역할별 화면 완전 분리 (사장님 vs 알바생)
3. [ ] 매장 직원 관리 페이지
4. [ ] 공유 근무표 링크 기능
5. [ ] 카카오톡 공유 기능 실제 구현
6. [ ] 변경 이력 조회 페이지

## 실행 방법

```bash
# 개발 모드
pnpm dev

# 타입 체크
pnpm check

# 테스트
pnpm test

# 빌드
pnpm build

# 실행
pnpm start
```

## 기술 스택

- **프론트엔드**: React 19 + Vite + TypeScript
- **백엔드**: Express + tRPC + Node.js
- **데이터베이스**: MySQL + Drizzle ORM
- **UI**: Tailwind CSS + Radix UI
- **테스트**: Vitest
- **상태 관리**: TanStack React Query

---

**마지막 업데이트**: 2026-08-29
