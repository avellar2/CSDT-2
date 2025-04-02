export interface ServiceOrderFormData {
  [key: string]: any; // Adicione esta linha para permitir índices de string
  orderNumber: string;
  visitDate: string;
  visitTime: string;
  technicians: string[];
  school: string;
  visitLocation: string;
  schoolOpen: string;
  reasonClosed: string;
  visitResponsible: string;
  visitResponsibleRole: string;
  visitObjective: string;
  sieducaDetails: string[];
  sieducaEquipmentDetails: string;
  secretaryDetails: string[];
  secretaryEquipmentDetails: string;
  otherLocationsDetails: string[];
  otherLocationsEquipmentDetails: string;
  internetDetails: string[];
  rackDetails: string[];
  rackEquipmentDetails: string;
  printerDetails: string[];
  printerEquipmentDetails: string;
  visitDescription: string;
  repairDescription: string;
  problemSolved: string;
  reasonNotSolved: string;
  nextTechnicianInstructions: string;
  beforePhotos: File[];
  afterPhotos: File[];
  completionDate: string;
  completionTime: string;
  completionResponsible: string;
  signedPhoto: File[];
}