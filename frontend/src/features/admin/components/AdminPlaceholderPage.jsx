import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import PageHeader from './PageHeader';
export default function AdminPlaceholderPage({ title }) {
  const ui = useUiTranslation(); return <div><PageHeader title={title} description="This module will be connected in the next administration phase." /><div style={{ padding: 28, border: '1px solid #e5e5e5', borderRadius: 12, background: '#fff', color: '#777' }}>{ui("The reusable Admin layout is ready for this module.")}</div></div>; }
