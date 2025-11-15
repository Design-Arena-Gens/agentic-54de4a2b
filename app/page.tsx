import CampaignAgent from '@/components/CampaignAgent';

export default function Page() {
  return (
    <div className="container">
      <div className="card">
        <div className="badge">Agent ? Web Campaign</div>
        <h1 className="h1">Campaign Agent</h1>
        <p className="sub">Plan a web campaign, generate on-brand assets, schedule posts, and export deliverables.</p>
        <CampaignAgent />
      </div>
    </div>
  );
}
