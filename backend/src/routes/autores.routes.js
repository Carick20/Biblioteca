import { crearCrud, crearRouter } from "../controllers/crud.factory.js";
import { validarNombre } from "../middlewares/validaciones.js";

export default crearRouter(
  crearCrud("autores", "id_autor", ["nombre", "nacionalidad"]),
  validarNombre
);