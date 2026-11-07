// Isolated presentation fixture. This page is outside the app and is not a production build entry.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import SmartTable from "../src/Components/common/smart-table/SmartTable";
import "../src/index.css";
import "../src/i18n";

export function Fixture() {
  const [dark, setDark] = useState(false);
  const [action, setAction] = useState(0);
  const [count, setCount] = useState(3);
  const [selected, setSelected] = useState(false);
  return <main className={dark ? "dark" : ""} style={{ padding: 24, minHeight: "100vh", background: dark ? "#0f172a" : "#f8fafc", color: dark ? "white" : "#0f172a" }}>
    <h1 style={{ fontSize: 24, fontWeight: 700 }}>Table presentation regression</h1>
    <p>Isolated UI fixture · no business requests · action count: <output>{action}</output></p>
    <div style={{ display: "flex", gap: 16, margin: "16px 0" }}>
      <button type="button" onClick={() => setDark(!dark)}>Theme</button>
      <button type="button" onClick={() => setCount(count === 3 ? 1000 : 3)}>3 / 1000 rows</button>
      <label><input type="checkbox" checked={selected} onChange={e => setSelected(e.target.checked)} />Selection</label>
    </div>
    <div style={{ maxWidth: 900, maxHeight: 600, overflow: "auto", borderRadius: 16 }}>
      <SmartTable tableId="presentation-regression"><table style={{ minWidth: 1100, width: "100%" }}>
        <thead><tr><th data-column-id="a">Column A</th><th data-column-id="b"><button type="button" onClick={() => setAction(a => a + 1)}>Column B</button></th><th data-column-id="c">Column C</th><th data-column-id="action">Amallar</th></tr></thead>
        <tbody>{Array.from({ length: count }, (_, index) => <tr key={`fixture-${index}`} data-state={selected ? "selected" : undefined}><td style={{ padding: 16 }}>A-{index}</td><td style={{ padding: 16 }}>B-{index}</td><td style={{ padding: 16 }}><input aria-label={`Editable ${index}`} defaultValue={`C-${index}`} /></td><td style={{ padding: 16 }}><button type="button" onClick={() => setAction(a => a + 1)}>Action {index}</button></td></tr>)}</tbody>
      </table></SmartTable>
    </div>
  </main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><Fixture /></StrictMode>);
