ALTER TABLE "deal_events" DROP CONSTRAINT "deal_events_actor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "verification_records" ADD COLUMN "evidence_url" text;--> statement-breakpoint
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;