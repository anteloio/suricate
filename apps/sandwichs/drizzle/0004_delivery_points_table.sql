CREATE TABLE "delivery_points" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "lat" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "lon" DROP NOT NULL;--> statement-breakpoint
-- The point that was hardcoded in src/lib/delivery-points.ts until now (same id: orders refer to it).
INSERT INTO "delivery_points" ("id", "name", "address")
VALUES (
  'ca-saint-laurent-du-var',
  'Crédit Agricole Saint-Laurent-du-Var (à côté d’Intermarché)',
  '380 avenue du Général de Gaulle, 06700 Saint-Laurent-du-Var'
)
ON CONFLICT ("id") DO NOTHING;
