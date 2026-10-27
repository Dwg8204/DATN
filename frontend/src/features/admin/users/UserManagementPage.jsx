import PageLoader from '../../../components/common/PageLoader.jsx';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useEffect, useState } from 'react';
import { Eye, LoaderCircle, Search, Trash2 } from 'lucide-react';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';
import { getApiError } from '../../../services/apiError';
import { AdminConfirmDialog, AdminToast } from '../components/AdminFeedback';
import { formatAdminDate } from '../utils/testManagerHelpers';
import useManagedUsers from './hooks/useManagedUsers';
import { adminUsersApi } from './services/adminUsersApi';
import styles from './UserManagementPage.module.css';
import useUrlQueryState, { queryParam } from '../../../hooks/useUrlQueryState';

const ROLE_TABS = [
  { id: 'ADMIN', label: 'Admin' },
  { id: 'STUDENT', label: 'User' },
];
const USER_QUERY_SCHEMA = {
  role: queryParam.enum(ROLE_TABS.map(item => item.id), 'ADMIN'),
  query: { ...queryParam.string(''), param: 'q' },
  page: queryParam.positiveInt(1),
  pageSize: { ...queryParam.positiveInt(5, 100), param: 'size' },
};

function Avatar({ name = '' }) {
  const initials = name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'U';
  return <span className={styles.avatar}>{initials}</span>;
}

function roleLabel(role) {
  return ROLE_TABS.find(item => item.id === role)?.label ?? role;
}

function statusLabel(status) {
  return status ? `${status[0]}${status.slice(1).toLowerCase()}` : 'Unknown';
}

function displayDate(value) {
  return value ? formatAdminDate(value) : 'Not available';
}

