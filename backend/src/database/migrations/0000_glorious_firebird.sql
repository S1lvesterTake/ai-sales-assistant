CREATE TYPE "public"."chat_message_role" AS ENUM('customer', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."chat_processing_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'closed', 'lost');--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(100) NOT NULL,
	"business_name" varchar(150) NOT NULL,
	"description" text,
	"category" varchar(100),
	"whatsapp_number" varchar(30) NOT NULL,
	"location" text,
	"operating_hours" varchar(255),
	"main_offer" text,
	"cta_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_profiles_slug_format_check" CHECK ("business_profiles"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "business_profiles_whatsapp_format_check" CHECK ("business_profiles"."whatsapp_number" ~ '^62[0-9]{8,13}$')
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_session_id" uuid NOT NULL,
	"client_message_id" uuid,
	"reply_to_message_id" uuid,
	"processing_status" "chat_processing_status",
	"processing_started_at" timestamp with time zone,
	"role" "chat_message_role" NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_id_session_unique" UNIQUE("id","chat_session_id"),
	CONSTRAINT "chat_messages_customer_fields_check" CHECK ("chat_messages"."role" <> 'customer' OR ("chat_messages"."client_message_id" IS NOT NULL AND "chat_messages"."processing_status" IS NOT NULL AND "chat_messages"."reply_to_message_id" IS NULL)),
	CONSTRAINT "chat_messages_assistant_reply_check" CHECK ("chat_messages"."role" <> 'assistant' OR ("chat_messages"."reply_to_message_id" IS NOT NULL AND "chat_messages"."client_message_id" IS NULL AND "chat_messages"."processing_status" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_profile_id" uuid NOT NULL,
	"access_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"customer_name" varchar(100),
	"customer_phone" varchar(30),
	"source" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_sessions_customer_phone_format_check" CHECK ("chat_sessions"."customer_phone" IS NULL OR "chat_sessions"."customer_phone" ~ '^62[0-9]{8,13}$')
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(100),
	"message" text NOT NULL,
	"stack" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_profile_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_profile_id" uuid NOT NULL,
	"chat_session_id" uuid,
	"name" varchar(100),
	"phone" varchar(30) NOT NULL,
	"interest_summary" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"source" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_phone_format_check" CHECK ("leads"."phone" ~ '^62[0-9]{8,13}$')
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_profile_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"category" varchar(100),
	"is_available" boolean DEFAULT true NOT NULL,
	"ordering_instruction" text,
	"additional_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_nonnegative_check" CHECK ("products"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_click_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_profile_id" uuid NOT NULL,
	"chat_session_id" uuid,
	"lead_id" uuid,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_same_session_fk" FOREIGN KEY ("reply_to_message_id","chat_session_id") REFERENCES "public"."chat_messages"("id","chat_session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_business_profile_id_business_profiles_id_fk" FOREIGN KEY ("business_profile_id") REFERENCES "public"."business_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_business_profile_id_business_profiles_id_fk" FOREIGN KEY ("business_profile_id") REFERENCES "public"."business_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_profile_id_business_profiles_id_fk" FOREIGN KEY ("business_profile_id") REFERENCES "public"."business_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_profile_id_business_profiles_id_fk" FOREIGN KEY ("business_profile_id") REFERENCES "public"."business_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_click_events" ADD CONSTRAINT "whatsapp_click_events_business_profile_id_business_profiles_id_fk" FOREIGN KEY ("business_profile_id") REFERENCES "public"."business_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_click_events" ADD CONSTRAINT "whatsapp_click_events_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_click_events" ADD CONSTRAINT "whatsapp_click_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_profiles_user_id_unique" ON "business_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_profiles_slug_unique" ON "business_profiles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_session_client_message_unique" ON "chat_messages" USING btree ("chat_session_id","client_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_reply_to_unique" ON "chat_messages" USING btree ("reply_to_message_id") WHERE "chat_messages"."reply_to_message_id" is not null;--> statement-breakpoint
CREATE INDEX "chat_messages_session_created_id_idx" ON "chat_messages" USING btree ("chat_session_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_sessions_id_business_unique" ON "chat_sessions" USING btree ("id","business_profile_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_business_created_id_idx" ON "chat_sessions" USING btree ("business_profile_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "faqs_business_active_created_id_idx" ON "faqs" USING btree ("business_profile_id","is_active","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "leads_business_phone_unique" ON "leads" USING btree ("business_profile_id","phone");--> statement-breakpoint
CREATE INDEX "leads_business_status_created_id_idx" ON "leads" USING btree ("business_profile_id","status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leads_business_created_id_idx" ON "leads" USING btree ("business_profile_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "products_business_available_created_id_idx" ON "products" USING btree ("business_profile_id","is_available","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "products_business_category_created_id_idx" ON "products" USING btree ("business_profile_id","category","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "whatsapp_events_business_clicked_id_idx" ON "whatsapp_click_events" USING btree ("business_profile_id","clicked_at" DESC NULLS LAST,"id" DESC NULLS LAST);