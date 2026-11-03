import { crearCrud, crearRouter } from "../controllers/crud.factory.js";
import { validarSocio } from "../middlewares/validaciones.js";

export default crearRouter(
  crearCrud("socios", "id_socio", ["nombre", "dni", "correo", "telefono"]),
  validarSocio
);