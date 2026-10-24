/**
 * Danh sách nhà mạng + mệnh giá thẻ cào.
 *
 * Chụp MỘT LẦN từ:
 *   GET https://gachthe1s.com/chargingws/v2/getfee?partner_id=89816317611
 * ngày 2026-10-24. Chỉ giữ `telco` + `value`; frontend KHÔNG gọi API lúc runtime.
 *
 * Khi cổng gạch thẻ thay đổi mệnh giá/nhà mạng, cập nhật file này thủ công.
 */

export const DEFAULT_TELCO = 'VIETTEL'

export const TELCO_LABELS = {
  VIETTEL: 'Viettel',
  MOBIFONE: 'Mobifone',
  VINAPHONE: 'Vinaphone',
  VNMB: 'Vietnamobile',
  GARENA2: 'Garena',
  ZING: 'Zing',
  APPOTA: 'Appota',
  GATE: 'Gate',
  GOSU: 'Gosu',
  SCOIN: 'Scoin',
  SOHACOIN: 'SohaCoin',
  VCOIN: 'Vcoin',
}

/** Thứ tự hiển thị: nhà mạng phổ biến trước, sau đó tới cổng game/khác. */
export const CARD_TELCO_OPTIONS = [
  {
    telco: 'VIETTEL',
    values: [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000],
  },
  {
    telco: 'MOBIFONE',
    values: [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000],
  },
  {
    telco: 'VINAPHONE',
    values: [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000],
  },
  {
    telco: 'VNMB',
    values: [10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000],
  },
  {
    telco: 'GARENA2',
    values: [5000, 10000, 20000, 50000, 100000, 200000, 500000],
  },
  {
    telco: 'ZING',
    values: [10000, 20000, 50000, 100000, 200000, 500000, 1000000],
  },
  {
    telco: 'APPOTA',
    values: [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000],
  },
  {
    telco: 'GATE',
    values: [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000],
  },
  {
    telco: 'GOSU',
    values: [100000, 200000, 500000, 1000000, 2000000, 5000000],
  },
  {
    telco: 'SCOIN',
    values: [50000, 100000, 200000, 500000, 1000000, 2000000, 5000000],
  },
  {
    telco: 'SOHACOIN',
    values: [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000],
  },
  {
    telco: 'VCOIN',
    values: [10000, 20000, 50000, 100000, 200000, 300000, 500000, 1000000, 2000000, 5000000, 10000000],
  },
]

export const telcoLabel = (telco) => TELCO_LABELS[telco] ?? telco

export const getCardValues = (telco) =>
  CARD_TELCO_OPTIONS.find((option) => option.telco === telco)?.values ?? []

export const formatCardValue = (value) =>
  `${new Intl.NumberFormat('vi-VN').format(value)}đ`

export default CARD_TELCO_OPTIONS