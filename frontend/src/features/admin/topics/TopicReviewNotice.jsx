import { useEffect,useState } from 'react';
import { Link,useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { topicsApi } from './topicsApi';
export default function TopicReviewNotice(){
  const location=useLocation(),{t}=useTranslation();
  const id=/^\/admin\/tests\/[^/]+\/([a-f0-9-]{36})\/edit(?:\/|$)/i.exec(location.pathname)?.[1];
  const [pending,setPending]=useState(null);
  useEffect(()=>{if(!id)return;let active=true;const refresh=()=>topicsApi.tests({testId:id}).then(r=>{if(active)setPending(r.items[0]?.pending??0);}).catch(()=>{if(active)setPending(null);});void refresh();const timer=setInterval(refresh,15000);return()=>{active=false;clearInterval(timer);};},[id]);
  return id&&<p><Link to={`/admin/topic-labels?testId=${id}`}>{t('topics.reviewTitle')}{pending!==null?` (${pending} ${t('topics.pending')})`:''}</Link></p>;
}
