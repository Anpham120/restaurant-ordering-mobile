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