export default function UserManagementPage() {
  const ui = useUiTranslation();
  const [urlState, setUrlState] = useUrlQueryState(USER_QUERY_SCHEMA);
  const { role, query, page, pageSize } = urlState;
  const setPage = next => setUrlState(current => ({ page: typeof next === 'function' ? next(current.page) : next }));
  const setPageSize = next => setUrlState(current => ({ pageSize: typeof next === 'function' ? next(current.pageSize) : next, page: 1 }));
  const [detail, setDetail] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState(null);
  const { users, pagination, loading, error: loadError, reload } = useManagedUsers({ role, search: query, page, pageSize });

  useEffect(() => {
    if (loadError) setNotice({ type: 'error', message: loadError });
  }, [loadError]);

  const changeRole = nextRole => {
    setUrlState({ role: nextRole, query: '', page: 1 });
  };

  const remove = async () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    try {
      await adminUsersApi.remove(deleteTarget.id);
      const shouldMoveBack = users.length === 1 && page > 1;
      setDeleteTarget(null);
      setNotice({ type: 'success', message: 'Account deleted successfully.' });
      if (shouldMoveBack) setPage(current => current - 1);
      else reload();
    } catch (error) {
      setDeleteTarget(null);
      setNotice({ type: 'error', message: getApiError(error, ui("Unable to delete this account.")) });
    } finally {
      setBusy(false);
    }
  };

  const viewDetails = async user => {
    if (detailLoadingId) return;
    setDetailLoadingId(user.id);
    try {
      setDetail(await adminUsersApi.detail(user.id));
    } catch (error) {
      setNotice({ type: 'error', message: getApiError(error, ui("Unable to load account details.")) });
    } finally {
      setDetailLoadingId('');
    }
  };

  const actions = user => {
    const deleteLocked = user.role === 'ADMIN';
    return <div className={styles.actions}>
      <button disabled={detailLoadingId === user.id} title={ui("View details")} aria-label={ui("View {{value0}}", {value0:(user.fullName)})} onClick={() => viewDetails(user)}>
        {detailLoadingId === user.id ? <LoaderCircle className={styles.spin} /> : <Eye />}
      </button>
      <button disabled={deleteLocked} title={deleteLocked ? ui("Admin accounts cannot be deleted") : ui("Delete")} aria-label={deleteLocked ? ui("Cannot delete {{value0}}", {value0:(user.fullName)}) : ui("Delete {{value0}}", {value0:(user.fullName)})} onClick={() => setDeleteTarget(user)}><Trash2 /></button>
    </div>;
  };

  const detailRows = detail ? [
    ['Full name', detail.fullName],
    ['Email', detail.email],
    ['Role', roleLabel(detail.role)],
    ['Status', statusLabel(detail.status)],
    ['Phone', detail.phone || 'Not provided'],
    ['Time zone', detail.timezone || 'Not provided'],
    ['Email verified', detail.emailVerifiedAt ? displayDate(detail.emailVerifiedAt) : 'Not verified'],
    ['Last login', displayDate(detail.lastLoginAt)],
    ['Date added', displayDate(detail.createdAt)],
  ] : [];

  return <div className={styles.page}>
    <AdminToast message={notice?.message} type={notice?.type} onClose={() => setNotice(null)} />
    {detail && <Modal title={ui("Account details")} onClose={() => setDetail(null)}><dl>{detailRows.map(([label, value]) => <div key={label}><dt>{ui(label)}</dt><dd>{value}</dd></div>)}</dl></Modal>}
    <AdminConfirmDialog open={Boolean(deleteTarget)} title={ui("Delete this account?")} message={deleteTarget ? `“${deleteTarget.fullName}” will lose access to AptiMate. Their related test data will be retained.` : ''} confirmLabel={busy ? ui("Deleting…") : ui("Delete")} onCancel={() => { if (!busy) setDeleteTarget(null); }} onConfirm={remove} />

    <header className={styles.toolbar}>
      <nav className={styles.components} aria-label={ui("Account type")}>{ROLE_TABS.map(item => <button className={role === item.id ? styles.activeComponent : ''} onClick={() => changeRole(item.id)} key={item.id}>{ui(item.label)}</button>)}</nav>
      <div className={styles.tools}><label><Search /><input value={query} onChange={event => setUrlState({ query: event.target.value, page: 1 })} placeholder={ui("Search people")} /></label></div>
    </header>

    <section className={styles.panel} aria-busy={loading}>
      <header><div><h2>{ui("Team members")}</h2><span>{pagination.totalItems} {pagination.totalItems === 1 ? ui("account") : ui("accounts")}</span></div></header>
      <div className={styles.tableWrap}><table><thead><tr><th>{ui("Name")}</th><th className={styles.alignRight}>{ui("Status")}</th><th className={styles.alignRight}>{ui("Date Added")}</th><th className={styles.actionColumn}>{ui("Actions")}</th></tr></thead><tbody>
        {users.map(user => <tr key={user.id}><td><div className={styles.person}><Avatar name={user.fullName} /><span><b>{user.fullName}</b><small>{user.email}</small></span></div></td><td className={styles.alignRight}><span className={`${styles.status} ${user.status === 'ACTIVE' ? styles.activeStatus : ''}`}>{statusLabel(user.status)}</span></td><td className={styles.alignRight}>{displayDate(user.createdAt)}</td><td className={styles.actionColumn}>{actions(user)}</td></tr>)}
      </tbody></table></div>
      <div className={styles.mobileList}>{users.map(user => <article key={user.id}><header><div className={styles.person}><Avatar name={user.fullName} /><span><b>{user.fullName}</b><small>{user.email}</small></span></div><span className={`${styles.status} ${user.status === 'ACTIVE' ? styles.activeStatus : ''}`}>{statusLabel(user.status)}</span></header><dl><div><dt>{ui("Date Added")}</dt><dd>{displayDate(user.createdAt)}</dd></div><div><dt>{ui("Role")}</dt><dd>{roleLabel(user.role)}</dd></div></dl>{actions(user)}</article>)}</div>
      {loading && <PageLoader />}
      {!loading && !users.length && <div className={styles.empty}><p>{loadError ? ui("Accounts could not be loaded.") : ui("No accounts found.")}</p>{loadError && <button type="button" onClick={reload}>{ui("Try again")}</button>}</div>}
      <Pagination page={page} totalItems={pagination.totalItems} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </section>
  </div>;
}
