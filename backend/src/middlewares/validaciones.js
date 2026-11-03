export const validarNombre = (req, res, next) => {
  if (!req.body.nombre?.trim())
    return res.status(400).json({ errores: ["El nombre es obligatorio"] });
  next();
};