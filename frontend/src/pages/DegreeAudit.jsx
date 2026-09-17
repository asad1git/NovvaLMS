import { useEffect, useState } from "react";
import { getMyDegreeAudit } from "../api/degreeAudit";
import DegreeAuditView from "../components/DegreeAuditView";
import { Card, LoadingState } from "../components/ui";

export default function DegreeAudit() {
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyDegreeAudit()
      .then(setAudit)
      .catch((err) => setError(err.response?.data?.message || "Failed to load degree audit"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading degree audit…" />;
  if (error) return <Card variant="danger"><p className="text-xs text-badge-red-text">{error}</p></Card>;

  return <DegreeAuditView audit={audit} />;
}
