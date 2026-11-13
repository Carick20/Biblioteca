import { Router } from "express";
import pool from "../config/db.js";

export const crearCrud = (tabla, idCol, campos) => ({
  listar: async (req, res, next) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${tabla}`);
      res.json(rows);
    } catch (e) { next(e); }
  },
  obtener: async (req, res, next) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${tabla} WHERE ${idCol} = ?`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ mensaje: "No encontrado" });
      res.json(rows[0]);
    } catch (e) { next(e); }
  },
  crear: async (req, res, next) => {
    try {
      const valores = campos.map((c) => req.body[c] ?? null);
      const [r] = await pool.query(
        `INSERT INTO ${tabla} (${campos.join(",")}) VALUES (${campos.map(() => "?").join(",")})`,
        valores
      );
      res.status(201).json({ id: r.insertId, mensaje: "Creado correctamente" });
    } catch (e) { next(e); }
  },
  actualizar: async (req, res, next) => {
    try {
      const valores = campos.map((c) => req.body[c] ?? null);
      const [r] = await pool.query(
        `UPDATE ${tabla} SET ${campos.map((c) => `${c}=?`).join(",")} WHERE ${idCol} = ?`,
        [...valores, req.params.id]
      );
      if (!r.affectedRows) return res.status(404).json({ mensaje: "No encontrado" });
      res.json({ mensaje: "Actualizado correctamente" });
    } catch (e) { next(e); }
  },
  eliminar: async (req, res, next) => {
    try {
      const [r] = await pool.query(`DELETE FROM ${tabla} WHERE ${idCol} = ?`, [req.params.id]);
      if (!r.affectedRows) return res.status(404).json({ mensaje: "No encontrado" });
      res.json({ mensaje: "Eliminado correctamente" });
    } catch (e) { next(e); }
  },
});

export const crearRouter = (crud, validador = (req, res, next) => next()) => {
  const router = Router();
  router.get("/", crud.listar);
  router.get("/:id", crud.obtener);
  router.post("/", validador, crud.crear);
  router.put("/:id", validador, crud.actualizar);
  router.delete("/:id", crud.eliminar);
  return router;
};