-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TECH', 'ONLYREAD');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'TECH';
