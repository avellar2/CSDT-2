/*
  Warnings:

  - Made the column `email` on table `InternalOS` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "InternalOS" ALTER COLUMN "email" SET NOT NULL;
