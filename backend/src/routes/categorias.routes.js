import { crearCrud, crearRouter } from "../controllers/crud.factory.js";
import { validarNombre } from "../middlewares/validaciones.js";

export default crearRouter(
  crearCrud("categorias", "id_categoria", ["nombre"]),
  validarNombre
);