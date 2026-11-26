ALTER TABLE "orders" ADD COLUMN "number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_number_unique" UNIQUE("number");--> statement-breakpoint
-- Number the existing orders (all but unpaid ones), per delivery day, in the order they were placed.
UPDATE "orders" AS o SET "number" = replace(n.service_date, '-', '') || '-' || lpad(n.seq::text, 3, '0')
FROM (
  SELECT "id", "service_date", row_number() OVER (PARTITION BY "service_date" ORDER BY "created_at", "id") AS seq
  FROM "orders" WHERE "status" <> 'a_payer'
) AS n
WHERE o."id" = n."id";
