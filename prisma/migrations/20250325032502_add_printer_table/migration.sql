-- CreateTable
CREATE TABLE "Printer" (
    "id" SERIAL NOT NULL,
    "sigla" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "ip" TEXT NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Printer_serial_key" ON "Printer"("serial");
