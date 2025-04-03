-- CreateTable
CREATE TABLE "BaseTechnician" (
    "id" SERIAL NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaseTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitTechnician" (
    "id" SERIAL NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffTechnician" (
    "id" SERIAL NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolDemand" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "demand" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolDemand_pkey" PRIMARY KEY ("id")
);
