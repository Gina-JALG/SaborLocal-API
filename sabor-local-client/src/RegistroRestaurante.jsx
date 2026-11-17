import { useState } from 'react';
import api from './ApiClient';
import VerificacionCodigo from './VerificacionCodigo';

function RegistroRestaurante({ onRegistroExitoso }) {
  const [formData, setFormData] = useState({
    nombreComercio: '',
    categoria: '',
    direccion: '',
    telefonoComercio: '',
    metodosPago: '',
    nombreDuenio: '',
    correoDuenio: '',
    contrasena: ''
  });

  const [pasoVerificacion, setPasoVerificacion] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleContinuarAVerificacion = (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.correoDuenio) {
      setError("Por favor ingresa un correo electrónico válido.");
      return;
    }
    setPasoVerificacion(true);
  };

  const completarRegistroNegocio = async () => {
    const emailLower = formData.correoDuenio.toLowerCase().trim();

    try {
      // Estructura que coincide exactamente con RegistroRestauranteDto de C#
      const payloadDto = {
        nombreComercio: formData.nombreComercio,
        categoria: formData.categoria || "Comida General",
        direccion: formData.direccion,
        telefonoComercio: formData.telefonoComercio,
        metodosPago: formData.metodosPago || "Efectivo, Transferencia",
        nombreDuenio: formData.nombreDuenio,
        correoDuenio: emailLower,
        contrasena: formData.contrasena
      };

      // Mandamos la solicitud directamente a PostgreSQL a través de la API
      await api.post('/comercios/solicitud', payloadDto);

      alert("🎉 ¡Correo verificado con éxito! Solicitud de negocio enviada al Super Administrador.");
      if (onRegistroExitoso) onRegistroExitoso();

    } catch (err) {
      console.error("Error al registrar el comercio en la API:", err);
      const mensajeError = err.response?.data?.mensaje || err.response?.data || "Hubo un error al registrar el negocio en el servidor.";
      setError(typeof mensajeError === 'string' ? mensajeError : "Error al registrar el negocio.");
      setPasoVerificacion(false); // Regresar al formulario si hubo conflicto (ej. correo duplicado)
    }
  };

  if (pasoVerificacion) {
    return (
      <VerificacionCodigo
        correo={formData.correoDuenio}
        tipoRegistro="Negocio / Restaurante"
        onVerificado={completarRegistroNegocio}
        onCancelar={() => setPasoVerificacion(false)}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto my-10 bg-[#121826] p-8 rounded-3xl shadow-2xl border border-slate-800 text-slate-100">
      <div className="text-center space-y-2 mb-8">
        <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-lg shadow-purple-500/20">
          🏪
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Registro de Restaurante</h2>
        <p className="text-xs text-slate-400 font-medium">
          Integra tu comercio a la red gastronómica de Sabor Local Candelaria
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-2xl text-center text-xs font-semibold mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleContinuarAVerificacion} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre del Comercio</label>
            <input
              type="text"
              name="nombreComercio"
              value={formData.nombreComercio}
              onChange={handleChange}
              required
              placeholder="Ej. Carnitas El Tao Tao"
              className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Categoría (Libre)</label>
            <input
              type="text"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              placeholder="Ej. Carnitas / Antojitos"
              className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">Dirección del Local</label>
          <input
            type="text"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            required
            placeholder="Ej. Calle 8 Guanajuato, Candelaria"
            className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Teléfono del Comercio</label>
            <input
              type="tel"
              name="telefonoComercio"
              value={formData.telefonoComercio}
              onChange={handleChange}
              required
              placeholder="Ej. 982116537"
              className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Métodos de Pago</label>
            <input
              type="text"
              name="metodosPago"
              value={formData.metodosPago}
              onChange={handleChange}
              placeholder="Ej. Efectivo, Transferencia"
              className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
            />
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 mt-2">
          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-4">Credenciales del Dueño</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre del Dueño</label>
              <input
                type="text"
                name="nombreDuenio"
                value={formData.nombreDuenio}
                onChange={handleChange}
                required
                placeholder="Ej. Marcos Antonio"
                className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Correo Electrónico (Para OTP)</label>
                <input
                  type="email"
                  name="correoDuenio"
                  value={formData.correoDuenio}
                  onChange={handleChange}
                  required
                  placeholder="tucorreo@gmail.com"
                  className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  name="contrasena"
                  value={formData.contrasena}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#0b0f19] border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-xl shadow-purple-600/25 transition duration-300 mt-4"
        >
          Enviar Solicitud y Verificar Correo ✉️
        </button>
      </form>
    </div>
  );
}

export default RegistroRestaurante;