-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('remote', 'hybrid', 'onsite');

-- CreateEnum
CREATE TYPE "SearchScope" AS ENUM ('global_remote', 'local_only');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('full_time', 'part_time', 'contract', 'internship');

-- CreateEnum
CREATE TYPE "CrawlCadence" AS ENUM ('hourly', 'daily', 'weekly');

-- CreateEnum
CREATE TYPE "ApplicationDraftStatus" AS ENUM ('reviewed', 'submitted', 'skipped');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "resume_blob_url" TEXT,
    "resume_text" TEXT,
    "parsed_skills" JSONB NOT NULL DEFAULT '[]',
    "parsed_work_history" JSONB NOT NULL DEFAULT '[]',
    "parsed_education" JSONB NOT NULL DEFAULT '[]',
    "parsed_certifications" JSONB NOT NULL DEFAULT '[]',
    "years_of_experience" DOUBLE PRECISION,
    "autofill_aliases" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_criteria" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "work_mode" "WorkMode"[],
    "scope" "SearchScope" NOT NULL,
    "locations" TEXT[],
    "employment_type" "EmploymentType"[],
    "min_annual_salary" DOUBLE PRECISION,
    "min_hourly_rate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exclusions" JSONB NOT NULL DEFAULT '{"keywords":[],"companies":[]}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_board_sources" (
    "id" TEXT NOT NULL,
    "criteria_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "query_template" TEXT NOT NULL,
    "cadence" "CrawlCadence" NOT NULL DEFAULT 'daily',
    "last_fetched_at" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "job_board_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs_seen" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_seen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "criteria_id" TEXT NOT NULL,
    "vetting_snapshot" JSONB NOT NULL,
    "autofill_field_map" JSONB NOT NULL DEFAULT '{}',
    "user_edits" JSONB NOT NULL DEFAULT '{}',
    "status" "ApplicationDraftStatus" NOT NULL DEFAULT 'reviewed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_access_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "personal_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_seen_user_id_url_key" ON "jobs_seen"("user_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "personal_access_tokens_token_hash_key" ON "personal_access_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_criteria" ADD CONSTRAINT "search_criteria_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_board_sources" ADD CONSTRAINT "job_board_sources_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "search_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_seen" ADD CONSTRAINT "jobs_seen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_seen" ADD CONSTRAINT "jobs_seen_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "job_board_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs_seen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "search_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
