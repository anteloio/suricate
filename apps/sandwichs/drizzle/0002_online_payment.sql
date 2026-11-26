ALTER TABLE "orders" ADD COLUMN "sumup_checkout_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_sumup_checkout_id_unique" UNIQUE("sumup_checkout_id");