import { useSharedState } from "@/hooks/useSharedState";
import { useRole } from "@/contexts/RoleContext";
import type { Notice } from "@/types";

/** 알림은 최근 것만 남깁니다. 끝없이 쌓이면 저장소가 무거워집니다. */
const KEEP = 100;

/**
 * "누가 무엇을 고쳤다" 를 남기고 읽는 곳입니다.
 *
 * 사장님이 매장에 없어도 무슨 일이 있었는지 알 수 있어야 합니다.
 * 자기가 한 일은 자기 알림 목록에서 이미 읽은 것으로 칩니다.
 */
export function useNotices() {
  const { myName } = useRole();
  const [notices, setNotices] = useSharedState<Notice[]>("notices", []);

  /** 알림을 남깁니다. */
  const notify = (text: string) => {
    if (!text || !myName) return;

    const nextId = Math.max(0, ...notices.map((notice) => notice.id)) + 1;
    const at = new Date().toISOString().slice(0, 16); // "2026-09-01T14:30"

    setNotices(
      [
        // 자기가 한 일은 스스로 이미 읽은 것으로 둡니다.
        { id: nextId, at, who: myName, text, readBy: [myName] },
        ...notices,
      ].slice(0, KEEP)
    );
  };

  /** 내가 아직 안 읽은 알림 */
  const unread = notices.filter((notice) => !notice.readBy.includes(myName));

  /** 지금 보이는 것을 전부 읽음으로 표시합니다. */
  const markAllRead = () => {
    if (unread.length === 0) return;
    setNotices(
      notices.map((notice) =>
        notice.readBy.includes(myName)
          ? notice
          : { ...notice, readBy: [...notice.readBy, myName] }
      )
    );
  };

  return { notices, unread, notify, markAllRead };
}
