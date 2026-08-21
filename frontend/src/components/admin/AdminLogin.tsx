import { useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { adminLogin } from "../../api/endpoints";
import { useAdmin } from "../../state/AdminContext";
import { TextField } from "../ui/Fields";

export function AdminLogin() {
  const { login } = useAdmin();
  const req = useAsync(adminLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const enviar = async (): Promise<void> => {
    const res = await req.run(username, password);
    if (res) login(res.token, res.admin.username, res.admin.role);
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Panel VITELSA</h1>
      <p className="lead">Acceso restringido al equipo de VITELSA.</p>

      <TextField label="Usuario" value={username} onChange={setUsername} />
      <div className="field">
        <label>Contraseña</label>
        <input
          type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void enviar(); }}
        />
      </div>

      {req.error && <div className="error-box" style={{ marginBottom: 12 }}>{req.error}</div>}

      <button type="button" className="btn btn-primary" disabled={req.loading || !username || !password} onClick={() => void enviar()}>
        {req.loading ? "Ingresando…" : "Ingresar"}
      </button>
    </div>
  );
}
