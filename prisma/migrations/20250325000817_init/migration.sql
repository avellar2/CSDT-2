-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3),
    "visitTime" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "visitResponsible" TEXT NOT NULL,
    "visitResponsibleRole" TEXT NOT NULL,
    "visitObjective" TEXT NOT NULL,
    "technicians" TEXT[],
    "sieducaDetails" TEXT[],
    "sieducaEquipmentDetails" TEXT,
    "secretaryDetails" TEXT[],
    "secretaryEquipmentDetails" TEXT,
    "otherLocationsDetails" TEXT[],
    "otherLocationsEquipmentDetails" TEXT,
    "internetDetails" TEXT[],
    "rackDetails" TEXT[],
    "rackEquipmentDetails" TEXT,
    "printerDetails" TEXT[],
    "printerEquipmentDetails" TEXT,
    "visitDescription" TEXT NOT NULL,
    "repairDescription" TEXT NOT NULL,
    "problemSolved" TEXT NOT NULL,
    "reasonNotSolved" TEXT,
    "nextTechnicianInstructions" TEXT,
    "beforePhotos" TEXT[],
    "afterPhotos" TEXT[],
    "completionDate" TIMESTAMP(3) NOT NULL,
    "completionTime" TEXT NOT NULL,
    "completionResponsible" TEXT NOT NULL,
    "signedPhoto" TEXT[],

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "inep" INTEGER NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "director" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OsAssinada" (
    "id" SERIAL NOT NULL,
    "unidadeEscolar" TEXT NOT NULL,
    "tecnicoResponsavel" TEXT NOT NULL,
    "numeroOs" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "notebooksOutroLocal" TEXT NOT NULL,
    "tabletsOutroLocal" TEXT NOT NULL,
    "solicitacaoDaVisita" TEXT NOT NULL,
    "relatorio" TEXT NOT NULL,
    "pcsSieduca" TEXT NOT NULL,
    "notebooksSieduca" TEXT NOT NULL,
    "tabletsSieduca" TEXT NOT NULL,
    "estabilizadoresSieduca" TEXT NOT NULL,
    "naoHaSieduca" TEXT NOT NULL,
    "dellSecretaria" TEXT NOT NULL,
    "locadosSecretaria" TEXT NOT NULL,
    "outrosSecretaria" TEXT NOT NULL,
    "notebooksSecretaria" TEXT NOT NULL,
    "tabletsSecretaria" TEXT NOT NULL,
    "estabilizadoresSecretaria" TEXT NOT NULL,
    "dellOutroLocal" TEXT NOT NULL,
    "locadosOutroLocal" TEXT NOT NULL,
    "outrosOutroLocal" TEXT NOT NULL,
    "estabilizadoresOutroLocal" TEXT NOT NULL,
    "naoHaOutroLocal" TEXT NOT NULL,
    "redeBr" TEXT NOT NULL,
    "internetNasEscolas" TEXT NOT NULL,
    "educacaoConectada" TEXT NOT NULL,
    "naoHaProvedor" TEXT NOT NULL,
    "rack" TEXT NOT NULL,
    "switch" TEXT NOT NULL,
    "roteador" TEXT NOT NULL,
    "oki" TEXT NOT NULL,
    "kyocera" TEXT NOT NULL,
    "outrasImpressoras" TEXT NOT NULL,
    "solucionado" TEXT NOT NULL,
    "emailResponsavel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fotoAntes" TEXT,
    "fotoDepois" TEXT,
    "nameAssigned" TEXT NOT NULL,
    "cpfOrRegistration" TEXT NOT NULL,
    "fotosAntes" TEXT[],
    "fotosDepois" TEXT[],

    CONSTRAINT "OsAssinada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Os" (
    "id" SERIAL NOT NULL,
    "unidadeEscolar" TEXT NOT NULL,
    "tecnicoResponsavel" TEXT NOT NULL,
    "numeroOs" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "notebooksOutroLocal" TEXT NOT NULL,
    "tabletsOutroLocal" TEXT NOT NULL,
    "solicitacaoDaVisita" TEXT NOT NULL,
    "relatorio" TEXT NOT NULL,
    "pcsSieduca" TEXT NOT NULL,
    "notebooksSieduca" TEXT NOT NULL,
    "tabletsSieduca" TEXT NOT NULL,
    "estabilizadoresSieduca" TEXT NOT NULL,
    "naoHaSieduca" TEXT NOT NULL,
    "dellSecretaria" TEXT NOT NULL,
    "locadosSecretaria" TEXT NOT NULL,
    "outrosSecretaria" TEXT NOT NULL,
    "notebooksSecretaria" TEXT NOT NULL,
    "tabletsSecretaria" TEXT NOT NULL,
    "estabilizadoresSecretaria" TEXT NOT NULL,
    "dellOutroLocal" TEXT NOT NULL,
    "locadosOutroLocal" TEXT NOT NULL,
    "outrosOutroLocal" TEXT NOT NULL,
    "estabilizadoresOutroLocal" TEXT NOT NULL,
    "naoHaOutroLocal" TEXT NOT NULL,
    "redeBr" TEXT NOT NULL,
    "internetNasEscolas" TEXT NOT NULL,
    "educacaoConectada" TEXT NOT NULL,
    "naoHaProvedor" TEXT NOT NULL,
    "rack" TEXT NOT NULL,
    "switch" TEXT NOT NULL,
    "roteador" TEXT NOT NULL,
    "oki" TEXT NOT NULL,
    "kyocera" TEXT NOT NULL,
    "outrasImpressoras" TEXT NOT NULL,
    "solucionado" TEXT NOT NULL,
    "emailResponsavel" TEXT NOT NULL,
    "fotosAntes" TEXT[],
    "fotosDepois" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Os_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "photoUrl" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_serialNumber_key" ON "Item"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Os_numeroOs_key" ON "Os"("numeroOs");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
