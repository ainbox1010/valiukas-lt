export default function SecurityPage() {
  return (
    <div className="section">
      <h2>Security</h2>
      <div className="card">
        <div className="list">
          <div>HTTPS everywhere with restricted CORS.</div>
          <div>No secrets or API keys in the frontend bundle.</div>
          <div>No API keys in logs, error traces, or analytics.</div>
          <div>Rate limiting enforced server-side.</div>
        </div>
      </div>
    </div>
  );
}
