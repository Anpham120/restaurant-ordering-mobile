import { useState } from 'react';
import { View } from 'react-native';

import { PasswordRules } from '@/components/password-rules';
import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { EditorPanel, WithEditor } from '@/components/editor';
import { ListRow } from '@/components/list-row';
import { useResetPassword } from '@/components/reset-password';
import { Txt } from '@/components/txt';
import { Badge, Card, Chip, Empty, ErrorBox, Field, Loading } from '@/components/ui';
import { api, errorMessage, type Role, type StaffInput, type User } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { initials, roleLabel } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { EMAIL_HINT, isEmail, isPhone, isStrongPassword, PHONE_HINT, problems } from '@/lib/validate';
import { useToast } from '@/lib/toast';

interface Form { id?: number; fullName: string; phone: string; email: string; password: string; role: Role; active: boolean }
const ROLES: Role[] = ['STAFF', 'KITCHEN', 'SHIPPER', 'MANAGER'];
const ROLE_TONE: Partial<Record<Role, { bg: string; fg: string }>> = {
  MANAGER: { bg: colors.primarySoft, fg: colors.primaryText },
  KITCHEN: { bg: colors.warningSoft, fg: colors.warningText },
  SHIPPER: { bg: colors.successSoft, fg: colors.success },
};

export default function AdminStaff() {
  const toast = useToast();
  const { user } = useSession();
  const list = useLoad<User[]>(() => api.staff());
  const pw = useResetPassword();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const body: StaffInput = { fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim() || null,
      password: form.password || null, role: form.role, active: form.active };
    try {
      if (form.id) await api.updateStaff(form.id, body); else await api.createStaff(body);
      setForm(null);
      await list.reload();
      toast.show('Đã lưu tài khoản', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  const lock = async (u: User) => {
    if (!(await confirmAction(`${u.active ? 'Khóa' : 'Mở khóa'} tài khoản ${u.fullName}?`, u.active ? 'Khóa' : 'Mở khóa'))) return;
    try { await api.setUserActive(u.id, !u.active); setForm(null); await list.reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const remove = async () => {
    if (!form?.id || !(await confirmAction(`Xóa tài khoản ${form.fullName}? Chỉ xóa được nhân viên chưa xử lý đơn nào.`, 'Xóa'))) return;
    try { await api.deleteStaff(form.id); setForm(null); await list.reload(); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };
  const current = list.data?.find((u) => u.id === form?.id);
  const blockers = !form ? [] : problems(
    !form.fullName.trim() && 'Nhập họ tên',
    !isPhone(form.phone) && PHONE_HINT,
    !!form.email.trim() && !isEmail(form.email) && EMAIL_HINT,
    (form.id ? !!form.password && !isStrongPassword(form.password) : !isStrongPassword(form.password)) && 'Mật khẩu chưa đủ mạnh (xem các yêu cầu bên trên)',
  );

  return (
    <Page title="Nhân viên" subtitle="Tài khoản nhân viên, bếp và quản lý – đăng nhập bằng số điện thoại"
      actions={<Button title="Thêm nhân viên" icon="person-add-outline" onPress={() => setForm({ fullName: '', phone: '', email: '', password: '', role: 'STAFF', active: true })} />}>
      {list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
      <WithEditor
        list={<Card padded={false}>
          {list.loading && !list.data ? <Loading /> : (list.data ?? []).length === 0 ? <Empty title="Chưa có nhân viên" /> : (list.data ?? []).map((u, i) => (
            <ListRow key={u.id} first={i === 0} selected={form?.id === u.id} dim={!u.active}
              onPress={() => setForm({ id: u.id, fullName: u.fullName, phone: u.phone, email: u.email ?? '', password: '', role: u.role, active: u.active })}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Txt weight="extrabold" size={14} color={colors.primaryText}>{initials(u.fullName)}</Txt>
              </View>
              <View style={{ flex: 1, minWidth: 160 }}>
                <Txt weight="bold" size={15}>{u.fullName}{u.id === user?.id ? <Txt size={13} color={colors.muted}> (bạn)</Txt> : null}</Txt>
                <Txt size={13} color={colors.muted}>{u.phone}{u.email ? ` · ${u.email}` : ''}</Txt>
              </View>
              <Badge label={roleLabel[u.role]} bg={ROLE_TONE[u.role]?.bg ?? colors.infoSoft} fg={ROLE_TONE[u.role]?.fg ?? colors.info} />
              {u.mustChangePassword ? <Badge label="Chờ đổi mật khẩu" bg={colors.warningSoft} fg={colors.warningText} /> : null}
              {!u.active ? <Badge label="Đã khóa" bg={colors.dangerSoft} fg={colors.danger} /> : null}
            </ListRow>
          ))}
        </Card>}
        editor={<EditorPanel open={!!form} title={form?.id ? 'Sửa tài khoản' : 'Thêm nhân viên'} onClose={() => setForm(null)} onSave={save} saving={saving} problems={blockers}
          extra={current && current.id !== user?.id ? <>
            <Button title="Đặt lại mật khẩu" variant="secondary" icon="key-outline" loading={pw.busy === current.id} onPress={() => void pw.reset(current)} />
            <Button title={current.active ? 'Khóa' : 'Mở khóa'} variant="secondary" onPress={() => void lock(current)} />
            <Button title="Xóa" variant="danger" onPress={() => void remove()} />
          </> : null}>
          {form ? (
            <View style={{ gap: 12 }}>
              <Field label="Họ và tên" value={form.fullName} onChangeText={(v) => set('fullName', v)} maxLength={100} />
              <Field label="Số điện thoại (tên đăng nhập)" value={form.phone} onChangeText={(v) => set('phone', v.replace(/\D/g, ''))} keyboardType="phone-pad" maxLength={10}
                error={form.phone.length >= 10 && !isPhone(form.phone) ? PHONE_HINT : null} />
              <Field label="Email (không bắt buộc)" value={form.email} onChangeText={(v) => set('email', v)} autoCapitalize="none"
                error={form.email.trim() && !isEmail(form.email) ? EMAIL_HINT : null} />
              <Field label={form.id ? 'Mật khẩu mới (bỏ trống nếu không đổi)' : 'Mật khẩu'} value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry autoComplete="new-password" />
              <PasswordRules value={form.password} />
              <View style={{ gap: 6 }}>
                <Txt weight="semibold" size={14}>Vai trò</Txt>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {ROLES.map((r) => <Chip key={r} label={roleLabel[r]} active={form.role === r} onPress={() => set('role', r)} />)}
                </View>
              </View>
            </View>
          ) : null}
        </EditorPanel>} />
      {pw.dialog}
    </Page>
  );
}
