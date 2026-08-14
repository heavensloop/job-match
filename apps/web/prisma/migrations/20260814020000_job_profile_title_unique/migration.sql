-- Backfill guard: dev-only data, but keep the NOT NULL below safe either way.
UPDATE "job_profiles" SET "job_title" = 'Untitled' WHERE "job_title" IS NULL;

-- AlterTable
ALTER TABLE "job_profiles" DROP COLUMN "label",
ALTER COLUMN "job_title" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "job_profiles_person_id_job_title_key" ON "job_profiles"("person_id", "job_title");
