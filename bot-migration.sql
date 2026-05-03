-- DigitalMint — Bot Multiagéntico: Migración de base de datos
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- 1. Tabla de inventario del bot (productos activados para vender)
CREATE TABLE IF NOT EXISTS inventario_bot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  precio_venta    NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_tachado  NUMERIC(10,2),
  enlace_entrega  TEXT,
  multimedia_urls TEXT[] NOT NULL DEFAULT '{}',
  prueba_social   TEXT,
  escasez_texto   TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true,
  leads           INTEGER NOT NULL DEFAULT 0,
  conversiones    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Extender bot_conversations con máquina de estados
ALTER TABLE bot_conversations
  ADD COLUMN IF NOT EXISTS nombre_cliente   TEXT,
  ADD COLUMN IF NOT EXISTS estado           TEXT NOT NULL DEFAULT 'nuevo',
  ADD COLUMN IF NOT EXISTS agente_actual    TEXT NOT NULL DEFAULT 'ventas',
  ADD COLUMN IF NOT EXISTS inventario_id    UUID REFERENCES inventario_bot(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pausado          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultimo_mensaje_at TIMESTAMPTZ DEFAULT now();

-- 3. Tabla de pagos pendientes de confirmación
CREATE TABLE IF NOT EXISTS pagos_pendientes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id  UUID NOT NULL REFERENCES bot_conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL,
  inventario_id    UUID REFERENCES inventario_bot(id) ON DELETE SET NULL,
  monto            NUMERIC(10,2),
  metodo           TEXT,
  numero_operacion TEXT,
  comprobante_url  TEXT,
  estado           TEXT NOT NULL DEFAULT 'pendiente',
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Datos de pago y nombre del bot en user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS yape_numero  TEXT,
  ADD COLUMN IF NOT EXISTS plin_numero  TEXT,
  ADD COLUMN IF NOT EXISTS bcp_cuenta   TEXT,
  ADD COLUMN IF NOT EXISTS bcp_titular  TEXT,
  ADD COLUMN IF NOT EXISTS bot_nombre   TEXT DEFAULT 'Asistente';

-- 5. RLS
ALTER TABLE inventario_bot   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_pendientes  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventario_bot_own"  ON inventario_bot;
DROP POLICY IF EXISTS "pagos_pendientes_own" ON pagos_pendientes;

CREATE POLICY "inventario_bot_own"  ON inventario_bot  USING (user_id = auth.uid());
CREATE POLICY "pagos_pendientes_own" ON pagos_pendientes USING (user_id = auth.uid());

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_inventario_bot_user    ON inventario_bot(user_id);
CREATE INDEX IF NOT EXISTS idx_inventario_bot_product ON inventario_bot(product_id);
CREATE INDEX IF NOT EXISTS idx_pagos_user             ON pagos_pendientes(user_id, estado);
CREATE INDEX IF NOT EXISTS idx_conv_phone             ON bot_conversations(user_id, cliente_phone);
