import { useState, useEffect } from 'react';
import api from './ApiClient';

function PanelRestaurante({ comercioId = 1, nombreComercio = "Mi Negocio" }) {
  // CORRECCIÓN ESTRICTA: Si el ID es gigante (> 1000000), se normaliza a 1 de forma segura
  const idReal = (comercioId && typeof comercioId === 'number' && comercioId < 1000000) ? comercioId : 1;

  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [nuevaAlertaPedido, setNuevaAlertaPedido] = useState(false);
  const [ultimoConteoPedidos, setUltimoConteoPedidos] = useState(0);

  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', precio: '', disponible: true });

  const [datosBanco, setDatosBanco] = useState({
    banco: '',
    numeroCuenta: '',
    titular: ''
  });

  useEffect(() => {
    const bancoGuardado = localStorage.getItem(`banco_${idReal}`);
    if (bancoGuardado) {
      setDatosBanco(JSON.parse(bancoGuardado));
    }
  }, [idReal]);

  const guardarDatosBanco = (e) => {
    e.preventDefault();
    localStorage.setItem(`banco_${idReal}`, JSON.stringify(datosBanco));
    setMensaje("🏦 Datos bancarios actualizados correctamente para tus clientes.");
    setTimeout(() => setMensaje(null), 4000);
  };

  const cargarDatosRestaurante = async () => {
    try {
      try {
        const resProd = await api.get(`/productos/comercio/${idReal}`);
        if (resProd.data && resProd.data.length > 0) {
          setProductos(resProd.data);
        } else {
          const resGen = await api.get('/productos');
          setProductos(resGen.data);
        }
      } catch (e) {
        const resGen = await api.get('/productos');
        setProductos(resGen.data);
      }

      const resPedidos = await api.get('/pedidos');
      const listaPedidos = resPedidos.data || [];

      const recibidosActuales = listaPedidos.filter(p => p.estado === 'RECIBIDO' || p.estado === 'PENDIENTE').length;
      if (ultimoConteoPedidos > 0 && recibidosActuales > ultimoConteoPedidos) {
        setNuevaAlertaPedido(true);
        setTimeout(() => setNuevaAlertaPedido(false), 7000);
      }
      setUltimoConteoPedidos(recibidosActuales);
      setPedidos(listaPedidos);
      setError(null);
    } catch (err) {
      console.error("Error al cargar datos del panel:", err);
      setError("No se pudieron cargar los datos del restaurante.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosRestaurante();
    const intervalo = setInterval(cargarDatosRestaurante, 3000);
    return () => clearInterval(intervalo);
  }, [idReal, ultimoConteoPedidos]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        await api.put(`/productos/${editandoId}`, { ...formData, id: editandoId, tenantId: idReal, precio: parseFloat(formData.precio) });
        setMensaje("Platillo actualizado exitosamente.");
        setEditandoId(null);
      } else {
        await api.post('/productos', { ...formData, tenantId: idReal, precio: parseFloat(formData.precio) });
        setMensaje("Platillo agregado al menú.");
      }
      setFormData({ nombre: '', descripcion: '', precio: '', disponible: true });
      cargarDatosRestaurante();
    } catch (err) {
      setError("No se pudo guardar el producto.");
    }
  };

  const iniciarEdicion = (prod) => {
    setEditandoId(prod.id);
    setFormData({ nombre: prod.nombre, descripcion: prod.descripcion || '', precio: prod.precio, disponible: prod.disponible });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setFormData({ nombre: '', descripcion: '', precio: '', disponible: true });
  };

  const handleEliminarProducto = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar '${nombre}' del menú?`)) return;
    try {
      await api.delete(`/productos/${id}`);
      cargarDatosRestaurante();
    } catch (err) {
      setError("No se pudo eliminar el producto.");
    }
  };

  const cambiarEstadoPedido = async (idPedido, nuevoEstado) => {
    try {
      await api.put(`/pedidos/estado/${idPedido}`, { estado: nuevoEstado });
      cargarDatosRestaurante();
    } catch (err) {
      setError("No se pudo actualizar el estado del pedido.");
    }
  };

  const pedidosRecibidos = pedidos.filter(p => p.estado === 'RECIBIDO' || p.estado === 'PENDIENTE');
  const pedidosEnPreparacion = pedidos.filter(p => p.estado === 'EN_PREPARACION' || p.estado === 'PREPARANDO');
  const pedidosHaciaDomicilio = pedidos.filter(p => p.estado === 'HACIA_DOMICILIO');
  const pedidosCompletados = pedidos.filter(p => p.estado === 'COMPLETADO');

  const ventasDelDiaTotal = pedidosCompletados.reduce((acc, p) => acc + (p.total || 0), 0);

  const productosVendidosMap = {};
  pedidosCompletados.forEach(pedido => {
    pedido.detalles?.forEach(det => {
      if (!productosVendidosMap[det.nombreProducto]) {
        productosVendidosMap[det.nombreProducto] = { cantidad: 0, totalVendido: 0 };
      }
      productosVendidosMap[det.nombreProducto].cantidad += det.cantidad;
      productosVendidosMap[det.nombreProducto].totalVendido += (det.precio * det.cantidad);
    });
  });

  const listaProductosVendidos = Object.keys(productosVendidosMap).map(nombre => ({
    nombre,
    cantidad: productosVendidosMap[nombre].cantidad,
    totalVendido: productosVendidosMap[nombre].totalVendido
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative text-slate-100">

      {nuevaAlertaPedido && (
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce border border-white/20 z-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-extrabold text-sm">¡Nuevo Pedido Entrante!</p>
              <p className="text-xs text-orange-100">Un cliente acaba de enviar una orden a tu establecimiento.</p>
            </div>
          </div>
          <span className="bg-white text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            ¡Revisa la columna de Recibidos!
          </span>
        </div>
      )}

      {/* Header Panel Restaurante */}
      <div className="bg-gradient-to-r from-purple-950 via-[#121826] to-purple-950 text-white p-8 rounded-3xl shadow-2xl border border-purple-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-3 py-1 rounded-full font-extrabold uppercase tracking-wider">
            Gestión de Operaciones
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">👨‍🍳 {nombreComercio}</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Gestión de comandas en tiempo real y control de caja.</p>
        </div>
        <div className="bg-[#0b0f19] border border-slate-800 px-6 py-4 rounded-2xl text-center w-full sm:w-auto shadow-inner">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider">💰 Ventas del Día</p>
          <p className="text-2xl font-black text-white mt-0.5">${ventasDelDiaTotal.toFixed(2)} <span className="text-xs font-semibold text-slate-400">MXN</span></p>
          <p className="text-[11px] text-slate-500 font-medium">{pedidosCompletados.length} órdenes completadas</p>
        </div>
      </div>

      {mensaje && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-2xl text-center text-xs font-semibold">{mensaje}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-2xl text-xs font-semibold">{error}</div>}

      {/* CONFIGURACIÓN DE DATOS BANCARIOS */}
      <div className="bg-[#121826] p-8 rounded-3xl shadow-2xl border border-slate-800">
        <h3 className="text-base font-black text-white mb-2">🏦 Configuración de Cuenta para Transferencias</h3>
        <p className="text-xs text-slate-400 mb-5">Estos datos se mostrarán automáticamente a los clientes cuando elijan pagar por transferencia.</p>
        <form onSubmit={guardarDatosBanco} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Banco</label>
              <input type="text" value={datosBanco.banco} onChange={(e) => setDatosBanco({ ...datosBanco, banco: e.target.value })} placeholder="Ej. Banco Azteca / BBVA" required className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Número de Tarjeta / CLABE</label>
              <input type="text" value={datosBanco.numeroCuenta} onChange={(e) => setDatosBanco({ ...datosBanco, numeroCuenta: e.target.value })} placeholder="Ej. 4152 3100..." required className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre del Titular</label>
              <input type="text" value={datosBanco.titular} onChange={(e) => setDatosBanco({ ...datosBanco, titular: e.target.value })} placeholder="Ej. Marcos Lopez" required className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium" />
            </div>
          </div>
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-lg transition">Guardar Datos Bancarios 💾</button>
        </form>
      </div>

      {/* Tablero Kanban */}
      <div className="bg-[#121826] p-8 rounded-3xl shadow-2xl border border-slate-800 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h3 className="text-base font-black text-white flex items-center gap-2"><span>⏱️</span> Comandas y Pedidos en Tiempo Real</h3>
          <button onClick={cargarDatosRestaurante} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl font-bold transition border border-slate-700 shadow-sm">🔄 Actualizar Tablero</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Recibidos */}
          <div className="bg-[#0b0f19] p-5 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="font-extrabold text-amber-400 text-xs">🟡 Recibidos</span>
              <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">{pedidosRecibidos.length}</span>
            </div>

            {pedidosRecibidos.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10 font-medium">Sin pedidos en este estado</p>
            ) : (
              pedidosRecibidos.map(ped => {
                const imagenComprobante = ped.comprobanteUrl || ped.comprobante || ped.imagenComprobante || ped.voucher || ped.urlComprobante;

                return (
                  <div key={ped.id} className="bg-[#121826] p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs text-white">ORD-{ped.id}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{new Date(ped.fechaCreacion || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <p className="font-bold text-slate-200">{ped.clienteNombre}</p>
                      <p className="text-slate-400 font-medium">📞 {ped.telefonoCliente}</p>
                      <p className="text-orange-400 font-semibold">📍 {ped.direccionCliente || "Sin dirección"}</p>
                    </div>
                    <div className="bg-[#0b0f19] p-2.5 rounded-xl text-xs space-y-1 border border-slate-800 font-medium text-slate-300">
                      {ped.detalles?.map((d, i) => <div key={i}>• {d.cantidad}x {d.nombreProducto}</div>)}
                    </div>

                    {imagenComprobante ? (
                      <div className="bg-purple-950/40 p-3 rounded-xl border border-purple-500/40 text-center space-y-2">
                        <p className="text-[11px] font-extrabold text-purple-300">📎 Comprobante de Pago:</p>
                        <a href={imagenComprobante} target="_blank" rel="noopener noreferrer" className="block group">
                          <img 
                            src={imagenComprobante.startsWith('data:') || imagenComprobante.startsWith('http') || imagenComprobante.startsWith('/') ? imagenComprobante : `data:image/png;base64,${imagenComprobante}`} 
                            alt="Comprobante" 
                            className="w-full h-36 object-cover rounded-lg border border-purple-500/60 group-hover:scale-105 transition shadow-lg bg-black" 
                          />
                          <span className="text-[10px] text-purple-400 underline font-semibold mt-1 block">🔍 Clic para ver imagen completa</span>
                        </a>
                      </div>
                    ) : (
                      ped.metodoPago === 'Transferencia Bancaria' && (
                        <div className="bg-purple-950/20 border border-purple-500/30 text-purple-300 p-2.5 rounded-xl text-[11px] text-center font-bold space-y-1">
                          <p>🏦 Pago por Transferencia Seleccionado</p>
                          <p className="text-[10px] text-slate-400 font-normal">Revisa la aplicación de tu banco para confirmar el depósito del cliente.</p>
                        </div>
                      )
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                      <span className="text-slate-400 font-medium">Pago: {ped.metodoPago}</span>
                      <span className="font-black text-orange-400">${ped.total?.toFixed(2)}</span>
                    </div>
                    <button onClick={() => cambiarEstadoPedido(ped.id, 'EN_PREPARACION')} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
                      Preparar → (Notificar al Cliente)
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* En Preparación */}
          <div className="bg-[#0b0f19] p-5 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="font-extrabold text-blue-400 text-xs">🔵 En Preparación</span>
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold">{pedidosEnPreparacion.length}</span>
            </div>

            {pedidosEnPreparacion.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10 font-medium">Sin pedidos en este estado</p>
            ) : (
              pedidosEnPreparacion.map(ped => (
                <div key={ped.id} className="bg-[#121826] p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-xs text-white">ORD-{ped.id}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{new Date(ped.fechaCreacion || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-slate-200">{ped.clienteNombre}</p>
                    <p className="text-slate-400 font-medium">📞 {ped.telefonoCliente}</p>
                    <p className="text-orange-400 font-semibold">📍 {ped.direccionCliente || "Sin dirección"}</p>
                  </div>
                  <div className="bg-[#0b0f19] p-2.5 rounded-xl text-xs space-y-1 border border-slate-800 font-medium text-slate-300">
                    {ped.detalles?.map((d, i) => <div key={i}>• {d.cantidad}x {d.nombreProducto}</div>)}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                    <span className="text-slate-400 font-medium">Pago: {ped.metodoPago}</span>
                    <span className="font-black text-orange-400">${ped.total?.toFixed(2)}</span>
                  </div>
                  <button onClick={() => cambiarEstadoPedido(ped.id, 'HACIA_DOMICILIO')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
                    Enviar a Domicilio → (Notificar al Cliente)
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Hacia el Domicilio */}
          <div className="bg-[#0b0f19] p-5 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="font-extrabold text-emerald-400 text-xs">🟢 Hacia el Domicilio</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold">{pedidosHaciaDomicilio.length}</span>
            </div>

            {pedidosHaciaDomicilio.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10 font-medium">Sin pedidos en este estado</p>
            ) : (
              pedidosHaciaDomicilio.map(ped => (
                <div key={ped.id} className="bg-[#121826] p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-xs text-white">ORD-{ped.id}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{new Date(ped.fechaCreacion || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-slate-200">{ped.clienteNombre}</p>
                    <p className="text-slate-400 font-medium">📞 {ped.telefonoCliente}</p>
                    <p className="text-orange-400 font-semibold">📍 {ped.direccionCliente || "Sin dirección"}</p>
                  </div>
                  <div className="bg-[#0b0f19] p-2.5 rounded-xl text-xs space-y-1 border border-slate-800 font-medium text-slate-300">
                    {ped.detalles?.map((d, i) => <div key={i}>• {d.cantidad}x {d.nombreProducto}</div>)}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                    <span className="text-slate-400 font-medium">Pago: {ped.metodoPago}</span>
                    <span className="font-black text-orange-400">${ped.total?.toFixed(2)}</span>
                  </div>
                  <button onClick={() => cambiarEstadoPedido(ped.id, 'COMPLETADO')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
                    Completar / Entregado ✅
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Historial de Ventas */}
      <div className="bg-[#121826] p-8 rounded-3xl shadow-2xl border border-slate-800 space-y-4">
        <h3 className="text-base font-black text-white flex items-center gap-2"><span>📊</span> Desglose de Ventas del Día por Producto</h3>
        {listaProductosVendidos.length === 0 ? (
          <div className="bg-[#0b0f19] p-10 rounded-2xl text-center border border-dashed border-slate-800">
            <p className="text-xs text-slate-500 font-medium">Aún no hay ventas completadas hoy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b0f19] border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Producto / Platillo</th>
                  <th className="p-4 text-center">Cantidad Vendida</th>
                  <th className="p-4 text-right">Total Generado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs font-medium">
                {listaProductosVendidos.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-bold text-white">🍔 {item.nombre}</td>
                    <td className="p-4 text-center font-bold text-blue-400">{item.cantidad} pzas</td>
                    <td className="p-4 text-right font-black text-orange-400">${item.totalVendido.toFixed(2)} MXN</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulario Crear Platillo */}
      <div className="bg-[#121826] p-8 rounded-3xl shadow-2xl border border-slate-800">
        <h3 className="text-base font-black text-white mb-5">{editandoId ? "✏️ Editar Platillo" : "➕ Registrar Nuevo Platillo al Menú"}</h3>
        <form onSubmit={handleGuardarProducto} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre del Platillo</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Precio ($ MXN)</label>
              <input type="number" step="0.50" name="precio" value={formData.precio} onChange={handleInputChange} required className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition font-medium" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Descripción</label>
            <input type="text" name="descripcion" value={formData.descripcion} onChange={handleInputChange} className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition font-medium" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-lg shadow-orange-600/30 transition">{editandoId ? "Actualizar Platillo" : "Guardar en el Menú"}</button>
            {editandoId && <button type="button" onClick={cancelarEdicion} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-3.5 rounded-2xl text-xs font-bold transition">Cancelar</button>}
          </div>
        </form>
      </div>

      {/* Menú Publicado */}
      <div className="bg-[#121826] p-8 rounded-3xl shadow-2xl border border-slate-800">
        <h3 className="text-base font-black text-white mb-5">📜 Menú Publicado Actual</h3>
        {productos.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-xs font-medium">No hay platillos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {productos.map(prod => (
              <div key={prod.id} className="p-5 rounded-2xl border border-slate-800 bg-[#0b0f19] flex justify-between items-start shadow-sm">
                <div>
                  <h4 className="font-extrabold text-white text-sm">{prod.nombre}</h4>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{prod.descripcion}</p>
                  <p className="text-xs font-black text-orange-400 mt-2">${prod.precio.toFixed(2)} MXN</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => iniciarEdicion(prod)} className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition shadow-sm text-sm" title="Editar">✏️</button>
                  <button onClick={() => handleEliminarProducto(prod.id, prod.nombre)} className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl hover:bg-red-950/50 transition shadow-sm text-sm" title="Eliminar">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default PanelRestaurante;