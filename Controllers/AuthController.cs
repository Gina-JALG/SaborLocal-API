using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaborLocal.API.Data;
using SaborLocal.API.Models;
using System.Text;
using System.Text.Json;

namespace SaborLocalAPI.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private static readonly Dictionary<string, string> CodigosTemp = new();
        private static readonly HttpClient httpClient = new HttpClient();

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("enviar-codigo")]
        public async Task<IActionResult> EnviarCodigo([FromBody] EmailDto model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.Correo))
                return BadRequest(new { error = "El correo es obligatorio." });

            try
            {
                string codigo = new Random().Next(100000, 999999).ToString();
                string emailLimpio = model.Correo.ToLower().Trim();
                CodigosTemp[emailLimpio] = codigo;

                // Leemos la API Key de forma segura desde la configuración del proyecto
                string apiKey = _configuration["BrevoApiKey"] ?? "";
                if (string.IsNullOrEmpty(apiKey))
                {
                    return StatusCode(500, new { error = "La API Key de Brevo no está configurada en el servidor." });
                }

                var payload = new
                {
                    sender = new { name = "Sabor Local", email = "982116537alopez@gmail.com" },
                    to = new[] { new { email = emailLimpio } },
                    subject = $"Tu codigo de verificacion es {codigo}",
                    htmlContent = $"<html><body><h3>Hola</h3><p>Tu codigo de verificacion de Sabor Local es: <b>{codigo}</b></p></body></html>"
                };

                string jsonContent = JsonSerializer.Serialize(payload);

                using (var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email"))
                {
                    requestMessage.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                    requestMessage.Headers.Add("api-key", apiKey);
                    requestMessage.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

                    HttpResponseMessage response = await httpClient.SendAsync(requestMessage);

                    if (response.IsSuccessStatusCode)
                    {
                        return Ok(new { mensaje = "Código enviado con éxito a tu correo." });
                    }
                    else
                    {
                        string errorResponse = await response.Content.ReadAsStringAsync();
                        return StatusCode(500, new { error = "No se pudo enviar el correo: " + errorResponse });
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Error de servidor: " + ex.Message });
            }
        }

        [HttpPost("verificar-codigo")]
        public IActionResult VerificarCodigo([FromBody] VerificacionDto model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.Correo) || string.IsNullOrWhiteSpace(model.Codigo))
                return BadRequest(new { error = "Datos incompletos." });

            string emailLimpio = model.Correo.ToLower().Trim();

            if (CodigosTemp.TryGetValue(emailLimpio, out var codigoGuardado))
            {
                if (codigoGuardado == model.Codigo.Trim())
                {
                    CodigosTemp.Remove(emailLimpio);
                    return Ok(new { verificado = true, mensaje = "Correo verificado correctamente." });
                }
            }
            return BadRequest(new { error = "El código es incorrecto o ya expiró." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.Correo) || string.IsNullOrWhiteSpace(model.Contrasena))
                return BadRequest(new { error = "Correo y contraseña requeridos." });

            string emailLimpio = model.Correo.ToLower().Trim();

            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Correo == emailLimpio);
            if (usuario != null)
            {
                if (usuario.ContrasenaHash != model.Contrasena)
                {
                    return Unauthorized(new { error = "Contraseña incorrecta." });
                }
                return Ok(new { token = "jwt-token-valido", usuario = new { rol = usuario.Rol, nombre = usuario.Nombre, correo = usuario.Correo, comercioId = usuario.ComercioId } });
            }

            return Unauthorized(new { error = "Usuario no encontrado." });
        }
    }

    public class EmailDto { public string Correo { get; set; } = string.Empty; }
    public class VerificacionDto { public string Correo { get; set; } = string.Empty; public string Codigo { get; set; } = string.Empty; }
    public class LoginDto { public string Correo { get; set; } = string.Empty; public string Contrasena { get; set; } = string.Empty; }
}