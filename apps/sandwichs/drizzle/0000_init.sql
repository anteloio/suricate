CREATE TABLE "order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"variant" text,
	"drink_id" integer,
	"drink_name" text,
	"drink_variant" text,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"service_date" text NOT NULL,
	"status" text DEFAULT 'confirmee' NOT NULL,
	"customer_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"address_label" text NOT NULL,
	"address_details" text DEFAULT '' NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"payment_method" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"formula_eligible" boolean DEFAULT false NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_days" (
	"date" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"cutoff_minutes" integer DEFAULT 600 NOT NULL,
	"delivery_window" text DEFAULT '12h – 13h' NOT NULL,
	"min_order_cents" integer DEFAULT 650 NOT NULL,
	"formule_price_cents" integer DEFAULT 650 NOT NULL,
	"zone_label" text DEFAULT 'Sophia Antipolis' NOT NULL,
	"zone_center_lat" double precision DEFAULT 43.615512 NOT NULL,
	"zone_center_lon" double precision DEFAULT 7.054762 NOT NULL,
	"zone_radius_km" double precision DEFAULT 4 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;