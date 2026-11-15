// 現地交流（現地の人・住民とのつながり）の画面を出すかどうか。
// 2026-11-15：当面は「高校留学の経験者に相談する」に絞るため非表示。
// コード・DB・APIは残してあり、ビルド時に VITE_LOCAL_EXCHANGE=1 を付けるか、
// 下の既定値を true にすると元に戻る。
export const localExchangeEnabled: boolean =
  import.meta.env.VITE_LOCAL_EXCHANGE === "1" ||
  import.meta.env.VITE_LOCAL_EXCHANGE === "true";
