CREATE SCHEMA IF NOT EXISTS "ai_chatbot_v6_bi";
--> statement-breakpoint
CREATE TABLE "ai_chatbot_v6_bi"."bi_Chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp NOT NULL,
	"title" text NOT NULL,
	"userId" text NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"lastContext" jsonb
);
--> statement-breakpoint
CREATE TABLE "ai_chatbot_v6_bi"."bi_Message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chatbot_v6_bi"."bi_User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(64) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_chatbot_v6_bi"."bi_Message" ADD CONSTRAINT "bi_Message_chatId_bi_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "ai_chatbot_v6_bi"."bi_Chat"("id") ON DELETE no action ON UPDATE no action;
