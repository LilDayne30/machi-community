-- 事業者の所属（会社・団体名）を表示するための列
ALTER TABLE providers ADD COLUMN organization TEXT NOT NULL DEFAULT '';
