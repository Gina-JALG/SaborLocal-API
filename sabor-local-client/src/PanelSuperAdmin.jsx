import { useState, useEffect } from 'react';
import api from './ApiClient';

function PanelSuperAdmin() {
  const [comercios, setComercios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastNoti, setToastNoti] = useState(null);

  const cargarComerciosAdmin = async () => {
    try {
      const res = await api.get('/comercios/admin/todos');
      setComercios(res.data);
      setError(null);
    } catch (err) {
      try {
        const resAlt = await api.get('/comercios');
        setComercios(resAlt.data);
      } catch (e) {
        setError("No se pudieron cargar las solicitudes de comercios.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Sincronización automática en tiempo real cada 3 segundos
  useEffect(() => {
    cargarComerciosAdmin();
    const intervalo = setInterval(() => {
      cargarComerciosAdmin();
    }, 3000);
    return () => clearInterval(intervalo);
  }, []);

  const cambiarEstadoComercio = async (id, nuevoEstado) => {
    try {
      await api.put(`/comercios/estado/${id}`, { estado: nuevoEstado });
      setToastNoti(`⚡ Comercio actualizado a: ${nuevoEstado}`);
      setTimeout(() => setToastNoti(null), 3000);
      cargarComerciosAdmin();
    } catch (err) {
      alert("No se pudo actualizar el estado del comercio.");
    }
  };

  const eliminarComercio = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente a '${nombre}'?`)) return;
    try {
      await api.delete(`/comercios/${id}`);
      setToastNoti(`🗑️ Comercio '${nombre}' eliminado.`);
      setTimeout(() => setToastNoti(null), 3000);
      cargarComerciosAdmin();
    } catch (err) {
      alert("No se pudo eliminar el comercio.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative text-slate-100">
      
      {toastNoti && (
        <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce z-50">
          <span>🛡️</span>
          <span className="font-bold">{toastNoti}</span>
        </div>
      )}

      {/* Header Ejecutivo */}
      <div className="bg-gradient-to-r from-purple-950 via-[#121826] to-purple-950 text-white p-8 rounded-3xl shadow-2xl border border-purple-500/20 flex justify-between items-center">
        <div>
          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-3 py-1 rounded-full font-extrabold uppercase tracking-wider">
            Gobernanza Central
          </span>
          <h2 className="text-2xl font-black mt-2">Administración Multi-Tenant de Candelaria</h2>
          <p className="text-xs text-slate-400 mt-0.5">Control manual de estado, validación de solicitudes y suscripciones.</p>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-center text-xs font-semibold">{error}</div>}

      <div className="bg-[#121826] p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-800">
        <h3 className="text-base font-black text-white mb-5 flex items-center gap-2">
          <span>📋</span> Solicitudes y Comercios Registrados
        </h3>

        {loading ? (
          <p className="text-center text-slate-500 py-12 text-xs font-semibold">Cargando registros...</p>
        ) : comercios.length === 0 ? (
          <p className="text-center text-slate-500 py-12 text-xs font-semibold">No hay comercios registrados en el sistema.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b0f19] border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Tenant ID</th>
                  <th className="p-4">Nombre Comercio</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acción Manual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs font-medium">
                {comercios.map((com) => (
                  <tr key={com.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono text-slate-500">rest_{com.id < 10 ? `0${com.id}` : com.id}</td>
                    <td className="p-4 font-extrabold text-white">{com.nombreComercio}</td>
                    <td className="p-4">
                      <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-lg text-xs font-bold">
                        {com.categoria || "Comida General"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">📞 {com.telefonoComercio || com.telefono || "S/N"}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] px-3 py-1 rounded-full font-extrabold ${
                        com.estado === 'APROBADO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        com.estado === 'SUSPENDIDO' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {com.estado || 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {com.estado !== 'APROBADO' && (
                        <button
                          onClick={() => cambiarEstadoComercio(com.id, 'APROBADO')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition"
                        >
                          Aprobar ✓
                        </button>
                      )}

                      {com.estado === 'APROBADO' && (
                        <button
                          onClick={() => cambiarEstadoComercio(com.id, 'SUSPENDIDO')}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition"
                        >
                          Suspender ⚠️
                        </button>
                      )}

                      {com.estado === 'SUSPENDIDO' && (
                        <button
                          onClick={() => cambiarEstadoComercio(com.id, 'APROBADO')}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition"
                        >
                          Reactivar 🔄
                        </button>
                      )}

                      <button
                        onClick={() => eliminarComercio(com.id, com.nombreComercio)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition"
                      >
                        Eliminar ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PanelSuperAdmin;