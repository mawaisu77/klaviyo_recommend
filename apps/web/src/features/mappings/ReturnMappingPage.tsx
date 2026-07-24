import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { endpoints } from "../../api/endpoints";
import { useToast } from "../../components/ui/toast";

const CATEGORIES = [
  "SIZE_ISSUE",
  "PREFERENCE_ISSUE",
  "PRODUCT_PROBLEM",
  "EXPECTATION_PROBLEM",
  "CUSTOMER_CHANGED_MIND",
  "OTHER",
];

export function ReturnMappingPage() {
  const qc = useQueryClient();
  const { notify } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["mappings"],
    queryFn: endpoints.mappings,
  });

  const [sourceReason, setSourceReason] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const update = useMutation({
    mutationFn: (v: { id: string; marketingCategory?: string; isActive?: boolean }) =>
      endpoints.updateMapping(v.id, {
        marketingCategory: v.marketingCategory,
        isActive: v.isActive,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mappings"] });
    },
  });

  const create = useMutation({
    mutationFn: () =>
      endpoints.createMapping({ sourceReason, marketingCategory: category }),
    onSuccess: () => {
      setSourceReason("");
      notify("Mapping added");
      void qc.invalidateQueries({ queryKey: ["mappings"] });
    },
    onError: (err) => notify(err instanceof Error ? err.message : "Failed", "error"),
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Return reason mapping</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label>Shopify reason</label>
            <input
              className="input"
              placeholder="e.g. TOO_SMALL"
              value={sourceReason}
              onChange={(e) => setSourceReason(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Marketing category</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn"
            disabled={!sourceReason || create.isPending}
            onClick={() => create.mutate()}
          >
            Add
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="muted">Loading...</p>
      ) : !data || data.length === 0 ? (
        <div className="empty">No mappings yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Shopify reason</th>
              <th>Marketing category</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id}>
                <td>{m.sourceReason}</td>
                <td>
                  <select
                    className="input"
                    value={m.marketingCategory}
                    onChange={(e) =>
                      update.mutate({ id: m.id, marketingCategory: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={m.isActive}
                    onChange={(e) => update.mutate({ id: m.id, isActive: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
