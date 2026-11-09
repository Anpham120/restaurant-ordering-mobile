/**
 * Input rules shared by the sign-up, profile and password screens. They mirror the backend (Dtos.java: PHONE, EMAIL,
 * NAME, PASSWORD) so the user sees a problem while typing instead of after submitting.
 */
export const isPhone = (v: string) => /^0[35789][0-9]{8}$/.test(v.trim());
export const isEmail = (v: string) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v.trim());
export const isName = (v: string) => /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,99}$/u.test(v.trim());

export const PHONE_HINT = 'Số di động 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09';
export const EMAIL_HINT = 'Email không đúng định dạng (ví dụ ten@gmail.com)';
export const NAME_HINT = 'Chỉ gồm chữ cái và khoảng trắng, 2–100 ký tự';

export interface Rule { label: string; ok: boolean }
/** Each requirement of a strong password, with whether the value meets it. */
export function passwordRules(v: string): Rule[] {
  return [
    { label: 'Từ 8 ký tự trở lên', ok: v.length >= 8 && v.length <= 72 },
    { label: 'Có chữ hoa và chữ thường', ok: /[a-z]/.test(v) && /[A-Z]/.test(v) },
    { label: 'Có chữ số', ok: /[0-9]/.test(v) },
    { label: 'Có ký tự đặc biệt (ví dụ ! @ # $ %)', ok: /[^A-Za-z0-9\s]/.test(v) },
    { label: 'Không có khoảng trắng', ok: v.length > 0 && !/\s/.test(v) },
  ];
}
export const isStrongPassword = (v: string) => passwordRules(v).every((r) => r.ok);

/** A real calendar date written yyyy-mm-dd (2026-02-30 is refused). */
export function isDate(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
export const DATE_HINT = 'Ngày chưa đúng, nhập dạng năm-tháng-ngày, ví dụ 2026-11-09';

/** What is wrong with an optional start/end period (both ends inclusive), in words for the form. */
export function periodProblems(start: string, end: string): string[] {
  const out: string[] = [];
  if (start && !isDate(start)) out.push(`Ngày bắt đầu: ${DATE_HINT.charAt(0).toLowerCase()}${DATE_HINT.slice(1)}`);
  if (end && !isDate(end)) out.push(`Ngày kết thúc: ${DATE_HINT.charAt(0).toLowerCase()}${DATE_HINT.slice(1)}`);
  if (start && end && isDate(start) && isDate(end) && end < start) out.push('Ngày kết thúc phải từ ngày bắt đầu trở về sau');
  return out;
}

/** Keeps the messages of the rules that fail: problems(['Nhập tên', !name], …) style lists. */
export const problems = (...items: (string | false | null | undefined)[]): string[] => items.filter((x): x is string => !!x);
