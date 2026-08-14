-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "application_drafts" DROP CONSTRAINT "application_drafts_criteria_id_fkey";

-- DropIndex
DROP INDEX "application_drafts_job_id_criteria_id_key";

-- DropTable
DROP TABLE "profiles";

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_profiles" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "job_title" TEXT,
    "bio" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "experiences" JSONB NOT NULL DEFAULT '[]',
    "education" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "years_of_experience" DOUBLE PRECISION,
    "resume_blob_url" TEXT,
    "resume_text" TEXT,
    "autofill_aliases" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_profiles_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "application_drafts" ADD COLUMN "job_profile_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "people_user_id_key" ON "people"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_drafts_job_id_criteria_id_job_profile_id_key" ON "application_drafts"("job_id", "criteria_id", "job_profile_id");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_profiles" ADD CONSTRAINT "job_profiles_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "search_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_job_profile_id_fkey" FOREIGN KEY ("job_profile_id") REFERENCES "job_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
