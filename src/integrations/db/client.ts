/**
 * Cliente de dados do sistema.
 *
 * - Preview/publicação na Lovable: usa o banco na nuvem (comportamento atual).
 * - Hostinger (Node + MySQL): defina VITE_DATA_BACKEND=mysql no build e o
 *   sistema passa a falar com o MySQL pela ponte em /api/db, /api/auth e
 *   /api/storage — as telas continuam iguais.
 */
import { supabase as supabaseCloud } from "@/integrations/supabase/client";
import { mysqlBridge } from "./mysql-bridge";

export const usandoMysql = import.meta.env["VITE_DATA_BACKEND"] === "mysql";

export const supabase = (usandoMysql
  ? (mysqlBridge as unknown as typeof supabaseCloud)
  : supabaseCloud) as typeof supabaseCloud;

export const db = supabase;
