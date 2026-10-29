import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const stages = ["訪問を計画中", "訪問予定あり", "滞在中", "旅のあと"];

export function VisitStatus({
  value = 0,
  onChange,
}: {
  value?: number;
  onChange: (value: number) => void;
}) {
  const start = useRef({ x: 0, y: 0 });
  const move = (delta: number) =>
    onChange((value + delta + stages.length) % stages.length);
  return (
    <div className="visit-status-editor">
      <span className="visit-status-label">訪問ステータス</span>
      <div
        className="visit-status-control"
        aria-label="訪問ステータスのフリック切替"
        onTouchStart={(event) => {
          start.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
          };
        }}
        onTouchEnd={(event) => {
          const dx = event.changedTouches[0].clientX - start.current.x;
          const dy = event.changedTouches[0].clientY - start.current.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy))
            move(dx < 0 ? 1 : -1);
        }}
      >
        <button
          type="button"
          className="icon-button"
          aria-label="前の訪問ステータス"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={19} />
        </button>
        <span className="visit-status-value" key={value}>
          {stages[value]}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="次の訪問ステータス"
          onClick={() => move(1)}
        >
          <ChevronRight size={19} />
        </button>
      </div>
      <div
        className="visit-status-steps"
        role="group"
        aria-label="訪問ステータス"
      >
        {stages.map((stage, index) => (
          <button
            type="button"
            key={stage}
            aria-label={stage}
            aria-pressed={value === index}
            onClick={() => onChange(index)}
          >
            <span />
          </button>
        ))}
      </div>
      <small>左右にフリックして切り替え、変更を保存</small>
    </div>
  );
}
